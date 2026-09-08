import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ExifReaderMetadataService, MetadataReadError } from '../MetadataService';

import { categoriesForMode } from '@/features/cleaning/cleanModes';
import { categorizeTag, isSensitiveTag } from '@/features/metadata/categorize';
import { deviceLabel, remainingCategories } from '@/features/metadata/normalize';
import { cameraLine, formatCoordinates, metadataRows } from '@/features/metadata/presentation';
import type { WorkflowPhoto } from '@/types/workflow';
import { formatCaptureDate, parseExifDate } from '@/utils/exifDate';

jest.mock('expo-file-system', () => ({
  __esModule: true,
  File: class {},
  Directory: class {},
  Paths: { cache: {} },
}));

const FIXTURES = join(__dirname, '..', '__fixtures__');

function fixtureReader(name: string) {
  return async () => {
    const buf = readFileSync(join(FIXTURES, name));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  };
}

function inspect(name: string) {
  return new ExifReaderMetadataService(fixtureReader(name)).inspect(`file:///fixtures/${name}`);
}

const photo: WorkflowPhoto = {
  id: 'p1',
  uri: 'file:///x.jpg',
  displayName: 'x.jpg',
  extension: 'jpg',
  mimeType: 'image/jpeg',
  width: 64,
  height: 48,
  fileSize: 1214,
  addedAt: 0,
};

describe('ExifReaderMetadataService.inspect (fixtures)', () => {
  it('JPEG with GPS, camera and timestamp', async () => {
    const s = await inspect('gps-camera-date.jpg');
    expect(s.hasMetadata).toBe(true);
    expect(s.location?.latitude).toBeCloseTo(52.3676, 3);
    expect(s.location?.longitude).toBeCloseTo(4.9041, 3);
    expect(s.location?.altitude).toBe(12);
    expect(s.make).toBe('Apple');
    expect(s.model).toBe('iPhone 17 Pro');
    expect(s.lensModel).toContain('24mm');
    expect(s.aperture).toBe('ƒ/1.8');
    expect(s.iso).toBe('80');
    expect(s.focalLength).toBe('24 mm');
    expect(s.software).toBe('iOS 26');
    expect(s.capturedAt?.toISOString()).toBe('2026-09-03T12:32:11.000Z'); // 14:32 at +02:00
    expect(s.categories).toEqual(['location', 'captureTime', 'device', 'camera', 'software', 'other']);
    // "other" is sensitive here because the fixture carries an Artist tag.
    expect(s.sensitiveCategories).toEqual(['location', 'captureTime', 'device', 'other']);
  });

  it('JPEG without GPS keeps camera and time but has no location', async () => {
    const s = await inspect('camera-date-no-gps.jpg');
    expect(s.location).toBeUndefined();
    expect(s.categories).not.toContain('location');
    expect(s.categories).toEqual(expect.arrayContaining(['captureTime', 'device', 'camera']));
  });

  it('JPEG with a timestamp only', async () => {
    const s = await inspect('date-only.jpg');
    expect(s.categories).toEqual(['captureTime']);
    expect(s.sensitiveCategories).toEqual(['captureTime']);
    expect(s.make).toBeUndefined();
    expect(s.capturedAt).toBeInstanceOf(Date);
  });

  it('PNG with eXIf, text chunks and XMP location', async () => {
    const s = await inspect('metadata.png');
    expect(s.fileType).toBe('PNG');
    expect(s.location?.latitude).toBeCloseTo(52.3676, 3);
    expect(s.location?.placeName).toBe('Amsterdam, Netherlands');
    expect(s.categories).toEqual(expect.arrayContaining(['location', 'captureTime', 'device', 'other']));
    expect(s.raw.some((e) => e.group === 'pngText' && e.name === 'Author')).toBe(true);
  });

  it('XMP-only location is still detected as location (no GPS IFD)', async () => {
    const s = await inspect('xmp-location-only.jpg');
    expect(s.location).toEqual({
      latitude: undefined,
      longitude: undefined,
      altitude: undefined,
      placeName: 'Amsterdam, Netherlands',
    });
    expect(s.categories).toContain('location');
    expect(s.sensitiveCategories).toContain('location');
  });

  it('a photo without metadata is not an error', async () => {
    const s = await inspect('no-metadata.jpg');
    expect(s.hasMetadata).toBe(false);
    expect(s.categories).toEqual([]);
    expect(s.sensitiveCategories).toEqual([]);
    expect(s.raw).toEqual([]);
    expect(s.fileType).toBe('JPEG');
  });

  it('a very large image only needs its bytes, not decoded pixels', async () => {
    const s = await inspect('large-gps.jpg');
    expect(s.location?.latitude).toBeCloseTo(52.3676, 3);
    expect(s.raw.length).toBeGreaterThan(5);
  });

  it('malformed files surface a calm read error', async () => {
    await expect(inspect('malformed.jpg')).rejects.toBeInstanceOf(MetadataReadError);
  });

  it('a file that cannot be read surfaces the same error', async () => {
    const service = new ExifReaderMetadataService(async () => {
      throw new Error('ENOENT');
    });
    await expect(service.inspect('file:///missing.jpg')).rejects.toBeInstanceOf(MetadataReadError);
  });

  it('never keeps binary or raw XMP blobs in the snapshot', async () => {
    const s = await inspect('metadata.png');
    expect(s.raw.some((e) => e.name === '_raw')).toBe(false);
    expect(JSON.stringify(s)).not.toContain('<x:xmpmeta');
  });
});

