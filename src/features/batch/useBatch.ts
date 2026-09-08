import { useCallback, useEffect, useReducer, useRef } from 'react';

import { runBatch, saveAll } from './batchRunner';
import {
  batchReducer,
  cleanedItems,
  initialBatchState,
  pendingItems,
  summarize,
  type BatchState,
} from './batchState';

import { defaultCleanMode } from '@/features/cleaning/cleanModes';
import { useRecentHistory } from '@/features/recent/RecentHistoryProvider';
import { photoCleaningService } from '@/services/PhotoCleaningService';
import { saveToPhotos } from '@/services/PhotoSaveService';
import type { CleanMode } from '@/types/metadata';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';
import { haptics } from '@/utils/haptics';

/**
 * Batch flow controller. Rebuilds its item list whenever the selection
 * changes, processes sequentially, and exposes retry + save-all.
 */
export function useBatch(photos: WorkflowPhoto[], session: WorkSession | null) {
  const [state, dispatch] = useReducer(batchReducer, undefined, () =>
    initialBatchState(photos, defaultCleanMode),
  );
  const running = useRef(false);
  const cancelled = useRef(false);
  const { record } = useRecentHistory();

  // New selection → fresh batch.
  const photoKey = photos.map((p) => p.id).join('|');
  const lastKey = useRef(photoKey);
  useEffect(() => {
    if (lastKey.current !== photoKey) {
      lastKey.current = photoKey;
      cancelled.current = true;
      dispatch({ type: 'reset', photos, mode: defaultCleanMode });
    }
  }, [photoKey, photos]);

  useEffect(() => {
    return () => {
      cancelled.current = true;
    };
  }, []);

  const start = useCallback(
    async (current: BatchState) => {
      if (!session || running.current) return;
      running.current = true;
      cancelled.current = false;
      const items = pendingItems(current);
      dispatch(current.phase === 'done' ? { type: 'retryFailed' } : { type: 'started' });
      try {
        await runBatch({
          items,
          mode: current.mode,
          session,
          cleaner: photoCleaningService,
          dispatch,
          isCancelled: () => cancelled.current,
        });
      } finally {
        running.current = false;
      }
    },
    [session],
  );

  const setMode = useCallback((mode: CleanMode) => {
    haptics.selection();
    dispatch({ type: 'modeChanged', mode });
  }, []);

  const clean = useCallback(() => start(state), [start, state]);
  const retryFailed = useCallback(() => start(state), [start, state]);

  const saveAllCopies = useCallback(async () => {
    if (state.savePhase === 'saving') return;
    await saveAll({ items: state.items, save: saveToPhotos, dispatch });
  }, [state.items, state.savePhase]);

  // Completion: haptic + one sanitized activity-log entry per run (or retry).
  const lastPhase = useRef(state.phase);
  useEffect(() => {
    if (lastPhase.current !== 'done' && state.phase === 'done') {
      const { failed, cleaned } = summarize(state);
      if (failed === 0) haptics.success();
      else haptics.error();
      void record({
        mode: state.mode,
        cleanedCount: cleaned,
        failedCount: failed,
        fileTypes: cleanedItems(state).map((item) => item.status.result.outputFormat),
      });
    }
    lastPhase.current = state.phase;
  }, [state, record]);

  return { state, summary: summarize(state), setMode, clean, retryFailed, saveAllCopies };
}
