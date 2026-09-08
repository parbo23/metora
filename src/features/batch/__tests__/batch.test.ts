import { runBatch, saveAll, type BatchCleaner } from '../batchRunner';
import {
  batchReducer,
  cleanedItems,
  failedItems,
  initialBatchState,
  pendingItems,
  summarize,
  summarizeSaves,
  type BatchAction,
  type BatchState,
} from '../batchState';

import type { CleanOutcome } from '@/services/PhotoCleaningService';
import type { CleanResult, ImageFileInfo } from '@/types/metadata';
import type { WorkflowPhoto } from '@/types/workflow';

jest.mock('expo-file-system', () => ({
  __esModule: true,
  File: class {},
  Directory: class {},
  Paths: { cache: {} },
}));

const photo = (id: string): WorkflowPhoto => ({
  id,
  uri: `file:///work/${id}.jpg`,
  displayName: `${id}.jpg`,
  extension: 'jpg',
  width: 10,
  height: 10,
  addedAt: 0,
});
const session = { id: 's', directoryUri: 'file:///work/' };

const fileInfo: ImageFileInfo = {
  format: 'jpeg',
  byteLength: 1000,
  width: 10,
  height: 10,
  displayWidth: 10,
  displayHeight: 10,
  orientation: null,
};

const cleanedResult = (id: string): CleanResult => ({
  outputUri: `file:///work/${id}-clean.jpg`,
  originalUri: `file:///work/${id}.jpg`,
  verified: true,
  mode: 'all',
  removedCategories: ['location'],
  originalCategories: ['location'],
  keptCategories: [],
  outputFormat: 'jpeg',
  outputDisplayName: `${id}-clean.jpg`,
  alreadyClean: false,
  originalInfo: fileInfo,
  outputInfo: fileInfo,
});

function reduceAll(state: BatchState, actions: BatchAction[]): BatchState {
  return actions.reduce(batchReducer, state);
}

describe('batchReducer', () => {
  const start = initialBatchState([photo('a'), photo('b'), photo('c')], 'all');

  it('starts with every item pending and the default mode', () => {
    expect(summarize(start)).toEqual({
      total: 3,
      cleaned: 0,
      failed: 0,
      pending: 3,
      completed: 0,
      currentIndex: 1,
    });
    expect(start.mode).toBe('all');
  });

  it('only changes mode while selecting', () => {
    expect(batchReducer(start, { type: 'modeChanged', mode: 'location' }).mode).toBe('location');
    const processing = batchReducer(start, { type: 'started' });
    expect(batchReducer(processing, { type: 'modeChanged', mode: 'location' }).mode).toBe('all');
  });

  it('tracks progress and produces the summary counts', () => {
    const state = reduceAll(start, [
      { type: 'started' },
      { type: 'itemCleaning', id: 'a' },
      { type: 'itemVerifying', id: 'a' },
      { type: 'itemFinished', id: 'a', outcome: { kind: 'cleaned', result: cleanedResult('a') } },
      { type: 'itemCleaning', id: 'b' },
      { type: 'itemFinished', id: 'b', outcome: { kind: 'verificationFailed', remaining: ['location'] } },
    ]);
    expect(summarize(state)).toEqual({
      total: 3,
      cleaned: 1,
      failed: 1,
      pending: 1,
      completed: 2,
      currentIndex: 3,
    });
    expect(state.phase).toBe('processing');
    const done = batchReducer(state, { type: 'finished' });
    expect(done.phase).toBe('done');
    expect(failedItems(done).map((i) => i.photo.id)).toEqual(['b']);
    expect(cleanedItems(done).map((i) => i.photo.id)).toEqual(['a']);
  });

  it('retry resets only the failed items', () => {
    const done = reduceAll(start, [
      { type: 'started' },
      { type: 'itemFinished', id: 'a', outcome: { kind: 'cleaned', result: cleanedResult('a') } },
      { type: 'itemFinished', id: 'b', outcome: { kind: 'processingFailed' } },
      { type: 'itemFinished', id: 'c', outcome: { kind: 'unsupported', format: 'webp' } },
      { type: 'finished' },
    ]);
    const retry = batchReducer(done, { type: 'retryFailed' });
    expect(retry.phase).toBe('processing');
    expect(pendingItems(retry).map((i) => i.photo.id)).toEqual(['b', 'c']);
    expect(cleanedItems(retry)).toHaveLength(1);
  });

  it('records save outcomes per item', () => {
    const state = reduceAll(start, [
      { type: 'saveStarted' },
      { type: 'itemSaved', id: 'a', outcome: { kind: 'saved' } },
      { type: 'itemSaved', id: 'b', outcome: { kind: 'failed' } },
      { type: 'saveFinished' },
    ]);
    expect(state.savePhase).toBe('done');
    expect(summarizeSaves(state)).toEqual({ saved: 1, denied: 0, failed: 1, unavailable: 0, attempted: 2 });
  });

  it('reset replaces the item list', () => {
    const state = batchReducer(start, { type: 'reset', photos: [photo('z')], mode: 'location' });
    expect(state.items.map((i) => i.photo.id)).toEqual(['z']);
    expect(state.mode).toBe('location');
    expect(state.phase).toBe('selecting');
  });
});

