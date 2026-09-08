import { ByteReader } from './bytes';
import { readBoxes, type Box } from './heif';
import { detectFormat } from './index';
import { parseTiff } from './tiff';

import type { ImageFileInfo, OutputFormat } from '@/types/metadata';

/**
 * Reads container-level facts about an image without decoding pixels:
 * format, stored pixel dimensions, the display orientation, and byte length.
 * Used for the Done-screen diagnostics so the user can compare the working
 * copy with the clean copy exactly as the pipeline saw them.
 */

const TAG_ORIENTATION = 0x0112;

export function readImageInfo(bytes: Uint8Array): ImageFileInfo {
  const detected = detectFormat(bytes);
  const format: OutputFormat = detected === 'unknown' ? 'other' : detected;
  let dims: Dimensions | null = null;
  try {
    if (detected === 'jpeg') dims = jpegDimensions(bytes);
    else if (detected === 'png') dims = pngDimensions(bytes);
    else if (detected === 'heic') dims = heifDimensions(bytes);
  } catch {
    dims = null;
  }
  const rotated = dims ? isRotated(dims.orientation, dims.rotation) : false;
  return {
    format,
    byteLength: bytes.length,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    displayWidth: dims ? (rotated ? dims.height : dims.width) : null,
    displayHeight: dims ? (rotated ? dims.width : dims.height) : null,
    orientation: dims?.orientation ?? null,
  };
}

interface Dimensions {
  width: number;
  height: number;
  /** EXIF orientation 1–8 when present. */
  orientation: number | null;
  /** HEIF irot angle in degrees (0, 90, 180, 270) when present. */
  rotation: number | null;
}

function isRotated(orientation: number | null, rotation: number | null): boolean {
  if (rotation === 90 || rotation === 270) return true;
  return orientation !== null && orientation >= 5 && orientation <= 8;
}

/** JPEG: width/height from the first SOFn marker; orientation from the EXIF APP1 segment. */
function jpegDimensions(bytes: Uint8Array): Dimensions | null {
  const r = new ByteReader(bytes);
  let cursor = 2;
  let size: { width: number; height: number } | null = null;
  let orientation: number | null = null;
  while (cursor + 4 <= bytes.length) {
    if (r.u8(cursor) !== 0xff) break;
    const marker = r.u8(cursor + 1);
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      cursor += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break; // scan data / end: nothing more to learn
    const length = r.u16(cursor + 2);
    const payloadStart = cursor + 4;
    const payloadEnd = cursor + 2 + length;
    if (payloadEnd > bytes.length) break;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof && !size) {
      size = { height: r.u16(payloadStart + 1), width: r.u16(payloadStart + 3) };
    }
    if (marker === 0xe1 && orientation === null && r.ascii(payloadStart, 6) === 'Exif\0\0') {
      orientation = exifOrientation(bytes.subarray(payloadStart + 6, payloadEnd));
    }
    cursor = payloadEnd;
  }
  return size ? { ...size, orientation, rotation: null } : null;
}

function exifOrientation(tiff: Uint8Array): number | null {
  try {
    const parsed = parseTiff(tiff);
    const entry = parsed.ifd0.find((e) => e.tag === TAG_ORIENTATION);
    if (!entry || entry.type !== 3 || entry.count < 1) return null;
    const value = new ByteReader(entry.value, parsed.littleEndian).u16(0);
    return value >= 1 && value <= 8 ? value : null;
  } catch {
    return null;
  }
}

/** PNG: IHDR is always the first chunk. */
function pngDimensions(bytes: Uint8Array): Dimensions | null {
  const r = new ByteReader(bytes);
  if (r.ascii(12, 4) !== 'IHDR') return null;
  return { width: r.u32(16), height: r.u32(20), orientation: null, rotation: null };
}

/**
 * HEIF: the primary item's `ispe` (and `irot`) property, resolved through
 * meta → pitm, iprp → ipco (property list) and ipma (item ↔ property indices).
 */
function heifDimensions(bytes: Uint8Array): Dimensions | null {
  const r = new ByteReader(bytes);
  const meta = readBoxes(r, 0, bytes.length).find((b) => b.type === 'meta');
  if (!meta) return null;
  const children = readBoxes(r, meta.start + meta.headerSize + 4, meta.start + meta.size);
  const pitm = children.find((b) => b.type === 'pitm');
  const iprp = children.find((b) => b.type === 'iprp');
  if (!pitm || !iprp) return null;

  const pitmVersion = r.u8(pitm.start + pitm.headerSize);
  const primaryId =
    pitmVersion === 0 ? r.u16(pitm.start + pitm.headerSize + 4) : r.u32(pitm.start + pitm.headerSize + 4);

  const iprpChildren = readBoxes(r, iprp.start + iprp.headerSize, iprp.start + iprp.size);
  const ipco = iprpChildren.find((b) => b.type === 'ipco');
  const ipma = iprpChildren.find((b) => b.type === 'ipma');
  if (!ipco || !ipma) return null;
  const properties: Box[] = readBoxes(r, ipco.start + ipco.headerSize, ipco.start + ipco.size);

  const indices = propertyIndicesFor(r, ipma, primaryId);
  let size: { width: number; height: number } | null = null;
  let rotation: number | null = null;
  for (const index of indices) {
    const property = properties[index - 1]; // 1-based
    if (!property) continue;
    const body = property.start + property.headerSize;
    if (property.type === 'ispe') {
      size = { width: r.u32(body + 4), height: r.u32(body + 8) }; // after FullBox version/flags
    } else if (property.type === 'irot') {
      rotation = (r.u8(body) & 0x03) * 90;
    }
  }
  return size ? { ...size, orientation: null, rotation } : null;
}

function propertyIndicesFor(r: ByteReader, ipma: Box, itemId: number): number[] {
  const version = r.u8(ipma.start + ipma.headerSize);
  const flags = r.u32(ipma.start + ipma.headerSize) & 0x00ffffff;
  let cursor = ipma.start + ipma.headerSize + 4;
  const entryCount = r.u32(cursor);
  cursor += 4;
  const wideIndex = (flags & 1) === 1;
  for (let i = 0; i < entryCount; i += 1) {
    const id = version < 1 ? r.u16(cursor) : r.u32(cursor);
    cursor += version < 1 ? 2 : 4;
    const count = r.u8(cursor);
    cursor += 1;
    const indices: number[] = [];
    for (let j = 0; j < count; j += 1) {
      if (wideIndex) {
        indices.push(r.u16(cursor) & 0x7fff);
        cursor += 2;
      } else {
        indices.push(r.u8(cursor) & 0x7f);
        cursor += 1;
      }
    }
    if (id === itemId) return indices;
  }
  return [];
}
