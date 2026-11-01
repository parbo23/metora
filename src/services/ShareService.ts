import * as Sharing from 'expo-sharing';

import { devLog } from '@/utils/devLog';

/** Share an exported file through the system share sheet. */
export type ShareOutcome = { kind: 'shared' } | { kind: 'unavailable' } | { kind: 'failed' };

export type ShareFormat = 'jpeg' | 'png' | 'heic';

export interface ShareDependencies {
  isAvailable: () => Promise<boolean>;
  share: (uri: string, options: { mimeType?: string; UTI?: string }) => Promise<void>;
}

const defaultDependencies: ShareDependencies = {
  isAvailable: () => Sharing.isAvailableAsync(),
  share: (uri, options) => Sharing.shareAsync(uri, options),
};

const TYPES: Record<ShareFormat, { mimeType: string; UTI: string }> = {
  jpeg: { mimeType: 'image/jpeg', UTI: 'public.jpeg' },
  png: { mimeType: 'image/png', UTI: 'public.png' },
  heic: { mimeType: 'image/heic', UTI: 'public.heic' },
};

export function shareTypeFor(format: ShareFormat): { mimeType: string; UTI: string } {
  return TYPES[format];
}

export async function shareFile(
  uri: string,
  format: ShareFormat,
  deps: ShareDependencies = defaultDependencies,
): Promise<ShareOutcome> {
  try {
    if (!(await deps.isAvailable())) return { kind: 'unavailable' };
    await deps.share(uri, shareTypeFor(format));
    return { kind: 'shared' };
  } catch (error) {
    devLog('share: failed', error instanceof Error ? error.name : 'unknown');
    return { kind: 'failed' };
  }
}
