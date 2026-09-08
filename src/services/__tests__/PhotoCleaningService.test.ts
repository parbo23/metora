import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ExifReaderMetadataService, type MetadataService } from '../MetadataService';
import { PhotoCleaningService, outputNameFor, type CleanFileSystem } from '../PhotoCleaningService';

import type { CleanMode } from '@/types/metadata';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

jest.mock('expo-file-system', () => ({
  __esModule: true,
  File: class {},
  Directory: class {},
  Paths: { cache: {} },
}));

const FIXTURES = join(__dirname, '..', '__fixtures__');
const session: WorkSession = { id: 's1', directoryUri: 'file:///cache/metora-work/s1/' };

/** In-memory file system: the fixture directory is read-only "disk", outputs are stored by URI. */
function memoryFs() {
  const outputs = new Map<string, Uint8Array>();
  const deleted: string[] = [];
  const fs: CleanFileSystem = {
    async readBytes(uri) {
      const stored = outputs.get(uri);
      if (stored)
        return stored.buffer.slice(stored.byteOffset, stored.byteOffset + stored.byteLength) as ArrayBuffer;
      const name = uri.replace('file:///fixtures/', '');
      const buf = readFileSync(join(FIXTURES, name));
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    },
    async writeOutput(s, name, bytes) {
      const uri = `${s.directoryUri}${name}`;
      outputs.set(uri, bytes.slice());
      return uri;
    },
    async copyOutput(s, sourceUri, name) {
      const uri = `${s.directoryUri}${name}`;
      outputs.set(uri, new Uint8Array(await fs.readBytes(sourceUri)));
      return uri;
    },
    async delete(uri) {
      outputs.delete(uri);
      deleted.push(uri);
    },
  };
  return { fs, outputs, deleted };
}

function photo(name: string): WorkflowPhoto {
  return {
    id: name,
    uri: `file:///fixtures/${name}`,
    displayName: name,
    extension: name.split('.').pop() ?? '',
    width: 64,
    height: 48,
    addedAt: 0,
  };
}

function makeService(overrides: Partial<{ files: CleanFileSystem; metadata: MetadataService }> = {}) {
  const { fs, outputs, deleted } = memoryFs();
  const metadata = overrides.metadata ?? new ExifReaderMetadataService(fs.readBytes);
  const service = new PhotoCleaningService({ files: overrides.files ?? fs, metadata });
  return { service, fs, outputs, deleted, metadata };
}

const MODES: CleanMode[] = ['location', 'camera', 'dateTime', 'all'];

describe('PhotoCleaningService with a custom (multi-select) request', () => {
  it('removes exactly the requested categories, keeps the rest, and labels the result custom', async () => {
    const { service, outputs } = makeService();
    const outcome = await service.clean(
      photo('gps-camera-date.jpg'),
      { mode: 'custom', categories: ['location', 'captureTime'] },
      session,
    );
    expect(outcome.kind).toBe('cleaned');
    if (outcome.kind !== 'cleaned') return;
    expect(outcome.result.mode).toBe('custom');
    expect(outcome.result.removedCategories).toEqual(['location', 'captureTime']);
    expect(outcome.result.keptCategories).toEqual(
      expect.arrayContaining(['device', 'camera', 'software', 'other']),
    );
    expect(outputs.has(outcome.result.outputUri)).toBe(true);
  });

  it('accepts a bare category list and treats it as custom', async () => {
    const { service } = makeService();
    const outcome = await service.clean(
      photo('gps-camera-date.jpg'),
      ['device', 'camera', 'software'],
      session,
    );
    expect(outcome.kind).toBe('cleaned');
    if (outcome.kind !== 'cleaned') return;
    expect(outcome.result.mode).toBe('custom');
    expect(outcome.result.keptCategories).toEqual(expect.arrayContaining(['location', 'captureTime']));
  });
});

