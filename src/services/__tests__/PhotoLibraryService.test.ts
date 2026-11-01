import type { ImagePickerAsset, ImagePickerResult } from 'expo-image-picker';

import { pickPhoto } from '../PhotoLibraryService';
import { isStale, sanitizeFileName, STALE_SESSION_MAX_AGE_MS } from '../TemporaryFileService';

jest.mock('expo-image-picker', () => ({
  __esModule: true,
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: {
    Automatic: 'automatic',
    Compatible: 'compatible',
    Current: 'current',
  },
}));

jest.mock('expo-file-system', () => ({
  __esModule: true,
  Directory: class {},
  File: class {},
  Paths: { cache: {} },
}));

const session = { id: 's1', directoryUri: 'file:///cache/shoton-work/s1/' };

function asset(overrides: Partial<ImagePickerAsset> = {}): ImagePickerAsset {
  return {
    uri: 'file:///picker/a.jpg',
    width: 100,
    height: 80,
    type: 'image',
    fileName: 'a.jpg',
    ...overrides,
  };
}

function deps(result: ImagePickerResult, importFile?: jest.Mock) {
  type Files = Parameters<typeof pickPhoto>[1] extends { files: infer F } | undefined ? F : never;
  const files = {
    isSupported: true,
    importFile:
      importFile ??
      jest.fn(async (uri: string, _s: unknown, name: string) => ({ uri: `${session.directoryUri}${name}` })),
  };
  return { launch: jest.fn().mockResolvedValue(result), files: files as unknown as Files & typeof files };
}

describe('pickPhoto', () => {
  it('asks the picker for one original still image, without picker EXIF and never for editing', async () => {
    const d = deps({ canceled: false, assets: [asset()] });
    await pickPhoto({ session }, d);
    expect(d.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        selectionLimit: 1,
        allowsEditing: false,
        exif: false,
        base64: false,
        quality: 1,
        preferredAssetRepresentationMode: 'current',
      }),
    );
  });

  it('reports cancellation without touching files', async () => {
    const d = deps({ canceled: true, assets: null });
    await expect(pickPhoto({ session }, d)).resolves.toEqual({ kind: 'cancelled' });
    expect(d.files.importFile).not.toHaveBeenCalled();
  });

  it('copies the selected image into the session and returns a workflow photo', async () => {
    const d = deps({ canceled: false, assets: [asset({ uri: 'file:///picker/b.heic', fileName: 'b.HEIC' })] });
    const result = await pickPhoto({ session }, d);
    expect(result.kind).toBe('picked');
    if (result.kind !== 'picked') return;
    expect(result.photo).toMatchObject({
      uri: `${session.directoryUri}b.HEIC`,
      displayName: 'b.HEIC',
      extension: 'heic',
    });
    expect(d.files.importFile).toHaveBeenCalledTimes(1);
  });

  it('fails when the copy fails', async () => {
    const importFile = jest.fn().mockRejectedValueOnce(new Error('copy failed'));
    const d = deps({ canceled: false, assets: [asset()] }, importFile);
    await expect(pickPhoto({ session }, d)).resolves.toEqual({ kind: 'failed' });
  });

  it('fails when nothing usable was selected or the picker throws', async () => {
    await expect(
      pickPhoto({ session }, deps({ canceled: false, assets: [asset({ type: 'video' })] })),
    ).resolves.toEqual({ kind: 'failed' });
    const throwing = {
      launch: jest.fn().mockRejectedValue(new Error('boom')),
      files: { isSupported: true, importFile: jest.fn() },
    };
    await expect(pickPhoto({ session }, throwing)).resolves.toEqual({ kind: 'failed' });
  });
});

describe('temporary file helpers', () => {
  it('sanitizes file names', () => {
    expect(sanitizeFileName('IMG_0421.HEIC')).toBe('IMG_0421.HEIC');
    expect(sanitizeFileName('my holiday photo (1).jpg')).toBe('my_holiday_photo_1_.jpg');
    expect(sanitizeFileName('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(sanitizeFileName('   ')).toBe('photo');
  });

  it('treats sessions older than the max age or without timestamps as stale', () => {
    const now = 10_000_000_000;
    expect(isStale({ creationTime: now - 1000, modificationTime: null }, now)).toBe(false);
    expect(isStale({ creationTime: now - STALE_SESSION_MAX_AGE_MS - 1, modificationTime: null }, now)).toBe(
      true,
    );
    expect(isStale({ creationTime: null, modificationTime: now - 5000 }, now)).toBe(false);
    expect(isStale({ creationTime: null, modificationTime: null }, now)).toBe(true);
    expect(isStale({}, now)).toBe(true);
  });
});
