import { Linking, Platform } from 'react-native';

import { devLog } from '@/utils/devLog';

/**
 * Saving a clean copy to the photo library.
 *
 * The file itself is handed to Photos: `Asset.create(uri)` from
 * expo-media-library maps to `PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL:)`,
 * so the exact verified bytes become the new asset. JPEG stays JPEG, HEIC stays
 * HEIC, PNG stays PNG; pixels, dimensions and quality are untouched.
 *
 * Never use the legacy `saveToLibraryAsync`: on iOS it decodes the file into a
 * UIImage and re-encodes it (UIImageWriteToSavedPhotosAlbum), which changed the
 * format to PNG and the file size in device testing, and would silently discard
 * the verification guarantee.
 *
 * Permission model is unchanged: write-only ("Add Photos Only" on iOS). The
 * native `create` checks the write-only requester first and does not re-fetch
 * the asset afterwards unless an album is given, so it does not falsely reject
 * under add-only access.
 */
export type SaveOutcome =
  { kind: 'saved' } | { kind: 'denied'; canAskAgain: boolean } | { kind: 'failed' } | { kind: 'unavailable' };

export interface SaveDependencies {
  requestPermission: () => Promise<{ status: string; canAskAgain?: boolean }>;
  /** Must add the file at `uri` to the library as-is, without re-encoding. */
  save: (uri: string) => Promise<void>;
  platform: string;
}

// expo-media-library is loaded lazily: its native module does not exist on
// web, and importing it at module scope would crash the web preview. A plain
// require (not import()) keeps this testable under Jest.
function loadMediaLibrary(): typeof import('expo-media-library') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-media-library');
}

export const defaultSaveDependencies: SaveDependencies = {
  requestPermission: async () => loadMediaLibrary().requestPermissionsAsync(true),
  save: async (uri) => {
    await loadMediaLibrary().Asset.create(uri);
  },
  platform: Platform.OS,
};

export async function saveToPhotos(
  uri: string,
  deps: SaveDependencies = defaultSaveDependencies,
): Promise<SaveOutcome> {
  if (deps.platform === 'web') return { kind: 'unavailable' };

  let permission: { status: string; canAskAgain?: boolean };
  try {
    permission = await deps.requestPermission();
  } catch {
    return { kind: 'failed' };
  }
  if (permission.status !== 'granted') {
    return { kind: 'denied', canAskAgain: permission.canAskAgain ?? false };
  }

  try {
    await deps.save(uri);
    return { kind: 'saved' };
  } catch (error) {
    devLog('save: failed', error instanceof Error ? error.name : 'unknown');
    return { kind: 'failed' };
  }
}

/** Opens the app's page in iOS Settings so the user can grant "Add Photos Only". */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Nothing else we can do; the message already explains the permission.
  }
}
