import { ByteReader, utf8Bytes } from './bytes';
import { TiffParseError, cleanTiff } from './tiff';
import { EMPTY_XMP_PACKET, XmpParseError, cleanXmpBytes, padXmpTo } from './xmp';

import type { MetadataCategory } from '@/types/metadata';

/**
 * HEIC / HEIF metadata rewriter (ISO Base Media File Format).
 *
 * Metadata items ('Exif' and XMP 'mime' items) are located through the meta
 * box (iinf + iloc) and rewritten IN PLACE: the cleaned payload is written
 * over the old one and the remainder is padded (zeros for TIFF, spaces for
 * XMP). The file keeps its exact size, so no box sizes or item offsets change
 * and the HEVC image data, irot/ispe/colr/pixi properties and every other
 * byte stay untouched. The file remains HEIC.
 */

export class HeifFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HeifFormatError';
  }
}

export class HeifMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HeifMetadataError';
  }
}

/** Big-endian TIFF header followed by an IFD0 with zero entries. */
const EMPTY_TIFF = Uint8Array.of(
  0x4d,
  0x4d,
  0x00,
  0x2a,
  0x00,
  0x00,
  0x00,
  0x08,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
);

const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
  'heif',
  'avif',
  'avis',
]);

export function isHeif(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const reader = new ByteReader(bytes);
  if (reader.ascii(4, 4) !== 'ftyp') return false;
  const size = reader.u32(0);
  const end = Math.min(size, bytes.length);
  for (let cursor = 8; cursor + 4 <= end; cursor += 4) {
    if (cursor === 12) continue; // minor version
    if (HEIF_BRANDS.has(reader.ascii(cursor, 4))) return true;
  }
  return false;
}

export interface Box {
  type: string;
  start: number; // offset of the box header
  headerSize: number;
  size: number; // total box size incl. header
}

export function readBoxes(reader: ByteReader, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let cursor = start;
  while (cursor + 8 <= end) {
    let size = reader.u32(cursor);
    const type = reader.ascii(cursor + 4, 4);
    let headerSize = 8;
    if (size === 1) {
      size = reader.u64(cursor + 8);
      headerSize = 16;
    } else if (size === 0) {
      size = end - cursor;
    }
    if (size < headerSize || cursor + size > end) throw new HeifFormatError(`bad box size for ${type}`);
    boxes.push({ type, start: cursor, headerSize, size });
    cursor += size;
  }
  return boxes;
}

interface ItemInfo {
  id: number;
  type: string;
  contentType?: string;
}

interface ItemExtent {
  offset: number;
  length: number;
}

interface ItemLocation {
  id: number;
  constructionMethod: number;
  extents: ItemExtent[];
}

function parseIinf(reader: ByteReader, box: Box): ItemInfo[] {
  const version = reader.u8(box.start + box.headerSize);
  let cursor = box.start + box.headerSize + 4;
  const count = version === 0 ? reader.u16(cursor) : reader.u32(cursor);
  cursor += version === 0 ? 2 : 4;
  const items: ItemInfo[] = [];
  const end = box.start + box.size;
  for (let i = 0; i < count && cursor + 8 <= end; i += 1) {
    const infe = readBoxes(reader, cursor, end)[0];
    if (!infe || infe.type !== 'infe') break;
    const infeVersion = reader.u8(infe.start + infe.headerSize);
    let p = infe.start + infe.headerSize + 4;
    if (infeVersion >= 2) {
      const id = infeVersion === 2 ? reader.u16(p) : reader.u32(p);
      p += infeVersion === 2 ? 2 : 4;
      p += 2; // item_protection_index
      const type = reader.ascii(p, 4);
      p += 4;
      const name = reader.cstring(p);
      p = name.next;
      let contentType: string | undefined;
      if (type === 'mime') contentType = reader.cstring(p).value;
      items.push({ id, type, contentType });
    }
    cursor = infe.start + infe.size;
  }
  return items;
}

function parseIloc(reader: ByteReader, box: Box): ItemLocation[] {
  const version = reader.u8(box.start + box.headerSize);
  let cursor = box.start + box.headerSize + 4;
  const sizes = reader.u8(cursor);
  const offsetSize = sizes >> 4;
  const lengthSize = sizes & 0x0f;
  const sizes2 = reader.u8(cursor + 1);
  const baseOffsetSize = sizes2 >> 4;
  const indexSize = version === 1 || version === 2 ? sizes2 & 0x0f : 0;
  cursor += 2;
  const count = version < 2 ? reader.u16(cursor) : reader.u32(cursor);
  cursor += version < 2 ? 2 : 4;

  const readSized = (size: number): number => {
    let value: number;
    if (size === 0) value = 0;
    else if (size === 4) value = reader.u32(cursor);
    else if (size === 8) value = reader.u64(cursor);
    else throw new HeifFormatError('unsupported iloc field size');
    cursor += size;
    return value;
  };

  const locations: ItemLocation[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = version < 2 ? reader.u16(cursor) : reader.u32(cursor);
    cursor += version < 2 ? 2 : 4;
    let constructionMethod = 0;
    if (version === 1 || version === 2) {
      constructionMethod = reader.u16(cursor) & 0x0f;
      cursor += 2;
    }
    cursor += 2; // data_reference_index
    const baseOffset = readSized(baseOffsetSize);
    const extentCount = reader.u16(cursor);
    cursor += 2;
    const extents: ItemExtent[] = [];
    for (let e = 0; e < extentCount; e += 1) {
      if (indexSize > 0) readSized(indexSize);
      const extentOffset = readSized(offsetSize);
      const extentLength = readSized(lengthSize);
      extents.push({ offset: baseOffset + extentOffset, length: extentLength });
    }
    locations.push({ id, constructionMethod, extents });
  }
  return locations;
}

