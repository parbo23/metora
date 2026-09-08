import * as Sharing from 'expo-sharing';

import type { OutputFormat } from '@/types/metadata';
import { devLog } from '@/utils/devLog';

/** Share the verified clean copy through the system share sheet. */
export type ShareOutcome = { kind: 'shared' } | { kind: 'unavailable' } | { kind: 'failed' };

export interface ShareDependencies {
  isAvailable: () => Promise<boolean>;
  share: (uri: string, options: { mimeType?: string; UTI?: string }) => Promise<void>;
}

const defaultDependencies: ShareDependencies = {
  isAvailable: () => Sharing.isAvailableAsync(),
  share: (uri, options) => Sharing.shareAsync(uri, options),
};

const TYPES: Record<OutputFormat, { mimeType: string; UTI: string }> = {
  jpeg: { mimeType: 'image/jpeg', UTI: 'public.jpeg' },
  png: { mimeType: 'image/png', UTI: 'public.png' },
  heic: { mimeType: 'image/heic', UTI: 'public.heic' },
  other: { mimeType: 'application/octet-stream', UTI: 'public.data' },
};

export function shareTypeFor(format: OutputFormat): { mimeType: string; UTI: string } {
  return TYPES[format];
}

export async function shareFile(
  uri: string,
  format: OutputFormat,
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
