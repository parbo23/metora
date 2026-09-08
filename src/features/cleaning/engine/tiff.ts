import { ByteReader, ByteWriter, asciiOf, concat } from './bytes';
import {
  EXIF_IFD_TAGS,
  GPS_TAGS,
  IFD0_TAGS,
  INTEROP_TAGS,
  TAG_EXIF_IFD_POINTER,
  TAG_GPS_IFD_POINTER,
  TAG_INTEROP_IFD_POINTER,
  TAG_JPEG_INTERCHANGE_FORMAT,
  TAG_JPEG_INTERCHANGE_FORMAT_LENGTH,
  TAG_STRIP_OFFSETS,
  tagName,
} from './exifTags';

import { categorizeTag } from '@/features/metadata/categorize';
import type { MetadataCategory } from '@/types/metadata';

/**
 * Minimal TIFF/EXIF structure editor. Parses the IFD tree that EXIF uses
 * (IFD0, Exif, GPS, Interoperability, IFD1 thumbnail), lets us drop entries
 * by category, and serializes a fresh, compact, valid TIFF. Values are kept
 * as raw bytes: nothing is re-interpreted, so nothing is lost in translation.
 */

export interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  /** Raw value bytes in the file's byte order, exactly count * typeSize long. */
  value: Uint8Array;
}

export interface ParsedTiff {
  littleEndian: boolean;
  ifd0: IfdEntry[];
  exif: IfdEntry[];
  gps: IfdEntry[];
  interop: IfdEntry[];
  ifd1: IfdEntry[];
  /** Embedded JPEG thumbnail referenced from IFD1, if any. */
  thumbnail: Uint8Array | null;
}

export class TiffParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TiffParseError';
  }
}

const TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
  13: 4, // IFD
};

const MAX_ENTRIES = 1000;

export function parseTiff(bytes: Uint8Array): ParsedTiff {
  if (bytes.length < 8) throw new TiffParseError('too short');
  const order = asciiOf(bytes.subarray(0, 2));
  const littleEndian = order === 'II';
  if (!littleEndian && order !== 'MM') throw new TiffParseError('bad byte order');
  const reader = new ByteReader(bytes, littleEndian);
  if (reader.u16(2) !== 42) throw new TiffParseError('bad magic');
  const ifd0Offset = reader.u32(4);
  if (ifd0Offset < 8 || ifd0Offset >= bytes.length) throw new TiffParseError('bad IFD0 offset');

  const seen = new Set<number>();
  const readIfd = (offset: number): { entries: IfdEntry[]; next: number } => {
    if (offset === 0 || offset + 2 > bytes.length || seen.has(offset)) return { entries: [], next: 0 };
    seen.add(offset);
    const count = reader.u16(offset);
    if (count > MAX_ENTRIES) throw new TiffParseError('IFD too large');
    const entries: IfdEntry[] = [];
    let cursor = offset + 2;
    for (let i = 0; i < count; i += 1, cursor += 12) {
      if (cursor + 12 > bytes.length) break;
      const tag = reader.u16(cursor);
      const type = reader.u16(cursor + 2);
      const entryCount = reader.u32(cursor + 4);
      const size = TYPE_SIZES[type];
      if (!size) continue; // unknown type: cannot be preserved safely, drop it
      const byteLength = size * entryCount;
      if (byteLength > 64 * 1024 * 1024) continue;
      let value: Uint8Array;
      if (byteLength <= 4) {
        value = bytes.slice(cursor + 8, cursor + 8 + byteLength);
      } else {
        const valueOffset = reader.u32(cursor + 8);
        if (valueOffset + byteLength > bytes.length) continue; // dangling pointer: drop
        value = bytes.slice(valueOffset, valueOffset + byteLength);
      }
      entries.push({ tag, type, count: entryCount, value });
    }
    const next = cursor + 4 <= bytes.length ? reader.u32(cursor) : 0;
    return { entries, next: next < bytes.length ? next : 0 };
  };

  const pointerValue = (entries: IfdEntry[], tag: number): number | null => {
    const entry = entries.find((e) => e.tag === tag);
    if (!entry || (entry.type !== 4 && entry.type !== 13) || entry.count !== 1) return null;
    return new ByteReader(entry.value, littleEndian).u32(0);
  };

  const ifd0Result = readIfd(ifd0Offset);
  const exifOffset = pointerValue(ifd0Result.entries, TAG_EXIF_IFD_POINTER);
  const gpsOffset = pointerValue(ifd0Result.entries, TAG_GPS_IFD_POINTER);
  const exifResult = exifOffset ? readIfd(exifOffset) : { entries: [], next: 0 };
  const interopOffset = pointerValue(exifResult.entries, TAG_INTEROP_IFD_POINTER);
  const interopResult = interopOffset ? readIfd(interopOffset) : { entries: [], next: 0 };
  const gpsResult = gpsOffset ? readIfd(gpsOffset) : { entries: [], next: 0 };
  const ifd1Result = readIfd(ifd0Result.next);

  let thumbnail: Uint8Array | null = null;
  let ifd1 = ifd1Result.entries;
  const thumbOffset = pointerValue(ifd1, TAG_JPEG_INTERCHANGE_FORMAT);
  const thumbLength = pointerValue(ifd1, TAG_JPEG_INTERCHANGE_FORMAT_LENGTH);
  if (thumbOffset !== null && thumbLength !== null && thumbOffset + thumbLength <= bytes.length) {
    thumbnail = bytes.slice(thumbOffset, thumbOffset + thumbLength);
  }
  if (ifd1.some((e) => e.tag === TAG_STRIP_OFFSETS)) {
    // Strip-based thumbnails are rare and not worth relocating; drop IFD1 entirely.
    ifd1 = [];
    thumbnail = null;
  }

  const isPointer = (e: IfdEntry) =>
    e.tag === TAG_EXIF_IFD_POINTER || e.tag === TAG_GPS_IFD_POINTER || e.tag === TAG_INTEROP_IFD_POINTER;
  const isThumbRef = (e: IfdEntry) =>
    e.tag === TAG_JPEG_INTERCHANGE_FORMAT || e.tag === TAG_JPEG_INTERCHANGE_FORMAT_LENGTH;

  return {
    littleEndian,
    ifd0: ifd0Result.entries.filter((e) => !isPointer(e)),
    exif: exifResult.entries.filter((e) => !isPointer(e)),
    gps: gpsResult.entries,
    interop: interopResult.entries,
    ifd1: ifd1.filter((e) => !isThumbRef(e)),
    thumbnail,
  };
}

