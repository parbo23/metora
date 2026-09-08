import type { ImagePickerAsset } from 'expo-image-picker';

import type { WorkflowPhoto } from '@/types/workflow';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/tiff': 'tiff',
};

/** Extension without the dot, derived from the file name, then the MIME type, then the URI. */
export function extensionFor(asset: Pick<ImagePickerAsset, 'fileName' | 'mimeType' | 'uri'>): string {
  const fromName = asset.fileName?.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (fromName) return fromName.toLowerCase();
  const fromMime = asset.mimeType ? MIME_EXTENSIONS[asset.mimeType.toLowerCase()] : undefined;
  if (fromMime) return fromMime;
  const fromUri = asset.uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/)?.[1];
  return fromUri ? fromUri.toLowerCase() : 'jpg';
}

/** Display name: the original file name when the picker provides one, otherwise "Photo N.ext". */
export function displayNameFor(
  asset: Pick<ImagePickerAsset, 'fileName' | 'mimeType' | 'uri'>,
  index: number,
): string {
  const name = asset.fileName?.trim();
  if (name) return name.split(/[\\/]/).pop() ?? name;
  return `Photo ${index + 1}.${extensionFor(asset)}`;
}

/** Only still images enter the workflow; videos and paired videos are ignored. */
export function isStillImage(asset: Pick<ImagePickerAsset, 'type'>): boolean {
  return (
    asset.type === undefined || asset.type === null || asset.type === 'image' || asset.type === 'livePhoto'
  );
}

export function toWorkflowPhoto(
  asset: ImagePickerAsset,
  index: number,
  workingCopyUri: string,
  now: number = Date.now(),
): WorkflowPhoto {
  return {
    id: `${now.toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    uri: workingCopyUri,
    displayName: displayNameFor(asset, index),
    extension: extensionFor(asset),
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
    addedAt: now,
  };
}