describe('verifyClean with explicit categories', () => {
  it('checks only the requested categories', async () => {
    const svc = new ExifReaderMetadataService(fixtureReader('gps-camera-date.jpg'));
    await expect(svc.verifyClean('file:///x', ['location', 'captureTime'])).resolves.toMatchObject({
      verified: false,
      remainingCategories: ['location', 'captureTime'],
    });
    const clean = new ExifReaderMetadataService(fixtureReader('no-metadata.jpg'));
    await expect(clean.verifyClean('file:///x', ['location', 'captureTime'])).resolves.toEqual({
      verified: true,
      remainingCategories: [],
    });
  });
});

describe('verifyClean', () => {
  it('passes when the promised categories are absent and fails otherwise', async () => {
    const svc = new ExifReaderMetadataService(fixtureReader('camera-date-no-gps.jpg'));
    await expect(svc.verifyClean('file:///x', 'location')).resolves.toEqual({
      verified: true,
      remainingCategories: [],
    });
    await expect(svc.verifyClean('file:///x', 'all')).resolves.toEqual({
      verified: false,
      remainingCategories: ['captureTime', 'device', 'camera', 'software', 'other'],
    });
    const clean = new ExifReaderMetadataService(fixtureReader('no-metadata.jpg'));
    await expect(clean.verifyClean('file:///x', 'all')).resolves.toEqual({
      verified: true,
      remainingCategories: [],
    });
  });

  it('maps clean modes to promised categories', () => {
    expect(categoriesForMode('location')).toEqual(['location']);
    expect(categoriesForMode('dateTime')).toEqual(['captureTime']);
    expect(categoriesForMode('camera')).toEqual(['device', 'camera', 'software']);
    expect(categoriesForMode('all')).toHaveLength(6);
    expect(remainingCategories({ categories: ['camera'] } as never, ['location', 'camera'])).toEqual([
      'camera',
    ]);
  });
});

