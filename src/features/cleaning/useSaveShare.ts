import { useCallback, useState } from 'react';

import { openAppSettings, saveToPhotos, type SaveOutcome } from '@/services/PhotoSaveService';
import { shareFile, type ShareOutcome } from '@/services/ShareService';
import type { CleanResult } from '@/types/metadata';
import { haptics } from '@/utils/haptics';

export type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'done'; outcome: SaveOutcome };
export type ShareState =
  { status: 'idle' } | { status: 'sharing' } | { status: 'done'; outcome: ShareOutcome };

/** Save-to-Photos and Share for one verified clean copy. */
export function useSaveShare(result: CleanResult | null) {
  const [save, setSave] = useState<SaveState>({ status: 'idle' });
  const [share, setShare] = useState<ShareState>({ status: 'idle' });

  const saveCopy = useCallback(async () => {
    if (!result || save.status === 'saving') return;
    setSave({ status: 'saving' });
    const outcome = await saveToPhotos(result.outputUri);
    if (outcome.kind === 'saved') haptics.success();
    else if (outcome.kind !== 'unavailable') haptics.error();
    setSave({ status: 'done', outcome });
  }, [result, save.status]);

  const shareCopy = useCallback(async () => {
    if (!result || share.status === 'sharing') return;
    setShare({ status: 'sharing' });
    const outcome = await shareFile(result.outputUri, result.outputFormat);
    setShare({ status: 'done', outcome });
  }, [result, share.status]);

  return { save, share, saveCopy, shareCopy, openAppSettings };
}