function ifdByteSize(entries: IfdEntry[], extraPointerEntries: number): { size: number; dataSize: number } {
  const total = entries.length + extraPointerEntries;
  let dataSize = 0;
  for (const entry of entries) {
    if (entry.value.length > 4) dataSize += entry.value.length + (entry.value.length % 2);
  }
  return { size: 2 + total * 12 + 4, dataSize };
}

export function serializeTiff(tiff: ParsedTiff): Uint8Array {
  const le = tiff.littleEndian;
  const hasExif = tiff.exif.length > 0 || tiff.interop.length > 0;
  const hasGps = tiff.gps.length > 0;
  const hasInterop = tiff.interop.length > 0;
  const hasIfd1 = tiff.ifd1.length > 0 || tiff.thumbnail !== null;

  // Layout: header, IFD0(+data), Exif(+data), Interop(+data), GPS(+data), IFD1(+data), thumbnail.
  const ifd0Size = ifdByteSize(tiff.ifd0, (hasExif ? 1 : 0) + (hasGps ? 1 : 0));
  const exifSize = ifdByteSize(tiff.exif, hasInterop ? 1 : 0);
  const interopSize = ifdByteSize(tiff.interop, 0);
  const gpsSize = ifdByteSize(tiff.gps, 0);
  const ifd1Size = ifdByteSize(tiff.ifd1, tiff.thumbnail ? 2 : 0);

  const ifd0Offset = 8;
  const exifOffset = ifd0Offset + ifd0Size.size + ifd0Size.dataSize;
  const interopOffset = exifOffset + (hasExif ? exifSize.size + exifSize.dataSize : 0);
  const gpsOffset = interopOffset + (hasInterop ? interopSize.size + interopSize.dataSize : 0);
  const ifd1Offset = gpsOffset + (hasGps ? gpsSize.size + gpsSize.dataSize : 0);
  const thumbnailOffset = ifd1Offset + (hasIfd1 ? ifd1Size.size + ifd1Size.dataSize : 0);

  const longEntry = (tag: number, value: number): IfdEntry => {
    const w = new ByteWriter();
    w.u32(value, le);
    return { tag, type: 4, count: 1, value: w.toUint8Array() };
  };

  const writeIfd = (entries: IfdEntry[], ifdOffset: number, nextIfd: number): Uint8Array => {
    const sorted = [...entries].sort((a, b) => a.tag - b.tag);
    const table = new ByteWriter();
    const data = new ByteWriter();
    const dataStart = ifdOffset + 2 + sorted.length * 12 + 4;
    table.u16(sorted.length, le);
    for (const entry of sorted) {
      table.u16(entry.tag, le);
      table.u16(entry.type, le);
      table.u32(entry.count, le);
      if (entry.value.length <= 4) {
        const inline = new Uint8Array(4);
        inline.set(entry.value);
        table.bytes(inline);
      } else {
        table.u32(dataStart + data.length, le);
        data.bytes(entry.value);
        if (entry.value.length % 2 === 1) data.u8(0);
      }
    }
    table.u32(nextIfd, le);
    return concat([table.toUint8Array(), data.toUint8Array()]);
  };

  const ifd0Entries = [...tiff.ifd0];
  if (hasExif) ifd0Entries.push(longEntry(TAG_EXIF_IFD_POINTER, exifOffset));
  if (hasGps) ifd0Entries.push(longEntry(TAG_GPS_IFD_POINTER, gpsOffset));
  const exifEntries = [...tiff.exif];
  if (hasInterop) exifEntries.push(longEntry(TAG_INTEROP_IFD_POINTER, interopOffset));
  const ifd1Entries = [...tiff.ifd1];
  if (tiff.thumbnail) {
    ifd1Entries.push(longEntry(TAG_JPEG_INTERCHANGE_FORMAT, thumbnailOffset));
    ifd1Entries.push(longEntry(TAG_JPEG_INTERCHANGE_FORMAT_LENGTH, tiff.thumbnail.length));
  }

  const header = new ByteWriter();
  header.ascii(le ? 'II' : 'MM');
  header.u16(42, le);
  header.u32(ifd0Offset, le);

  const parts: Uint8Array[] = [
    header.toUint8Array(),
    writeIfd(ifd0Entries, ifd0Offset, hasIfd1 ? ifd1Offset : 0),
  ];
  if (hasExif) parts.push(writeIfd(exifEntries, exifOffset, 0));
  if (hasInterop) parts.push(writeIfd(tiff.interop, interopOffset, 0));
  if (hasGps) parts.push(writeIfd(tiff.gps, gpsOffset, 0));
  if (hasIfd1) parts.push(writeIfd(ifd1Entries, ifd1Offset, 0));
  if (tiff.thumbnail) parts.push(tiff.thumbnail);
  return concat(parts);
}