interface MetadataItem {
  info: ItemInfo;
  /** Absolute byte ranges in the file. */
  ranges: ItemExtent[];
}

function locateMetadataItems(bytes: Uint8Array): MetadataItem[] {
  const reader = new ByteReader(bytes);
  const top = readBoxes(reader, 0, bytes.length);
  const meta = top.find((b) => b.type === 'meta');
  if (!meta) throw new HeifFormatError('no meta box');
  const children = readBoxes(reader, meta.start + meta.headerSize + 4, meta.start + meta.size);
  const iinf = children.find((b) => b.type === 'iinf');
  const iloc = children.find((b) => b.type === 'iloc');
  const idat = children.find((b) => b.type === 'idat');
  if (!iinf || !iloc) return [];

  const infos = parseIinf(reader, iinf);
  const locations = parseIloc(reader, iloc);
  const items: MetadataItem[] = [];
  for (const info of infos) {
    const isExif = info.type === 'Exif';
    const isXmp = info.type === 'mime' && (info.contentType ?? '').toLowerCase().includes('rdf+xml');
    if (!isExif && !isXmp) continue;
    const location = locations.find((l) => l.id === info.id);
    if (!location) continue;
    const ranges = location.extents.map((extent) => {
      if (location.constructionMethod === 1) {
        if (!idat) throw new HeifFormatError('idat construction without idat box');
        return { offset: idat.start + idat.headerSize + extent.offset, length: extent.length };
      }
      if (location.constructionMethod !== 0) throw new HeifFormatError('unsupported construction method');
      return extent;
    });
    for (const range of ranges) {
      if (range.offset + range.length > bytes.length) throw new HeifFormatError('item extent overruns file');
    }
    items.push({ info, ranges });
  }
  return items;
}

function readRanges(bytes: Uint8Array, ranges: ItemExtent[]): Uint8Array {
  const total = ranges.reduce((sum, r) => sum + r.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const r of ranges) {
    out.set(bytes.subarray(r.offset, r.offset + r.length), cursor);
    cursor += r.length;
  }
  return out;
}

function writeRanges(target: Uint8Array, ranges: ItemExtent[], data: Uint8Array): void {
  let cursor = 0;
  for (const r of ranges) {
    target.set(data.subarray(cursor, cursor + r.length), r.offset);
    cursor += r.length;
  }
}

export function cleanHeif(
  bytes: Uint8Array,
  remove: ReadonlySet<MetadataCategory>,
): { bytes: Uint8Array; removed: number } {
  if (!isHeif(bytes)) throw new HeifFormatError('not a HEIF file');
  const items = locateMetadataItems(bytes);
  const removeAll = remove.has('other') && remove.has('location') && remove.has('device');
  const out = bytes.slice();
  let removed = 0;

  for (const item of items) {
    const payload = readRanges(bytes, item.ranges);
    if (item.info.type === 'Exif') {
      // Exif item: u32 offset to the TIFF header, then (usually) the TIFF.
      if (payload.length < 4) continue;
      const tiffOffset = 4 + new ByteReader(payload).u32(0);
      if (tiffOffset >= payload.length) throw new HeifMetadataError('bad Exif item header');
      const tiff = payload.subarray(tiffOffset);
      let cleaned: Uint8Array;
      try {
        const result = cleanTiff(tiff, remove);
        removed += result.removed;
        cleaned = result.bytes;
      } catch (error) {
        if (!(error instanceof TiffParseError) || !removeAll)
          throw new HeifMetadataError('Exif item could not be parsed');
        // Unparseable EXIF in "all" mode: replace it with an empty, valid TIFF.
        cleaned = EMPTY_TIFF;
        removed += 1;
      }
      if (cleaned.length > tiff.length) throw new HeifMetadataError('cleaned Exif does not fit in place');
      const replacement = new Uint8Array(payload.length);
      replacement.set(payload.subarray(0, tiffOffset));
      replacement.set(cleaned, tiffOffset);
      writeRanges(out, item.ranges, replacement);
    } else {
      let cleaned: Uint8Array;
      if (removeAll) {
        cleaned = utf8Bytes(EMPTY_XMP_PACKET);
        removed += 1;
      } else {
        try {
          const result = cleanXmpBytes(payload, remove);
          removed += result.removed;
          cleaned = result.bytes;
        } catch (error) {
          if (!(error instanceof XmpParseError)) throw error;
          throw new HeifMetadataError('XMP item could not be parsed');
        }
      }
      const padded = padXmpTo(cleaned, payload.length);
      if (!padded) throw new HeifMetadataError('cleaned XMP does not fit in place');
      writeRanges(out, item.ranges, padded);
    }
  }

  return { bytes: out, removed };
}

/** Exposed for tests: item types found in the file's meta box. */
export function heifMetadataItemTypes(bytes: Uint8Array): string[] {
  return locateMetadataItems(bytes).map((item) =>
    item.info.type === 'Exif' ? 'Exif' : `mime:${item.info.contentType ?? ''}`,
  );
}