describe('PhotoCleaningService', () => {
  it.each(MODES)(
    'produces a verified clean copy for mode "%s" and never touches the source',
    async (mode) => {
      const { service, fs, outputs } = makeService();
      const before = new Uint8Array(await fs.readBytes('file:///fixtures/gps-camera-date.jpg'));
      const outcome = await service.clean(photo('gps-camera-date.jpg'), mode, session);
      expect(outcome.kind).toBe('cleaned');
      if (outcome.kind !== 'cleaned') return;
      expect(outcome.result.verified).toBe(true);
      expect(outcome.result.mode).toBe(mode);
      expect(outcome.result.outputFormat).toBe('jpeg');
      expect(outcome.result.outputUri).toBe(`${session.directoryUri}gps-camera-date-clean.jpg`);
      expect(outcome.result.outputDisplayName).toBe('gps-camera-date-clean.jpg');
      expect(outcome.result.alreadyClean).toBe(false);
      expect(outputs.has(outcome.result.outputUri)).toBe(true);
      // The source bytes are unchanged.
      const after = new Uint8Array(await fs.readBytes('file:///fixtures/gps-camera-date.jpg'));
      expect(Buffer.compare(Buffer.from(before), Buffer.from(after))).toBe(0);
    },
  );

  it('reports removed and kept categories from the actual original', async () => {
    const { service } = makeService();
    const outcome = await service.clean(photo('gps-camera-date.jpg'), 'location', session);
    if (outcome.kind !== 'cleaned') throw new Error(outcome.kind);
    expect(outcome.result.originalCategories).toEqual([
      'location',
      'captureTime',
      'device',
      'camera',
      'software',
      'other',
    ]);
    expect(outcome.result.removedCategories).toEqual(['location']);
    expect(outcome.result.keptCategories).toEqual(['captureTime', 'device', 'camera', 'software', 'other']);
  });

  it('copies an already-clean file verbatim instead of rewriting it', async () => {
    const { service, fs, outputs } = makeService();
    const outcome = await service.clean(photo('no-metadata.jpg'), 'all', session);
    if (outcome.kind !== 'cleaned') throw new Error(outcome.kind);
    expect(outcome.result.alreadyClean).toBe(true);
    expect(outcome.result.removedCategories).toEqual([]);
    const source = new Uint8Array(await fs.readBytes('file:///fixtures/no-metadata.jpg'));
    expect(Buffer.compare(Buffer.from(outputs.get(outcome.result.outputUri)!), Buffer.from(source))).toBe(0);
  });

  it('treats a photo without the targeted category as already clean for that mode', async () => {
    const { service } = makeService();
    const outcome = await service.clean(photo('camera-date-no-gps.jpg'), 'location', session);
    if (outcome.kind !== 'cleaned') throw new Error(outcome.kind);
    expect(outcome.result.alreadyClean).toBe(true);
    expect(outcome.result.keptCategories).toEqual(
      expect.arrayContaining(['captureTime', 'device', 'camera']),
    );
  });

  it('cleaning the clean copy again succeeds and removes nothing more', async () => {
    const { service, outputs } = makeService();
    const first = await service.clean(photo('gps-camera-date.jpg'), 'all', session);
    if (first.kind !== 'cleaned') throw new Error(first.kind);
    const second = await service.clean(
      {
        ...photo('gps-camera-date.jpg'),
        id: 'again',
        uri: first.result.outputUri,
        displayName: first.result.outputDisplayName,
      },
      'all',
      session,
    );
    if (second.kind !== 'cleaned') throw new Error(second.kind);
    expect(second.result.alreadyClean).toBe(true);
    expect(second.result.outputDisplayName).toBe('gps-camera-date-clean-clean.jpg');
    expect(
      Buffer.compare(
        Buffer.from(outputs.get(second.result.outputUri)!),
        Buffer.from(outputs.get(first.result.outputUri)!),
      ),
    ).toBe(0);
  });

  it('handles PNG', async () => {
    const { service } = makeService();
    const outcome = await service.clean(photo('metadata.png'), 'location', session);
    if (outcome.kind !== 'cleaned') throw new Error(outcome.kind);
    expect(outcome.result.outputFormat).toBe('png');
    expect(outcome.result.outputDisplayName).toBe('metadata-clean.png');
    expect(outcome.result.removedCategories).toEqual(['location']);
  });

  it('rejects unsupported containers without producing output', async () => {
    const { service, outputs } = makeService();
    const outcome = await service.clean(photo('malformed.jpg'), 'all', session);
    expect(outcome).toEqual({ kind: 'unreadable' });
    expect(outputs.size).toBe(0);

    const { service: svc2, outputs: out2 } = makeService();
    const webp = { ...photo('gps-camera-date.jpg'), id: 'webp', uri: 'file:///webp' };
    const files = svc2 as unknown as { files: CleanFileSystem };
    files.files.readBytes = async () => new TextEncoder().encode('RIFF....WEBPVP8 ').buffer as ArrayBuffer;
    const unsupported = await svc2.clean(webp, 'all', session);
    expect(unsupported).toEqual({ kind: 'unsupported', format: 'webp' });
    expect(out2.size).toBe(0);
  });

  it('distinguishes a processing failure (cannot rewrite) from a verification failure', async () => {
    // Corrupt the EXIF TIFF header: selective modes cannot edit it → processingFailed, no output written.
    const { fs, outputs } = memoryFs();
    const original = new Uint8Array(await fs.readBytes('file:///fixtures/gps-camera-date.jpg'));
    const corrupted = original.slice();
    const idx = Buffer.from(corrupted).indexOf('Exif\0\0') + 6;
    corrupted[idx] = 0;
    corrupted[idx + 1] = 0;
    outputs.set('file:///corrupt.jpg', corrupted);
    const metadata = new ExifReaderMetadataService(fs.readBytes);
    const service = new PhotoCleaningService({ files: fs, metadata });
    const outcome = await service.clean(
      { ...photo('gps-camera-date.jpg'), uri: 'file:///corrupt.jpg' },
      'location',
      session,
    );
    expect(outcome).toEqual({ kind: 'processingFailed' });
    expect(outputs.size).toBe(1); // only the corrupt input, no clean output
  });

  it('never exposes an output that fails verification, and deletes it', async () => {
    const { fs, outputs, deleted } = memoryFs();
    const real = new ExifReaderMetadataService(fs.readBytes);
    const lying: MetadataService = {
      inspect: (uri) => real.inspect(uri),
      inspectBytes: (buffer) => real.inspectBytes(buffer),
      verifyClean: async () => ({ verified: false, remainingCategories: ['location'] }),
    };
    const service = new PhotoCleaningService({ files: fs, metadata: lying });
    const outcome = await service.clean(photo('gps-camera-date.jpg'), 'location', session);
    expect(outcome).toEqual({ kind: 'verificationFailed', remaining: ['location'] });
    expect(deleted).toEqual([`${session.directoryUri}gps-camera-date-clean.jpg`]);
    expect(outputs.size).toBe(0);
  });

  it('treats an unreadable output during verification as a verification failure', async () => {
    const { fs, outputs, deleted } = memoryFs();
    const real = new ExifReaderMetadataService(fs.readBytes);
    const throwing: MetadataService = {
      inspect: (uri) => real.inspect(uri),
      inspectBytes: (buffer) => real.inspectBytes(buffer),
      verifyClean: async () => {
        throw new Error('disk vanished');
      },
    };
    const service = new PhotoCleaningService({ files: fs, metadata: throwing });
    const outcome = await service.clean(photo('gps-camera-date.jpg'), 'all', session);
    expect(outcome.kind).toBe('verificationFailed');
    expect(deleted).toHaveLength(1);
    expect(outputs.size).toBe(0);
  });

  it('reports a processing failure when the output cannot be written', async () => {
    const { fs } = memoryFs();
    const failing: CleanFileSystem = {
      ...fs,
      writeOutput: async () => {
        throw new Error('ENOSPC');
      },
    };
    const service = new PhotoCleaningService({
      files: failing,
      metadata: new ExifReaderMetadataService(fs.readBytes),
    });
    await expect(service.clean(photo('gps-camera-date.jpg'), 'all', session)).resolves.toEqual({
      kind: 'processingFailed',
    });
  });

  it('reports verifying progress before the verify step', async () => {
    const { service } = makeService();
    const onVerifying = jest.fn();
    await service.clean(photo('gps-camera-date.jpg'), 'all', session, { onVerifying });
    expect(onVerifying).toHaveBeenCalledTimes(1);
  });
});

describe('outputNameFor', () => {
  it('keeps the original format and extension style', () => {
    expect(outputNameFor('IMG_0421.HEIC', 'heic')).toBe('IMG_0421-clean.heic');
    expect(outputNameFor('IMG_0421.heif', 'heic')).toBe('IMG_0421-clean.heif');
    expect(outputNameFor('Vacation.jpeg', 'jpeg')).toBe('Vacation-clean.jpeg');
    expect(outputNameFor('Vacation.JPG', 'jpeg')).toBe('Vacation-clean.jpg');
    expect(outputNameFor('shot', 'png')).toBe('shot-clean.png');
  });
});
