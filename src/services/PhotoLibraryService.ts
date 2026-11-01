import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { temporaryFileService, type TemporaryFileService } from './TemporaryFileService';

import { isStillImage, toWorkflowPhoto } from '@/features/workflow/photoAssets';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

export type PickPhotoResult = { kind: 'picked'; photo: WorkflowPhoto } | { kind: 'cancelled' } | { kind: 'failed' };

interface PickOptions {
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
 * Opens the system photo picker for one photo and brings it into the workflow.
 *
 * - On iOS this is PHPickerViewController, which runs out of process and does
 *   not need photo-library permission; the app only receives what the user taps.
 * - `preferredAssetRepresentationMode: Current` asks for the original file
 *   (HEIC stays HEIC) instead of a transcoded JPEG, so the camera info survives.
 * - `exif: false`: camera info is read later from the working copy's bytes by
 *   the metadata service, which is the single source for it.
 */
export async function pickPhoto(
  { session }: PickOptions,
  deps: Dependencies = defaultDependencies,
): Promise<PickPhotoResult> {
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await deps.launch({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      selectionLimit: 1,
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

  const asset = result.assets.find(isStillImage);
  if (!asset) return { kind: 'failed' };

  try {
    let uri = asset.uri;
    if (deps.files.isSupported && Platform.OS !== 'web') {
      const copy = await deps.files.importFile(asset.uri, session, asset.fileName ?? 'photo');
      uri = copy.uri;
    }
    return { kind: 'picked', photo: toWorkflowPhoto(asset, 0, uri) };
  } catch {
    return { kind: 'failed' };
  }
}
