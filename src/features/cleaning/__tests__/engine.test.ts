import { DOMParser } from '@xmldom/xmldom';
import * as ExifReader from 'exifreader';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ByteWriter, asciiBytes, concat, equalBytes, utf8Bytes } from '../engine/bytes';
import { CleanProcessingError, UnsupportedFormatError, cleanImageBytes, detectFormat } from '../engine';
import { heifMetadataItemTypes } from '../engine/heif';
import { jpegTail } from '../engine/jpeg';
import { pngImageData } from '../engine/png';
import { parseTiff, serializeTiff } from '../engine/tiff';
import { categoriesForMode } from '../cleanModes';

import { categorizeTag } from '@/features/metadata/categorize';
import { normalizeTags } from '@/features/metadata/normalize';
import type { CleanMode, MetadataCategory, MetadataSnapshot } from '@/types/metadata';

const FIXTURES = join(__dirname, '..', '..', '..', 'services', '__fixtures__');
const MODES: CleanMode[] = ['location', 'camera', 'dateTime', 'all'];

function fixture(name: string): Uint8Array {
  const buf = readFileSync(join(FIXTURES, name));
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function inspect(bytes: Uint8Array): MetadataSnapshot {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const tags = ExifReader.load(buffer, {
    expanded: true,
    includeUnknown: false,
    domParser: new DOMParser() as never,
  });
  return normalizeTags(tags);
}

function exifTags(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return ExifReader.load(buffer, {
    expanded: true,
    includeUnknown: false,
    domParser: new DOMParser() as never,
  });
}

const ALL: MetadataCategory[] = ['location', 'captureTime', 'device', 'camera', 'software', 'other'];

function expectOnlyRemoved(before: MetadataSnapshot, after: MetadataSnapshot, mode: CleanMode) {
  const removed = new Set(categoriesForMode(mode));
  for (const category of ALL) {
    if (removed.has(category)) {
      expect(after.categories).not.toContain(category);
    } else if (before.categories.includes(category)) {
      expect(after.categories).toContain(category);
    }
  }
}

describe('detectFormat', () => {
  it('identifies containers by magic bytes', () => {
    expect(detectFormat(fixture('gps-camera-date.jpg'))).toBe('jpeg');
    expect(detectFormat(fixture('metadata.png'))).toBe('png');
    expect(detectFormat(fixture('malformed.jpg'))).toBe('unknown');
    expect(detectFormat(buildSyntheticHeic().bytes)).toBe('heic');
  });
});

describe('JPEG cleaning', () => {
  const input = fixture('gps-camera-date.jpg');
  const before = inspect(input);

  it.each(MODES)('mode "%s" removes only its categories and keeps the rest', (mode) => {
    const result = cleanImageBytes(input, mode);
    expect(result.format).toBe('jpeg');
    expect(result.removed).toBeGreaterThan(0);
    const after = inspect(result.bytes);
    expectOnlyRemoved(before, after, mode);
  });

  it.each(MODES)('mode "%s" preserves pixels, dimensions and orientation', (mode) => {
    const result = cleanImageBytes(input, mode);
    expect(equalBytes(jpegTail(result.bytes), jpegTail(input))).toBe(true);
    const tags = exifTags(result.bytes);
    expect(tags.file?.['Image Width']?.value).toBe(64);
    expect(tags.file?.['Image Height']?.value).toBe(48);
    expect(tags.exif?.Orientation?.value).toBe(6);
  });

  it('location mode keeps camera, time, device and author but drops the whole GPS block', () => {
    const after = inspect(cleanImageBytes(input, 'location').bytes);
    expect(after.location).toBeUndefined();
    expect(after.make).toBe('Apple');
    expect(after.capturedAt).toBeInstanceOf(Date);
    expect(after.aperture).toBe('ƒ/1.8');
    expect(after.raw.some((e) => e.name === 'Artist')).toBe(true);
    expect(after.raw.some((e) => e.name.startsWith('GPS'))).toBe(false);
  });

  it('camera mode removes make, model, lens, exposure, serial and software but keeps GPS and time', () => {
    const after = inspect(cleanImageBytes(input, 'camera').bytes);
    expect(after.make).toBeUndefined();
    expect(after.model).toBeUndefined();
    expect(after.lensModel).toBeUndefined();
    expect(after.aperture).toBeUndefined();
    expect(after.software).toBeUndefined();
    expect(after.raw.some((e) => e.name === 'BodySerialNumber')).toBe(false);
    expect(after.location?.latitude).toBeCloseTo(52.3676, 3);
    expect(after.capturedAt).toBeInstanceOf(Date);
  });

  it('dateTime mode removes every timestamp including GPS date but keeps location and camera', () => {
    const after = inspect(cleanImageBytes(input, 'dateTime').bytes);
    expect(after.capturedAt).toBeUndefined();
    expect(after.capturedAtText).toBeUndefined();
    expect(after.raw.some((e) => /Date|Time/.test(e.name) && e.name !== 'ExposureTime')).toBe(false);
    expect(after.location?.latitude).toBeCloseTo(52.3676, 3);
    expect(after.make).toBe('Apple');
  });

  it('all mode leaves only structural EXIF', () => {
    const result = cleanImageBytes(input, 'all');
    const after = inspect(result.bytes);
    expect(after.hasMetadata).toBe(false);
    expect(after.categories).toEqual([]);
    expect(after.raw).toEqual([]);
    const tags = exifTags(result.bytes);
    const remaining = Object.keys(tags.exif ?? {});
    expect(remaining).toContain('Orientation');
    for (const name of remaining) expect(categorizeTag('exif', name)).toBeNull();
    expect(tags.gps).toBeUndefined();
  });

  it('keeps ICC profile and MPF segments in every mode', () => {
    const icc = Uint8Array.of(
      0xff,
      0xe2,
      0x00,
      0x14,
      ...asciiBytes('ICC_PROFILE\0'),
      1,
      1,
      0xde,
      0xad,
      0xbe,
      0xef,
    );
    const mpf = Uint8Array.of(0xff, 0xe2, 0x00, 0x0a, ...asciiBytes('MPF\0'), 0x4d, 0x4d, 0x00, 0x2a);
    const withSegments = concat([input.subarray(0, 2), icc, mpf, input.subarray(2)]);
    for (const mode of MODES) {
      const out = cleanImageBytes(withSegments, mode).bytes;
      expect(findSegment(out, 0xe2, 'ICC_PROFILE\0')).toBe(true);
      expect(findSegment(out, 0xe2, 'MPF\0')).toBe(true);
    }
  });

  it('drops COM comments and unknown APP segments only in all mode', () => {
    const com = Uint8Array.of(0xff, 0xfe, 0x00, 0x07, ...asciiBytes('hello'));
    const withComment = concat([input.subarray(0, 2), com, input.subarray(2)]);
    expect(findSegment(cleanImageBytes(withComment, 'location').bytes, 0xfe, 'hello')).toBe(true);
    expect(findSegment(cleanImageBytes(withComment, 'all').bytes, 0xfe, 'hello')).toBe(false);
  });

  it('XMP-only location is removed in location mode and the packet is dropped in all mode', () => {
    const xmpInput = fixture('xmp-location-only.jpg');
    const loc = inspect(cleanImageBytes(xmpInput, 'location').bytes);
    expect(loc.location).toBeUndefined();
    expect(loc.raw.some((e) => e.group === 'xmp' && e.name === 'creator')).toBe(true); // untouched author
    const all = inspect(cleanImageBytes(xmpInput, 'all').bytes);
    expect(all.hasMetadata).toBe(false);
  });

  it('is idempotent: cleaning an already cleaned file removes nothing and changes nothing', () => {
    for (const mode of MODES) {
      const once = cleanImageBytes(input, mode).bytes;
      const twice = cleanImageBytes(once, mode);
      expect(twice.removed).toBe(0);
      expect(equalBytes(twice.bytes, once)).toBe(true);
    }
  });

  it('reports zero removals for a file without metadata', () => {
    const clean = fixture('no-metadata.jpg');
    const result = cleanImageBytes(clean, 'all');
    expect(result.removed).toBe(0);
    expect(equalBytes(result.bytes, clean)).toBe(true);
  });

  it('handles a large image without decoding it', () => {
    const large = fixture('large-gps.jpg');
    const result = cleanImageBytes(large, 'location');
    expect(inspect(result.bytes).location).toBeUndefined();
    expect(exifTags(result.bytes).file?.['Image Width']?.value).toBe(4032);
  });

  it('malformed EXIF: dropped in all mode, processing error in selective modes', () => {
    const corrupted = input.slice();
    // Corrupt the TIFF header inside APP1 ("MM\0*" → garbage) without touching segment lengths.
    const idx = indexOf(corrupted, asciiBytes('Exif\0\0')) + 6;
    corrupted[idx] = 0x00;
    corrupted[idx + 1] = 0x00;
    const all = cleanImageBytes(corrupted, 'all');
    expect(inspect(all.bytes).hasMetadata).toBe(false);
    expect(() => cleanImageBytes(corrupted, 'location')).toThrow(CleanProcessingError);
  });

  it('rejects unsupported containers and garbage', () => {
    expect(() => cleanImageBytes(fixture('malformed.jpg'), 'all')).toThrow(UnsupportedFormatError);
    expect(() => cleanImageBytes(asciiBytes('RIFF....WEBPVP8 '), 'all')).toThrow(UnsupportedFormatError);
    const truncated = input.subarray(0, 40);
    expect(() => cleanImageBytes(truncated, 'all')).toThrow(CleanProcessingError);
  });
});

describe('JPEG cleaning with combined categories (multi-select)', () => {
  const source = () => fixture('gps-camera-date.jpg');

  it('location + date/time keeps device, camera and author', () => {
    const before = inspect(source());
    const after = inspect(cleanImageBytes(source(), ['location', 'captureTime']).bytes);
    expect(after.categories).not.toContain('location');
    expect(after.categories).not.toContain('captureTime');
    for (const kept of ['device', 'camera', 'software', 'other'] as MetadataCategory[]) {
      expect(before.categories).toContain(kept);
      expect(after.categories).toContain(kept);
    }
    expect(after.make).toBe(before.make);
    expect(after.model).toBe(before.model);
    expect(after.location).toBeUndefined();
    expect(after.capturedAt).toBeUndefined();
  });

  it('camera + date/time keeps GPS and author', () => {
    const after = inspect(cleanImageBytes(source(), ['device', 'camera', 'software', 'captureTime']).bytes);
    expect(after.categories).toContain('location');
    expect(after.categories).toContain('other');
    for (const gone of ['device', 'camera', 'software', 'captureTime'] as MetadataCategory[]) {
      expect(after.categories).not.toContain(gone);
    }
    expect(after.location?.latitude).toBeDefined();
  });

  it('location + camera keeps the capture time', () => {
    const before = inspect(source());
    const after = inspect(cleanImageBytes(source(), ['location', 'device', 'camera', 'software']).bytes);
    expect(after.categories).toEqual(expect.arrayContaining(['captureTime', 'other']));
    expect(after.categories).not.toContain('location');
    expect(after.categories).not.toContain('camera');
    expect(after.capturedAt?.getTime()).toBe(before.capturedAt?.getTime());
  });

  it('an explicit list equal to the "all" preset produces the same bytes as mode all', () => {
    const viaMode = cleanImageBytes(source(), 'all').bytes;
    const viaList = cleanImageBytes(source(), categoriesForMode('all')).bytes;
    expect(equalBytes(viaMode, viaList)).toBe(true);
  });

  it('keeps pixels, dimensions and orientation for combined selections', () => {
    const bytes = source();
    const out = cleanImageBytes(bytes, ['location', 'captureTime']).bytes;
    expect(equalBytes(jpegTail(out), jpegTail(bytes))).toBe(true);
    expect(exifTags(out).exif?.Orientation?.value).toBe(6);
  });
});

describe('PNG cleaning', () => {
  const input = fixture('metadata.png');
  const before = inspect(input);

  it.each(MODES)('mode "%s" removes only its categories and keeps image chunks', (mode) => {
    const result = cleanImageBytes(input, mode);
    expect(result.format).toBe('png');
    const after = inspect(result.bytes);
    expectOnlyRemoved(before, after, mode);
    expect(equalBytes(pngImageData(result.bytes), pngImageData(input))).toBe(true);
  });

  it('location mode removes GPS from eXIf and City/Country from XMP but keeps the Author text chunk', () => {
    const after = inspect(cleanImageBytes(input, 'location').bytes);
    expect(after.location).toBeUndefined();
    expect(after.raw.some((e) => e.group === 'pngText' && e.name === 'Author')).toBe(true);
    expect(after.raw.some((e) => e.group === 'xmp' && e.name === 'creator')).toBe(true);
  });

  it('all mode strips text chunks, XMP and eXIf but the file still parses', () => {
    const result = cleanImageBytes(input, 'all');
    const after = inspect(result.bytes);
    expect(after.hasMetadata).toBe(false);
    expect(exifTags(result.bytes).pngFile?.['Image Width']?.value).toBe(64);
  });
});

describe('HEIC cleaning (synthetic container)', () => {
  it('rewrites Exif and XMP items in place without changing file size or image bytes', () => {
    const { bytes, imageData } = buildSyntheticHeic();
    expect(heifMetadataItemTypes(bytes)).toEqual(['Exif', 'mime:application/rdf+xml']);
    const before = inspect(bytes);
    expect(before.location?.latitude).toBeCloseTo(52.3676, 3);
    expect(before.location?.placeName).toBe('Amsterdam, Netherlands');

    for (const mode of MODES) {
      const result = cleanImageBytes(bytes, mode);
      expect(result.format).toBe('heic');
      expect(result.bytes.length).toBe(bytes.length);
      expect(indexOf(result.bytes, imageData)).toBe(indexOf(bytes, imageData));
      const after = inspect(result.bytes);
      expectOnlyRemoved(before, after, mode);
    }
    const all = inspect(cleanImageBytes(bytes, 'all').bytes);
    expect(all.hasMetadata).toBe(false);
  });
});

// ---------------------------------------------------------------- helpers

function indexOf(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

function findSegment(jpeg: Uint8Array, marker: number, headerAscii: string): boolean {
  let cursor = 2;
  while (cursor + 4 <= jpeg.length && jpeg[cursor] === 0xff) {
    const m = jpeg[cursor + 1];
    if (m === 0xda) break;
    const length = (jpeg[cursor + 2] << 8) | jpeg[cursor + 3];
    if (
      m === marker &&
      indexOf(jpeg.subarray(cursor + 4, cursor + 2 + length), asciiBytes(headerAscii)) === 0
    )
      return true;
    cursor += 2 + length;
  }
  return false;
}

/** A TIFF with GPS + Make + DateTimeOriginal, built from the JPEG fixture's EXIF. */
function fixtureTiff(): Uint8Array {
  const jpeg = fixture('gps-camera-date.jpg');
  const start = indexOf(jpeg, asciiBytes('Exif\0\0'));
  const length = (jpeg[start - 2] << 8) | jpeg[start - 1];
  const tiff = jpeg.subarray(start + 6, start - 2 + length);
  return serializeTiff(parseTiff(tiff));
}

function box(type: string, ...payload: Uint8Array[]): Uint8Array {
  const body = concat(payload);
  const w = new ByteWriter();
  w.u32(8 + body.length)
    .ascii(type)
    .bytes(body);
  return w.toUint8Array();
}

function fullBox(type: string, version: number, ...payload: Uint8Array[]): Uint8Array {
  return box(type, Uint8Array.of(version, 0, 0, 0), ...payload);
}

/**
 * Minimal HEIF: ftyp + meta(hdlr, pitm, iinf[hvc1, Exif, mime], iloc) + mdat.
 * There is no decodable HEVC payload (not needed for metadata work), but the
 * box structure matches what iPhones write and what ExifReader parses.
 */
function buildSyntheticHeic(): { bytes: Uint8Array; imageData: Uint8Array } {
  const tiff = fixtureTiff();
  const exifItem = concat([Uint8Array.of(0, 0, 0, 0), tiff]);
  const xmp = utf8Bytes(
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
      '<rdf:Description rdf:about="" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" photoshop:City="Amsterdam" photoshop:Country="Netherlands">' +
      '<dc:creator><rdf:Seq><rdf:li>Test Author</rdf:li></rdf:Seq></dc:creator></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>',
  );
  const imageData = asciiBytes('HEVC-IMAGE-DATA-PLACEHOLDER-'.repeat(8));

  const ftyp = box('ftyp', asciiBytes('heic'), Uint8Array.of(0, 0, 0, 0), asciiBytes('mif1heic'));
  const hdlr = fullBox(
    'hdlr',
    0,
    Uint8Array.of(0, 0, 0, 0),
    asciiBytes('pict'),
    new Uint8Array(12),
    Uint8Array.of(0),
  );
  const pitm = fullBox('pitm', 0, Uint8Array.of(0, 1));
  const infe = (id: number, type: string, extra: Uint8Array = new Uint8Array(0)) =>
    fullBox('infe', 2, Uint8Array.of(0, id), Uint8Array.of(0, 0), asciiBytes(type), Uint8Array.of(0), extra);
  const iinf = fullBox(
    'iinf',
    0,
    Uint8Array.of(0, 3),
    infe(1, 'hvc1'),
    infe(2, 'Exif'),
    infe(3, 'mime', concat([asciiBytes('application/rdf+xml'), Uint8Array.of(0)])),
  );

  // Layout: [ftyp][meta][mdat header][image][exif][xmp]; iloc offsets are absolute (construction method 0).
  const build = (ilocBody: Uint8Array) => {
    const iloc = fullBox('iloc', 0, ilocBody);
    const meta = fullBox('meta', 0, hdlr, pitm, iinf, iloc);
    const mdatBody = concat([imageData, exifItem, xmp]);
    const mdat = box('mdat', mdatBody);
    const bytes = concat([ftyp, meta, mdat]);
    const mdatDataStart = ftyp.length + meta.length + 8;
    return {
      bytes,
      offsets: {
        image: mdatDataStart,
        exif: mdatDataStart + imageData.length,
        xmp: mdatDataStart + imageData.length + exifItem.length,
      },
    };
  };
  const ilocEntry = (id: number, offset: number, length: number) => {
    const w = new ByteWriter();
    w.u16(id).u16(0).u16(1).u32(offset).u32(length);
    return w.toUint8Array();
  };
  // Two passes: sizes do not depend on offsets (fixed 4-byte fields), so the second pass has correct offsets.
  const draft = build(
    concat([
      Uint8Array.of(0x44, 0x00),
      Uint8Array.of(0, 3),
      ilocEntry(1, 0, 0),
      ilocEntry(2, 0, 0),
      ilocEntry(3, 0, 0),
    ]),
  );
  const final = build(
    concat([
      Uint8Array.of(0x44, 0x00),
      Uint8Array.of(0, 3),
      ilocEntry(1, draft.offsets.image, imageData.length),
      ilocEntry(2, draft.offsets.exif, exifItem.length),
      ilocEntry(3, draft.offsets.xmp, xmp.length),
    ]),
  );
  return { bytes: final.bytes, imageData };
}
