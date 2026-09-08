import { defaultSaveDependencies, saveToPhotos, type SaveDependencies } from '../PhotoSaveService';
import { shareFile, shareTypeFor, type ShareDependencies } from '../ShareService';

const mockAssetCreate = jest.fn();
const mockRequestPermissions = jest.fn();
jest.mock('expo-media-library', () => ({
  __esModule: true,
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  Asset: { create: (...args: unknown[]) => mockAssetCreate(...args) },
}));
// The legacy module decodes and re-encodes images (UIImageWriteToSavedPhotosAlbum). It must never be imported.
jest.mock('expo-media-library/legacy', () => {
  throw new Error('legacy saveToLibraryAsync must not be used: it re-encodes the image');
});
jest.mock('expo-sharing', () => ({ __esModule: true, isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

function saveDeps(overrides: Partial<SaveDependencies> = {}): SaveDependencies {
  return {
    requestPermission: jest.fn().mockResolvedValue({ status: 'granted', canAskAgain: true }),
    save: jest.fn().mockResolvedValue(undefined),
    platform: 'ios',
    ...overrides,
  };
}

describe('saveToPhotos', () => {
  it('requests write-only permission then saves the file as a new asset', async () => {
    const deps = saveDeps();
    await expect(saveToPhotos('file:///cache/x-clean.heic', deps)).resolves.toEqual({ kind: 'saved' });
    expect(deps.requestPermission).toHaveBeenCalledTimes(1);
    expect(deps.save).toHaveBeenCalledWith('file:///cache/x-clean.heic');
  });

  it('reports denial without saving and passes through canAskAgain', async () => {
    const deps = saveDeps({
      requestPermission: jest.fn().mockResolvedValue({ status: 'denied', canAskAgain: false }),
    });
    await expect(saveToPhotos('file:///x', deps)).resolves.toEqual({ kind: 'denied', canAskAgain: false });
    expect(deps.save).not.toHaveBeenCalled();
  });

  it('treats undetermined as not granted', async () => {
    const deps = saveDeps({ requestPermission: jest.fn().mockResolvedValue({ status: 'undetermined' }) });
    await expect(saveToPhotos('file:///x', deps)).resolves.toMatchObject({ kind: 'denied' });
  });

  it('reports a failed save', async () => {
    const deps = saveDeps({ save: jest.fn().mockRejectedValue(new Error('PHPhotosErrorDomain')) });
    await expect(saveToPhotos('file:///x', deps)).resolves.toEqual({ kind: 'failed' });
  });

  it('is unavailable on web and never asks for permission there', async () => {
    const deps = saveDeps({ platform: 'web' });
    await expect(saveToPhotos('blob:x', deps)).resolves.toEqual({ kind: 'unavailable' });
    expect(deps.requestPermission).not.toHaveBeenCalled();
  });
});

describe('default save dependencies (file-based Photos API)', () => {
  beforeEach(() => {
    mockAssetCreate.mockReset().mockResolvedValue({ id: 'asset-1' });
    mockRequestPermissions.mockReset().mockResolvedValue({ status: 'granted', canAskAgain: true });
  });

  it('hands the output URI unchanged to Asset.create', async () => {
    const uri = 'file:///cache/metora/work/abc/IMG_0001-clean.heic';
    await defaultSaveDependencies.save(uri);
    expect(mockAssetCreate).toHaveBeenCalledTimes(1);
    expect(mockAssetCreate).toHaveBeenCalledWith(uri);
    expect(mockAssetCreate.mock.calls[0]).toHaveLength(1); // no album → no post-create fetch
  });

  it('requests write-only (Add Photos Only) permission', async () => {
    await defaultSaveDependencies.requestPermission();
    expect(mockRequestPermissions).toHaveBeenCalledWith(true);
  });

  it('passes the same URI through saveToPhotos end to end', async () => {
    const uri = 'file:///cache/metora/work/abc/IMG_0002-clean.jpg';
    await expect(saveToPhotos(uri, { ...defaultSaveDependencies, platform: 'ios' })).resolves.toEqual({
      kind: 'saved',
    });
    expect(mockAssetCreate).toHaveBeenCalledWith(uri);
  });
});

describe('shareFile', () => {
  function shareDeps(overrides: Partial<ShareDependencies> = {}): ShareDependencies {
    return {
      isAvailable: jest.fn().mockResolvedValue(true),
      share: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('shares with the right type for each format', async () => {
    const deps = shareDeps();
    await expect(shareFile('file:///x-clean.heic', 'heic', deps)).resolves.toEqual({ kind: 'shared' });
    expect(deps.share).toHaveBeenCalledWith('file:///x-clean.heic', {
      mimeType: 'image/heic',
      UTI: 'public.heic',
    });
    expect(shareTypeFor('jpeg')).toEqual({ mimeType: 'image/jpeg', UTI: 'public.jpeg' });
    expect(shareTypeFor('png')).toEqual({ mimeType: 'image/png', UTI: 'public.png' });
  });

  it('reports unavailable and failed', async () => {
    await expect(
      shareFile('file:///x', 'jpeg', shareDeps({ isAvailable: jest.fn().mockResolvedValue(false) })),
    ).resolves.toEqual({ kind: 'unavailable' });
    await expect(
      shareFile(
        'file:///x',
        'jpeg',
        shareDeps({ share: jest.fn().mockRejectedValue(new Error('dismissed')) }),
      ),
    ).resolves.toEqual({ kind: 'failed' });
  });
});
