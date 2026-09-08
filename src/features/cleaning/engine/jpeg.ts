import { ByteReader, ByteWriter, asciiBytes, concat, startsWith } from './bytes';
import { PHOTOSHOP_HEADER, cleanPhotoshopIrb } from './iptc';
import { TiffParseError, cleanTiff } from './tiff';
import { XmpParseError, cleanXmpBytes } from './xmp';

import type { MetadataCategory } from '@/types/metadata';

/**
 * JPEG metadata rewriter. Works on marker segments only: everything from the
 * Start Of Scan marker onwards (the entropy-coded pixels, plus any trailing
 * Multi-Picture images) is copied byte-for-byte. Nothing is decoded or
 * re-encoded, so pixels, dimensions and quality are untouched.
 *
 * Kept in every mode: JFIF (APP0), ICC profile (APP2 ICC_PROFILE), MPF index
 * (APP2 MPF, whose offsets point forward into the unchanged tail), Adobe
 * (APP14), and all frame/huffman/quantization tables.
 */

export class JpegFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JpegFormatError';
  }
}

export class JpegMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JpegMetadataError';
  }
}

const SOI = 0xd8;
const SOS = 0xda;
const EOI = 0xd9;
const COM = 0xfe;
const APP0 = 0xe0;
const APP1 = 0xe1;
const APP2 = 0xe2;
const APP13 = 0xed;
const APP14 = 0xee;

const EXIF_HEADER = asciiBytes('Exif\0\0');
const XMP_HEADER = asciiBytes('http://ns.adobe.com/xap/1.0/\0');
const XMP_EXT_HEADER = asciiBytes('http://ns.adobe.com/xmp/extension/\0');
const ICC_HEADER = asciiBytes('ICC_PROFILE\0');
const MPF_HEADER = asciiBytes('MPF\0');
const JFIF_HEADER = asciiBytes('JFIF\0');
const JFXX_HEADER = asciiBytes('JFXX\0');
const ADOBE_HEADER = asciiBytes('Adobe');
const PHOTOSHOP_HEADER_BYTES = asciiBytes(PHOTOSHOP_HEADER);

const MAX_SEGMENT_PAYLOAD = 0xffff - 2;

interface Segment {
  marker: number;
  /** Payload without the 2-byte length field. */
  payload: Uint8Array;
}

type SegmentKind = 'exif' | 'xmp' | 'xmpExtended' | 'iptc' | 'icc' | 'mpf' | 'structural' | 'otherMetadata';

function classify(segment: Segment): SegmentKind {
  const { marker, payload } = segment;
  if (marker === APP1) {
    if (startsWith(payload, EXIF_HEADER)) return 'exif';
    if (startsWith(payload, XMP_HEADER)) return 'xmp';
    if (startsWith(payload, XMP_EXT_HEADER)) return 'xmpExtended';
    return 'otherMetadata';
  }
  if (marker === APP2) {
    if (startsWith(payload, ICC_HEADER)) return 'icc';
    if (startsWith(payload, MPF_HEADER)) return 'mpf';
    return 'otherMetadata';
  }
  if (marker === APP13) return startsWith(payload, PHOTOSHOP_HEADER_BYTES) ? 'iptc' : 'otherMetadata';
  if (marker === APP0)
    return startsWith(payload, JFIF_HEADER) || startsWith(payload, JFXX_HEADER)
      ? 'structural'
      : 'otherMetadata';
  if (marker === APP14) return startsWith(payload, ADOBE_HEADER) ? 'structural' : 'otherMetadata';
  if (marker === COM) return 'otherMetadata';
  if (marker >= 0xe0 && marker <= 0xef) return 'otherMetadata';
  return 'structural';
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === SOI;
}

interface ParsedJpeg {
  segments: Segment[];
  /** From the SOS marker to the end of file, verbatim. */
  tail: Uint8Array;
}

function parseJpeg(bytes: Uint8Array): ParsedJpeg {
  if (!isJpeg(bytes)) throw new JpegFormatError('not a JPEG');
  const reader = new ByteReader(bytes);
  const segments: Segment[] = [];
  let cursor = 2;
  for (;;) {
    if (cursor + 4 > bytes.length) throw new JpegFormatError('unexpected end of file');
    if (reader.u8(cursor) !== 0xff) throw new JpegFormatError('marker expected');
    let marker = reader.u8(cursor + 1);
    while (marker === 0xff) {
      cursor += 1;
      marker = reader.u8(cursor + 1);
    }
    if (marker === SOS) {
      return { segments, tail: bytes.subarray(cursor) };
    }
    if (marker === EOI) throw new JpegFormatError('no image data');
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      cursor += 2; // standalone marker
      continue;
    }
    const length = reader.u16(cursor + 2);
    if (length < 2 || cursor + 2 + length > bytes.length) throw new JpegFormatError('bad segment length');
    segments.push({ marker, payload: bytes.subarray(cursor + 4, cursor + 2 + length) });
    cursor += 2 + length;
  }
}