describe('categorizeTag', () => {
  it('separates structural data from removable categories', () => {
    expect(categorizeTag('file', 'Image Width')).toBeNull();
    expect(categorizeTag('exif', 'Orientation')).toBeNull();
    expect(categorizeTag('exif', 'ColorSpace')).toBeNull();
    expect(categorizeTag('icc', 'Profile Description')).toBeNull();
    expect(categorizeTag('exif', 'GPS Info IFD Pointer')).toBeNull();
    expect(categorizeTag('exif', 'GPSLatitude')).toBe('location');
    expect(categorizeTag('exif', 'GPSDateStamp')).toBe('captureTime');
    expect(categorizeTag('xmp', 'City')).toBe('location');
    expect(categorizeTag('exif', 'DateTimeOriginal')).toBe('captureTime');
    expect(categorizeTag('exif', 'Make')).toBe('device');
    expect(categorizeTag('exif', 'BodySerialNumber')).toBe('device');
    expect(categorizeTag('exif', 'Software')).toBe('software');
    expect(categorizeTag('exif', 'LensModel')).toBe('camera');
    expect(categorizeTag('exif', 'FNumber')).toBe('camera');
    expect(categorizeTag('exif', 'UserComment')).toBe('other');
    expect(categorizeTag('makerNotes', 'Anything')).toBe('device');
  });

  it('flags owner and author fields in "other" as sensitive, but not exposure settings', () => {
    expect(isSensitiveTag('other', 'Artist')).toBe(true);
    expect(isSensitiveTag('other', 'Copyright')).toBe(true);
    expect(isSensitiveTag('other', 'SomeVendorTag')).toBe(false);
    expect(isSensitiveTag('camera', 'FNumber')).toBe(false);
    expect(isSensitiveTag('software', 'Software')).toBe(false);
    expect(isSensitiveTag('device', 'Model')).toBe(true);
  });
});

describe('presentation', () => {
  it('formats coordinates, camera line and device label', () => {
    expect(formatCoordinates(52.3676, 4.9041)).toBe('52.3676° N, 4.9041° E');
    expect(formatCoordinates(-33.8688, 151.2093)).toBe('33.8688° S, 151.2093° E');
    expect(formatCoordinates(undefined, 1)).toBeUndefined();
    expect(cameraLine({ focalLength: '24 mm', aperture: 'ƒ/1.8', iso: '80' } as never)).toBe(
      '24 mm · ƒ/1.8 · ISO 80',
    );
    expect(deviceLabel('Apple', 'iPhone 17 Pro')).toBe('iPhone 17 Pro');
    expect(deviceLabel('SONY', 'ILCE-7M4')).toBe('SONY ILCE-7M4');
    expect(deviceLabel('Canon', 'Canon EOS R6')).toBe('Canon EOS R6');
  });

  it('builds rows in spec order and skips empty ones', async () => {
    const s = await inspect('gps-camera-date.jpg');
    const rows = metadataRows(s, photo);
    expect(rows.map((r) => r.key)).toEqual([
      'location',
      'captured',
      'device',
      'camera',
      'lens',
      'software',
      'dimensions',
      'fileType',
      'fileSize',
    ]);
    expect(rows[0].value).toBe('52.3676° N, 4.9041° E');
    expect(rows[2].value).toBe('iPhone 17 Pro');
    expect(rows[3].value).toBe('24 mm · ƒ/1.8 · ISO 80 · 1/120 s');
    expect(rows[6].value).toBe('64 × 48');
    expect(rows[7].value).toBe('JPEG');

    const clean = await inspect('no-metadata.jpg');
    expect(metadataRows(clean, photo).map((r) => r.key)).toEqual(['dimensions', 'fileType', 'fileSize']);
  });

  it('parses and formats EXIF dates', () => {
    const d = parseExifDate('2026:09:03 14:32:11', '+02:00');
    expect(d?.toISOString()).toBe('2026-09-03T12:32:11.000Z');
    expect(parseExifDate('0000:00:00 00:00:00')).toBeUndefined();
    expect(parseExifDate('garbage')).toBeUndefined();
    expect(parseExifDate('2026-09-03T14:32:11+02:00')?.toISOString()).toBe('2026-09-03T12:32:11.000Z');
    const local = parseExifDate('2026:09:03 14:32:11');
    expect(local?.getHours()).toBe(14);
    expect(formatCaptureDate(new Date(2026, 8, 3, 14, 32))).toBe('Sep 3, 2026 · 2:32 PM');
  });
});
