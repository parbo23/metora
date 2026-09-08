import type { BatchAction, BatchItem } from './batchState';

import type { CleanOutcome } from '@/services/PhotoCleaningService';
import type { SaveOutcome } from '@/services/PhotoSaveService';
import type { CleanMode } from '@/types/metadata';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

export interface BatchCleaner {
  clean(
    photo: WorkflowPhoto,
    mode: CleanMode,
    session: WorkSession,
    progress?: { onVerifying?: () => void },
  ): Promise<CleanOutcome>;
}

interface RunOptions {
  items: BatchItem[];
  mode: CleanMode;
  session: WorkSession;
  cleaner: BatchCleaner;
  dispatch: (action: BatchAction) => void;
  /** Return true to stop before the next item (e.g. the screen went away). */
  isCancelled?: () => boolean;
  /** Lets the UI repaint between items. */
  yieldToUi?: () => Promise<void>;
}

const defaultYield = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Processes items strictly one after another. Each item is read, rewritten,
 * written and verified before the next one starts, so only one photo's bytes
 * are in memory at a time. Every item ends as cleaned or failed; a failure
 * never stops the rest of the batch.
 */
export async function runBatch({
  items,
  mode,
  session,
  cleaner,
  dispatch,
  isCancelled = () => false,
  yieldToUi = defaultYield,
}: RunOptions): Promise<void> {
  for (const item of items) {
    if (isCancelled()) return;
    const id = item.photo.id;
    dispatch({ type: 'itemCleaning', id });
    await yieldToUi();
    let outcome: CleanOutcome;
    try {
      outcome = await cleaner.clean(item.photo, mode, session, {
        onVerifying: () => dispatch({ type: 'itemVerifying', id }),
      });
    } catch {
      outcome = { kind: 'processingFailed' };
    }
    dispatch({ type: 'itemFinished', id, outcome });
  }
  if (!isCancelled()) dispatch({ type: 'finished' });
}

interface SaveAllOptions {
  items: BatchItem[];
  save: (uri: string) => Promise<SaveOutcome>;
  dispatch: (action: BatchAction) => void;
  yieldToUi?: () => Promise<void>;
}

/**
 * Saves every verified clean copy, one at a time. Stops asking after the
 * first denial: the remaining items are marked denied without re-prompting.
 */
export async function saveAll({
  items,
  save,
  dispatch,
  yieldToUi = defaultYield,
}: SaveAllOptions): Promise<void> {
  dispatch({ type: 'saveStarted' });
  let denied: SaveOutcome | null = null;
  for (const item of items) {
    if (item.status.kind !== 'cleaned') continue;
    if (denied) {
      dispatch({ type: 'itemSaved', id: item.photo.id, outcome: denied });
      continue;
    }
    const outcome = await save(item.status.result.outputUri);
    if (outcome.kind === 'denied' || outcome.kind === 'unavailable') denied = outcome;
    dispatch({ type: 'itemSaved', id: item.photo.id, outcome });
    await yieldToUi();
  }
  dispatch({ type: 'saveFinished' });
}
