import { ByteReader, ByteWriter, asciiOf, concat, crc32, startsWith, utf8Bytes, utf8Of } from './bytes';
import { TiffParseError, cleanTiff } from './tiff';
import { XmpParseError, cleanXmp } from './xmp';

import { categorizeTag } from '@/features/metadata/categorize';
import type { MetadataCategory } from '@/types/metadata';

/**
 * PNG metadata rewriter. Operates on chunks: IHDR, PLTE, IDAT, IEND and every
 * color/rendering chunk (gAMA, cHRM, iCCP, sRGB, sBIT, pHYs, bKGD, tRNS, …)
 * are copied verbatim; only eXIf, tIME and text chunks are filtered.
 */

export class PngFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PngFormatError';
  }
}

export class PngMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PngMetadataError';
  }
}

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const XMP_KEYWORD = 'XML:com.adobe.xmp';

export function isPng(bytes: Uint8Array): boolean {
  return startsWith(bytes, SIGNATURE);
}

interface Chunk {
  type: string;
  data: Uint8Array;
  raw: Uint8Array; // length + type + data + crc, for verbatim copies
}

function parseChunks(bytes: Uint8Array): Chunk[] {
  if (!isPng(bytes)) throw new PngFormatError('not a PNG');
  const reader = new ByteReader(bytes);
  const chunks: Chunk[] = [];
  let cursor = 8;
  while (cursor + 12 <= bytes.length) {
    const length = reader.u32(cursor);
    const type = reader.ascii(cursor + 4, 4);
    const end = cursor + 12 + length;
    if (end > bytes.length) throw new PngFormatError('chunk overruns file');
    chunks.push({
      type,
      data: bytes.subarray(cursor + 8, cursor + 8 + length),
      raw: bytes.subarray(cursor, end),
    });
    cursor = end;
    if (type === 'IEND') break;
  }
  if (chunks.length === 0 || chunks[0].type !== 'IHDR') throw new PngFormatError('missing IHDR');
  if (chunks[chunks.length - 1].type !== 'IEND') throw new PngFormatError('missing IEND');
  return chunks;
}

function writeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = utf8Bytes(type);
  const w = new ByteWriter();
  w.u32(data.length).bytes(typeBytes).bytes(data).u32(crc32(typeBytes, data));
  return w.toUint8Array();
}

/** Keyword of a tEXt / zTXt / iTXt chunk (Latin-1, NUL terminated). */
function textKeyword(data: Uint8Array): string {
  let end = 0;
  while (end < data.length && data[end] !== 0) end += 1;
  return asciiOf(data.subarray(0, end));
}

interface ITxt {
  keyword: string;
  compressionFlag: number;
  compressionMethod: number;
  languageTag: Uint8Array;
  translatedKeyword: Uint8Array;
  text: Uint8Array;
}

function parseITxt(data: Uint8Array): ITxt {
  const reader = new ByteReader(data);
  const keyword = reader.cstring(0);
  const compressionFlag = reader.u8(keyword.next);
  const compressionMethod = reader.u8(keyword.next + 1);
  const language = reader.cstring(keyword.next + 2);
  const translated = reader.cstring(language.next);
  return {
    keyword: keyword.value,
    compressionFlag,
    compressionMethod,
    languageTag: data.subarray(keyword.next + 2, language.next),
    translatedKeyword: data.subarray(language.next, translated.next),
    text: data.subarray(translated.next),
  };
}

function writeITxt(chunk: ITxt): Uint8Array {
  return concat([
    utf8Bytes(chunk.keyword),
    Uint8Array.of(0, chunk.compressionFlag, chunk.compressionMethod),
    chunk.languageTag,
    chunk.translatedKeyword,
    chunk.text,
  ]);
}

export function cleanPng(
  bytes: Uint8Array,
  remove: ReadonlySet<MetadataCategory>,
): { bytes: Uint8Array; removed: number } {
  const chunks = parseChunks(bytes);
  const removeAll = remove.has('other') && remove.has('location') && remove.has('device');
  const parts: Uint8Array[] = [SIGNATURE];
  let removed = 0;

  for (const chunk of chunks) {
    switch (chunk.type) {
      case 'eXIf': {
        try {
          const cleaned = cleanTiff(chunk.data, remove);
          removed += cleaned.removed;
          parts.push(writeChunk('eXIf', cleaned.bytes));
        } catch (error) {
          if (!(error instanceof TiffParseError) || !removeAll)
            throw new PngMetadataError('eXIf could not be parsed');
          removed += 1;
        }
        break;
      }
      case 'tIME': {
        if (remove.has('captureTime')) removed += 1;
        else parts.push(chunk.raw);
        break;
      }
      case 'iTXt': {
        const parsed = parseITxt(chunk.data);
        if (parsed.keyword === XMP_KEYWORD) {
          if (removeAll) {
            removed += 1;
            break;
          }
          if (parsed.compressionFlag !== 0) throw new PngMetadataError('compressed XMP is not supported');
          try {
            const cleaned = cleanXmp(utf8Of(parsed.text), remove);
            removed += cleaned.removed;
            parts.push(writeChunk('iTXt', writeITxt({ ...parsed, text: utf8Bytes(cleaned.xml) })));
          } catch (error) {
            if (!(error instanceof XmpParseError)) throw error;
            throw new PngMetadataError('XMP could not be parsed');
          }
          break;
        }
        const category = categorizeTag('pngText', parsed.keyword);
        if (category !== null && remove.has(category)) removed += 1;
        else parts.push(chunk.raw);
        break;
      }
      case 'tEXt':
      case 'zTXt': {
        const category = categorizeTag('pngText', textKeyword(chunk.data));
        if (category !== null && remove.has(category)) removed += 1;
        else parts.push(chunk.raw);
        break;
      }
      default:
        parts.push(chunk.raw);
    }
  }

  return { bytes: concat(parts), removed };
}

/** Concatenated IDAT payloads, used by tests to prove pixels were untouched. */
export function pngImageData(bytes: Uint8Array): Uint8Array {
  return concat(
    parseChunks(bytes)
      .filter((c) => c.type === 'IDAT' || c.type === 'IHDR' || c.type === 'PLTE')
      .map((c) => c.raw),
  );
}