export interface TiffFilterResult {
  tiff: ParsedTiff;
  removed: number;
}

/**
 * Drops every entry whose category is in `remove`. Structural entries
 * (category null: Orientation, resolution, ExifVersion, ColorSpace, …) are
 * always kept so the image renders exactly as before.
 */
export function filterTiff(tiff: ParsedTiff, remove: ReadonlySet<MetadataCategory>): TiffFilterResult {
  let removed = 0;
  const keep = (table: Record<number, string>) => (entry: IfdEntry) => {
    const category = categorizeTag('exif', tagName(table, entry.tag));
    if (category !== null && remove.has(category)) {
      removed += 1;
      return false;
    }
    return true;
  };

  const ifd0 = tiff.ifd0.filter(keep(IFD0_TAGS));
  const exif = tiff.exif.filter(keep(EXIF_IFD_TAGS));
  const interop = tiff.interop.filter(keep(INTEROP_TAGS));

  let gps: IfdEntry[];
  if (remove.has('location')) {
    removed += tiff.gps.length;
    gps = [];
  } else {
    gps = tiff.gps.filter(keep(GPS_TAGS));
  }

  // The embedded thumbnail is a private copy of the picture ("other").
  let ifd1 = tiff.ifd1.filter(keep(IFD0_TAGS));
  let thumbnail = tiff.thumbnail;
  if (remove.has('other') && (thumbnail || ifd1.length > 0)) {
    removed += 1;
    ifd1 = [];
    thumbnail = null;
  }

  return { tiff: { littleEndian: tiff.littleEndian, ifd0, exif, gps, interop, ifd1, thumbnail }, removed };
}

/** Convenience: parse → filter → serialize. Throws TiffParseError on malformed input. */
export function cleanTiff(
  bytes: Uint8Array,
  remove: ReadonlySet<MetadataCategory>,
): { bytes: Uint8Array; removed: number } {
  const parsed = parseTiff(bytes);
  const { tiff, removed } = filterTiff(parsed, remove);
  return { bytes: serializeTiff(tiff), removed };
}