describe('runBatch', () => {
  function fakeCleaner(outcomes: Record<string, CleanOutcome | Error>): BatchCleaner & { order: string[] } {
    const order: string[] = [];
    return {
      order,
      async clean(p, _mode, _session, progress) {
        order.push(p.id);
        progress?.onVerifying?.();
        const outcome = outcomes[p.id];
        if (outcome instanceof Error) throw outcome;
        return outcome;
      },
    };
  }

  it('processes items strictly in order, records every outcome and finishes', async () => {
    const cleaner = fakeCleaner({
      a: { kind: 'cleaned', result: cleanedResult('a') },
      b: { kind: 'verificationFailed', remaining: ['location'] },
      c: new Error('boom'),
    });
    let state = initialBatchState([photo('a'), photo('b'), photo('c')], 'all');
    const dispatch = (action: BatchAction) => {
      state = batchReducer(state, action);
    };
    dispatch({ type: 'started' });
    await runBatch({
      items: pendingItems(state),
      mode: 'all',
      session,
      cleaner,
      dispatch,
      yieldToUi: async () => {},
    });
    expect(cleaner.order).toEqual(['a', 'b', 'c']);
    expect(state.phase).toBe('done');
    expect(summarize(state)).toMatchObject({ cleaned: 1, failed: 2, pending: 0 });
    // An unexpected throw is a processing failure, not a crash.
    expect(failedItems(state).find((i) => i.photo.id === 'c')?.status.outcome).toEqual({
      kind: 'processingFailed',
    });
  });

  it('retry runs only the failed items and keeps earlier successes', async () => {
    let state = reduceAll(initialBatchState([photo('a'), photo('b')], 'all'), [
      { type: 'started' },
      { type: 'itemFinished', id: 'a', outcome: { kind: 'cleaned', result: cleanedResult('a') } },
      { type: 'itemFinished', id: 'b', outcome: { kind: 'processingFailed' } },
      { type: 'finished' },
    ]);
    const dispatch = (action: BatchAction) => {
      state = batchReducer(state, action);
    };
    dispatch({ type: 'retryFailed' });
    const cleaner = fakeCleaner({ b: { kind: 'cleaned', result: cleanedResult('b') } });
    await runBatch({
      items: pendingItems(state),
      mode: 'all',
      session,
      cleaner,
      dispatch,
      yieldToUi: async () => {},
    });
    expect(cleaner.order).toEqual(['b']);
    expect(summarize(state)).toMatchObject({ cleaned: 2, failed: 0 });
    expect(state.phase).toBe('done');
  });

  it('stops before the next item when cancelled and does not mark the batch done', async () => {
    let calls = 0;
    const cleaner: BatchCleaner = {
      async clean(p) {
        calls += 1;
        return { kind: 'cleaned', result: cleanedResult(p.id) };
      },
    };
    let state = initialBatchState([photo('a'), photo('b')], 'all');
    const dispatch = (action: BatchAction) => {
      state = batchReducer(state, action);
    };
    dispatch({ type: 'started' });
    await runBatch({
      items: pendingItems(state),
      mode: 'all',
      session,
      cleaner,
      dispatch,
      isCancelled: () => calls >= 1,
      yieldToUi: async () => {},
    });
    expect(calls).toBe(1);
    expect(state.phase).toBe('processing');
  });
});

describe('saveAll', () => {
  it('saves each cleaned copy and stops prompting after a denial', async () => {
    let state = reduceAll(initialBatchState([photo('a'), photo('b'), photo('c')], 'all'), [
      { type: 'itemFinished', id: 'a', outcome: { kind: 'cleaned', result: cleanedResult('a') } },
      { type: 'itemFinished', id: 'b', outcome: { kind: 'processingFailed' } },
      { type: 'itemFinished', id: 'c', outcome: { kind: 'cleaned', result: cleanedResult('c') } },
    ]);
    const dispatch = (action: BatchAction) => {
      state = batchReducer(state, action);
    };
    const save = jest.fn().mockResolvedValue({ kind: 'saved' });
    await saveAll({ items: state.items, save, dispatch, yieldToUi: async () => {} });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith('file:///work/a-clean.jpg');
    expect(summarizeSaves(state)).toMatchObject({ saved: 2, attempted: 2 });
    expect(state.savePhase).toBe('done');

    const denying = jest.fn().mockResolvedValue({ kind: 'denied', canAskAgain: false });
    await saveAll({ items: state.items, save: denying, dispatch, yieldToUi: async () => {} });
    expect(denying).toHaveBeenCalledTimes(1);
    expect(summarizeSaves(state)).toMatchObject({ denied: 2, saved: 0 });
  });
});
