import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { temporaryFileService, type TemporaryFileService } from './TemporaryFileService';

import { isStillImage, toWorkflowPhoto } from '@/features/workflow/photoAssets';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

export type PickPhotosResult =
  | { kind: 'picked'; photos: WorkflowPhoto[]; failedCount: number }
  | { kind: 'cancelled' }
  | { kind: 'failed' };

interface PickOptions {
  allowsMultiple: boolean;
  session: WorkSession;
}

interface Dependencies {
  launch: typeof ImagePicker.launchImageLibraryAsync;
  files: Pick<TemporaryFileService, 'importFile' | 'isSupported'>;
}

const defaultDependencies: Dependencies = {
  launch: ImagePicker.launchImageLibraryAsync,
  files: temporaryFileService,
};

/**
 * Opens the system photo picker and brings the selection into the workflow.
 *
 * Privacy notes:
 * - On iOS this is PHPickerViewController, which runs out of process and does
 *   not need photo-library permission; Metora only receives what the user taps.
 * - `preferredAssetRepresentationMode: Current` asks for the original file
 *   (HEIC stays HEIC) instead of a transcoded JPEG.
 * - `exif: false` — metadata is read later from the file bytes, never via the
 *   picker, and never stored in state.
 */
export async function pickPhotos(
  { allowsMultiple, session }: PickOptions,
  deps: Dependencies = defaultDependencies,
): Promise<PickPhotosResult> {
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await deps.launch({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowsMultiple,
      selectionLimit: allowsMultiple ? 0 : 1,
      orderedSelection: true,
      allowsEditing: false,
      quality: 1,
      exif: false,
      base64: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    });
  } catch {
    return { kind: 'failed' };
  }

  if (result.canceled) return { kind: 'cancelled' };

  const assets = result.assets.filter(isStillImage);
  if (assets.length === 0) return { kind: 'failed' };

  const photos: WorkflowPhoto[] = [];
  let failedCount = 0;
  const now = Date.now();

  // Sequential on purpose: one copy at a time keeps memory flat for large batches.
  for (const [index, asset] of assets.entries()) {
    try {
      let uri = asset.uri;
      if (deps.files.isSupported && Platform.OS !== 'web') {
        const copy = await deps.files.importFile(asset.uri, session, asset.fileName ?? `photo-${index + 1}`);
        uri = copy.uri;
      }
      photos.push(toWorkflowPhoto(asset, index, uri, now));
    } catch {
      failedCount += 1;
    }
  }

  if (photos.length === 0) return { kind: 'failed' };
  return { kind: 'picked', photos, failedCount };
}
