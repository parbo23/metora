import type { CleanOutcome } from '@/services/PhotoCleaningService';
import type { SaveOutcome } from '@/services/PhotoSaveService';
import type { CleanMode, CleanResult } from '@/types/metadata';
import type { WorkflowPhoto } from '@/types/workflow';

/**
 * Pure state for the batch flow. Items are processed one at a time; every
 * item ends as either a verified clean copy or a named failure. Retry only
 * re-runs failed items.
 */
export type BatchItemStatus =
  | { kind: 'pending' }
  | { kind: 'cleaning' }
  | { kind: 'verifying' }
  | { kind: 'cleaned'; result: CleanResult }
  | { kind: 'failed'; outcome: Exclude<CleanOutcome, { kind: 'cleaned' }> };

export interface BatchItem {
  photo: WorkflowPhoto;
  status: BatchItemStatus;
  /** Set once the clean copy was added to Photos. */
  save?: SaveOutcome;
}

export type BatchPhase = 'selecting' | 'processing' | 'done';
export type BatchSavePhase = 'idle' | 'saving' | 'done';

export interface BatchState {
  phase: BatchPhase;
  mode: CleanMode;
  items: BatchItem[];
  savePhase: BatchSavePhase;
}

export type BatchAction =
  | { type: 'reset'; photos: WorkflowPhoto[]; mode: CleanMode }
  | { type: 'modeChanged'; mode: CleanMode }
  | { type: 'started' }
  | { type: 'itemCleaning'; id: string }
  | { type: 'itemVerifying'; id: string }
  | { type: 'itemFinished'; id: string; outcome: CleanOutcome }
  | { type: 'finished' }
  | { type: 'retryFailed' }
  | { type: 'saveStarted' }
  | { type: 'itemSaved'; id: string; outcome: SaveOutcome }
  | { type: 'saveFinished' };

export function initialBatchState(photos: WorkflowPhoto[], mode: CleanMode): BatchState {
  return {
    phase: 'selecting',
    mode,
    items: photos.map((photo) => ({ photo, status: { kind: 'pending' } })),
    savePhase: 'idle',
  };
}

function updateItem(state: BatchState, id: string, update: (item: BatchItem) => BatchItem): BatchState {
  return { ...state, items: state.items.map((item) => (item.photo.id === id ? update(item) : item)) };
}

export function batchReducer(state: BatchState, action: BatchAction): BatchState {
  switch (action.type) {
    case 'reset':
      return initialBatchState(action.photos, action.mode);
    case 'modeChanged':
      return state.phase === 'selecting' ? { ...state, mode: action.mode } : state;
    case 'started':
      return { ...state, phase: 'processing', savePhase: 'idle' };
    case 'itemCleaning':
      return updateItem(state, action.id, (item) => ({ ...item, status: { kind: 'cleaning' } }));
    case 'itemVerifying':
      return updateItem(state, action.id, (item) => ({ ...item, status: { kind: 'verifying' } }));
    case 'itemFinished':
      return updateItem(state, action.id, (item) => ({
        ...item,
        status:
          action.outcome.kind === 'cleaned'
            ? { kind: 'cleaned', result: action.outcome.result }
            : { kind: 'failed', outcome: action.outcome },
      }));
    case 'finished':
      return { ...state, phase: 'done' };
    case 'retryFailed':
      return {
        ...state,
        phase: 'processing',
        items: state.items.map((item) =>
          item.status.kind === 'failed' ? { ...item, status: { kind: 'pending' } } : item,
        ),
      };
    case 'saveStarted':
      return { ...state, savePhase: 'saving' };
    case 'itemSaved':
      return updateItem(state, action.id, (item) => ({ ...item, save: action.outcome }));
    case 'saveFinished':
      return { ...state, savePhase: 'done' };
    default:
      return state;
  }
}

export interface BatchSummary {
  total: number;
  cleaned: number;
  failed: number;
  pending: number;
  /** Items finished so far (cleaned or failed). */
  completed: number;
  /** 1-based index of the item being processed, for "Cleaning 4 of 12". */
  currentIndex: number;
}

export function summarize(state: BatchState): BatchSummary {
  const total = state.items.length;
  const cleaned = state.items.filter((i) => i.status.kind === 'cleaned').length;
  const failed = state.items.filter((i) => i.status.kind === 'failed').length;
  const pending = state.items.filter((i) => i.status.kind === 'pending').length;
  const completed = cleaned + failed;
  return { total, cleaned, failed, pending, completed, currentIndex: Math.min(completed + 1, total) };
}

export function pendingItems(state: BatchState): BatchItem[] {
  return state.items.filter((item) => item.status.kind === 'pending');
}

export function cleanedItems(
  state: BatchState,
): (BatchItem & { status: Extract<BatchItemStatus, { kind: 'cleaned' }> })[] {
  return state.items.filter(
    (item): item is BatchItem & { status: Extract<BatchItemStatus, { kind: 'cleaned' }> } =>
      item.status.kind === 'cleaned',
  );
}

export function failedItems(
  state: BatchState,
): (BatchItem & { status: Extract<BatchItemStatus, { kind: 'failed' }> })[] {
  return state.items.filter(
    (item): item is BatchItem & { status: Extract<BatchItemStatus, { kind: 'failed' }> } =>
      item.status.kind === 'failed',
  );
}

export interface SaveSummary {
  saved: number;
  denied: number;
  failed: number;
  unavailable: number;
  attempted: number;
}

export function summarizeSaves(state: BatchState): SaveSummary {
  const outcomes = state.items.map((i) => i.save).filter((s): s is SaveOutcome => Boolean(s));
  return {
    saved: outcomes.filter((o) => o.kind === 'saved').length,
    denied: outcomes.filter((o) => o.kind === 'denied').length,
    failed: outcomes.filter((o) => o.kind === 'failed').length,
    unavailable: outcomes.filter((o) => o.kind === 'unavailable').length,
    attempted: outcomes.length,
  };
}
