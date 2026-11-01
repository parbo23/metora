import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ExifReaderMetadataService, MetadataReadError } from '../MetadataService';

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

function readTags(name: string) {
  return new ExifReaderMetadataService(fixtureReader(name)).readTags(`file:///fixtures/${name}`);
}

describe('ExifReaderMetadataService.readTags (fixtures)', () => {
  it('returns the EXIF and TIFF containers of a camera JPEG', async () => {
    const tags = await readTags('gps-camera-date.jpg');
    expect(tags.exif?.Make?.description).toBe('Apple');
    expect(tags.exif?.Model?.description).toBe('iPhone 17 Pro');
    expect(tags.exif?.FNumber?.description).toBe('f/1.8');
    expect(tags.exif?.DateTimeOriginal?.description).toBe('2026:09:03 14:32:11');
  });

  it('a photo without camera tags is not an error', async () => {
    // Only the structural `file` container (dimensions, bit depth) remains.
    const tags = await readTags('no-metadata.jpg');
    expect(tags.exif).toBeUndefined();
    expect(tags.gps).toBeUndefined();
    expect(tags.file?.FileType?.description).toBe('JPEG');
  });

  it('malformed files surface a calm read error', async () => {
    await expect(readTags('malformed.jpg')).rejects.toBeInstanceOf(MetadataReadError);
  });

  it('a file that cannot be read surfaces the same error', async () => {
    const service = new ExifReaderMetadataService(async () => {
      throw new Error('ENOENT');
    });
    await expect(service.readTags('file:///missing.jpg')).rejects.toBeInstanceOf(MetadataReadError);
  });
});
