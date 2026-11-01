import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { hasCameraInfo, shotInfoFromTags } from '../shotInfo';

import { ExifReaderMetadataService, type ImageTags } from '@/services/MetadataService';

jest.mock('expo-file-system', () => ({
  __esModule: true,
  File: class {},
  Directory: class {},
  Paths: { cache: {} },
}));

const FIXTURES = join(__dirname, '..', '..', '..', 'services', '__fixtures__');

async function infoFor(name: string) {
  const service = new ExifReaderMetadataService(async () => {
    const buf = readFileSync(join(FIXTURES, name));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  });
  return shotInfoFromTags(await service.readTags(`file:///fixtures/${name}`));
}

describe('shotInfoFromTags (fixtures)', () => {
  it('reads every field of an iPhone JPEG', async () => {
    const info = await infoFor('gps-camera-date.jpg');
    expect(info.make).toBe('Apple');
    expect(info.model).toBe('iPhone 17 Pro');
    expect(info.lens).toBe('iPhone 17 Pro back camera 24mm f/1.8');
    expect(info.aperture).toBeCloseTo(1.8, 5);
    expect(info.exposureTime).toBeCloseTo(1 / 120, 8);
    expect(info.iso).toBe(80);
    expect(info.focalLength).toBe(24);
    expect(info.focalLength35mm).toBeUndefined();
    expect(info.date?.toISOString()).toBe('2026-09-03T12:32:11.000Z'); // 14:32 at +02:00
    expect(hasCameraInfo(info)).toBe(true);
  });

  it('never carries location data', async () => {
    const info = await infoFor('gps-camera-date.jpg');
    expect(JSON.stringify(info)).not.toMatch(/GPS|latitude|longitude/i);
  });

  it('keeps the date when only a timestamp is present', async () => {
    const info = await infoFor('date-only.jpg');
    expect(info.date).toBeInstanceOf(Date);
    expect(info.make).toBeUndefined();
    expect(hasCameraInfo(info)).toBe(false);
  });

  it('is empty for a photo without tags', async () => {
    const info = await infoFor('no-metadata.jpg');
    expect(info).toEqual({});
    expect(hasCameraInfo(info)).toBe(false);
  });

  it('also reads tags embedded in a PNG', async () => {
    const info = await infoFor('metadata.png');
    expect(info.model).toBe('iPhone 17 Pro');
    expect(info.iso).toBe(80);
  });
});

describe('shotInfoFromTags (tag shapes)', () => {
  const tags = (exif: Record<string, { value?: unknown; description?: unknown }>) =>
    ({ exif }) as unknown as ImageTags;

  it('prefers the 35mm focal length and takes the first ISO of an array', () => {
    const info = shotInfoFromTags(
      tags({
        FocalLength: { value: [686, 100], description: '6.86 mm' },
        FocalLengthIn35mmFilm: { value: 24, description: '24 mm' },
        ISOSpeedRatings: { value: [80, 80], description: '80, 80' },
        FNumber: { value: [178, 100], description: 'f/1.78' },
        ExposureTime: { value: [1, 8000], description: '1/8000' },
      }),
    );
    expect(info).toEqual({ focalLength: 6.86, focalLength35mm: 24, iso: 80, aperture: 1.78, exposureTime: 1 / 8000 });
  });

  it('falls back to PhotographicSensitivity and parses numbers and fractions from descriptions', () => {
    const info = shotInfoFromTags(
      tags({
        PhotographicSensitivity: { value: 200, description: 200 },
        FNumber: { description: 'f/2,8' },
        ExposureTime: { description: '1/250' },
        FocalLength: { description: '24 mm' },
      }),
    );
    expect(info).toEqual({ iso: 200, aperture: 2.8, exposureTime: 1 / 250, focalLength: 24 });
  });

  it('reads a nested rational and a single-entry ISO array', () => {
    const info = shotInfoFromTags(
      tags({
        ExposureTime: { value: [[1, 60]], description: '1/60' },
        ISOSpeedRatings: { value: [400], description: '400' },
      }),
    );
    expect(info).toEqual({ exposureTime: 1 / 60, iso: 400 });
  });

  it('uses DateTimeDigitized when DateTimeOriginal is missing and applies its offset', () => {
    const info = shotInfoFromTags(
      tags({
        DateTimeDigitized: { value: ['2026:11:01 10:00:00'], description: '2026:11:01 10:00:00' },
        OffsetTimeDigitized: { value: ['-05:00'], description: '-05:00' },
      }),
    );
    expect(info.date?.toISOString()).toBe('2026-11-01T15:00:00.000Z');
  });

  it('drops zero, negative, non-numeric and null-padded values', () => {
    const info = shotInfoFromTags(
      tags({
        Make: { value: ['SONY\u0000'], description: 'SONY\u0000' },
        Model: { value: [''], description: '' },
        ISOSpeedRatings: { value: 0, description: 0 },
        ExposureTime: { value: [1, 0], description: '1/0' },
        FNumber: { value: 'n/a', description: 'n/a' },
        DateTimeOriginal: { value: ['0000:00:00 00:00:00'], description: '0000:00:00 00:00:00' },
      }),
    );
    expect(info).toEqual({ make: 'SONY' });
  });

  it('handles a file with only structural tags', () => {
    expect(shotInfoFromTags({ file: {} } as unknown as ImageTags)).toEqual({});
  });
});
