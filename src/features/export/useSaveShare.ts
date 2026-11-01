import { useCallback, useState } from 'react';

import { openAppSettings, saveToPhotos, type SaveOutcome } from '@/services/PhotoSaveService';
import { shareFile, type ShareFormat, type ShareOutcome } from '@/services/ShareService';
import { haptics } from '@/utils/haptics';

export type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'done'; outcome: SaveOutcome };
export type ShareState =
  { status: 'idle' } | { status: 'sharing' } | { status: 'done'; outcome: ShareOutcome };

export interface ExportFile {
  uri: string;
  format: ShareFormat;
}

/** Save-to-Photos and Share for one exported file. */
export function useSaveShare(file: ExportFile | null) {
  const [save, setSave] = useState<SaveState>({ status: 'idle' });
  const [share, setShare] = useState<ShareState>({ status: 'idle' });

  const saveCopy = useCallback(async () => {
    if (!file || save.status === 'saving') return;
    setSave({ status: 'saving' });
    const outcome = await saveToPhotos(file.uri);
    if (outcome.kind === 'saved') haptics.success();
    else if (outcome.kind !== 'unavailable') haptics.error();
    setSave({ status: 'done', outcome });
  }, [file, save.status]);

  const shareCopy = useCallback(async () => {
    if (!file || share.status === 'sharing') return;
    setShare({ status: 'sharing' });
    const outcome = await shareFile(file.uri, file.format);
    setShare({ status: 'done', outcome });
  }, [file, share.status]);

  return { save, share, saveCopy, shareCopy, openAppSettings };
}