function writeSegment(marker: number, payload: Uint8Array): Uint8Array {
  if (payload.length > MAX_SEGMENT_PAYLOAD) throw new JpegMetadataError('segment too large');
  const w = new ByteWriter();
  w.u8(0xff)
    .u8(marker)
    .u16(payload.length + 2)
    .bytes(payload);
  return w.toUint8Array();
}

export interface JpegCleanResult {
  bytes: Uint8Array;
  removed: number;
}

/**
 * Removes metadata of the given categories. `removeAll` (the "all" mode) drops
 * every metadata segment except a minimal structural EXIF (orientation,
 * resolution, color space, pixel dimensions) plus ICC and MPF.
 */
export function cleanJpeg(bytes: Uint8Array, remove: ReadonlySet<MetadataCategory>): JpegCleanResult {
  const { segments, tail } = parseJpeg(bytes);
  const removeAll = remove.has('other') && remove.has('location') && remove.has('device');
  const parts: Uint8Array[] = [Uint8Array.of(0xff, SOI)];
  let removed = 0;
  let exifSeen = false;

  for (const segment of segments) {
    const kind = classify(segment);
    switch (kind) {
      case 'structural':
      case 'icc':
      case 'mpf':
        parts.push(writeSegment(segment.marker, segment.payload));
        break;

      case 'exif': {
        if (exifSeen) {
          // Duplicate EXIF blocks are never needed; keep the first, drop the rest.
          removed += 1;
          break;
        }
        exifSeen = true;
        const tiff = segment.payload.subarray(EXIF_HEADER.length);
        try {
          const cleaned = cleanTiff(tiff, remove);
          removed += cleaned.removed;
          parts.push(writeSegment(APP1, concat([EXIF_HEADER, cleaned.bytes])));
        } catch (error) {
          if (!(error instanceof TiffParseError) || !removeAll) {
            throw new JpegMetadataError('EXIF block could not be parsed');
          }
          // Malformed EXIF in "all" mode: dropping it is the safe choice.
          removed += 1;
        }
        break;
      }

      case 'xmp': {
        if (removeAll) {
          removed += 1;
          break;
        }
        const xml = segment.payload.subarray(XMP_HEADER.length);
        try {
          const cleaned = cleanXmpBytes(xml, remove);
          removed += cleaned.removed;
          parts.push(writeSegment(APP1, concat([XMP_HEADER, cleaned.bytes])));
        } catch (error) {
          if (!(error instanceof XmpParseError)) throw error;
          throw new JpegMetadataError('XMP block could not be parsed');
        }
        break;
      }

      case 'xmpExtended':
        // Extended XMP holds bulky auxiliary data (depth, gain maps). It is
        // referenced from the main packet by digest, so it is left as-is in
        // selective modes and dropped with everything else in "all".
        if (removeAll) removed += 1;
        else parts.push(writeSegment(segment.marker, segment.payload));
        break;

      case 'iptc': {
        if (removeAll) {
          removed += 1;
          break;
        }
        const irb = segment.payload.subarray(PHOTOSHOP_HEADER_BYTES.length);
        try {
          const cleaned = cleanPhotoshopIrb(irb, remove);
          removed += cleaned.removed;
          if (cleaned.bytes.length > 0) {
            parts.push(writeSegment(APP13, concat([PHOTOSHOP_HEADER_BYTES, cleaned.bytes])));
          }
        } catch {
          throw new JpegMetadataError('IPTC block could not be parsed');
        }
        break;
      }

      case 'otherMetadata':
        if (remove.has('other')) removed += 1;
        else parts.push(writeSegment(segment.marker, segment.payload));
        break;
    }
  }

  parts.push(tail);
  return { bytes: concat(parts), removed };
}

/** Byte range of the scan data, used by tests to prove pixels were untouched. */
export function jpegTail(bytes: Uint8Array): Uint8Array {
  return parseJpeg(bytes).tail;
}
