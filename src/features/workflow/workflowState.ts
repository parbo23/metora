import type { WorkSession, WorkflowKind, WorkflowPhoto } from '@/types/workflow';

/**
 * Pure state for the temporary photo workflow. Holds file references only;
 * no metadata is ever kept here.
 */
export type WorkflowError = 'unreadable' | null;

export interface WorkflowState {
  session: WorkSession | null;
  photos: WorkflowPhoto[];
  kind: WorkflowKind | null;
  isPicking: boolean;
  /** Photos that could not be brought into the workflow during the last pick. */
  skippedCount: number;
  error: WorkflowError;
}

export type WorkflowAction =
  | { type: 'pickStarted' }
  | { type: 'pickCancelled' }
  | { type: 'pickFailed' }
  | {
      type: 'picked';
      session: WorkSession;
      photos: WorkflowPhoto[];
      kind: WorkflowKind;
      skippedCount: number;
    }
  | { type: 'cleared' }
  | { type: 'errorDismissed' };

export const initialWorkflowState: WorkflowState = {
  session: null,
  photos: [],
  kind: null,
  isPicking: false,
  skippedCount: 0,
  error: null,
};

/** Spec: one photo goes to Metadata Detail, more than one goes to Batch. */
export function routeForSelection(count: number): WorkflowKind | null {
  if (count <= 0) return null;
  return count === 1 ? 'single' : 'batch';
}

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'pickStarted':
      return { ...state, isPicking: true, error: null };
    case 'pickCancelled':
      return { ...state, isPicking: false };
    case 'pickFailed':
      return { ...state, isPicking: false, error: 'unreadable' };
    case 'picked':
      return {
        session: action.session,
        photos: action.photos,
        kind: action.kind,
        isPicking: false,
        skippedCount: action.skippedCount,
        error: null,
      };
    case 'cleared':
      return { ...initialWorkflowState };
    case 'errorDismissed':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function findPhoto(state: WorkflowState, id: string | undefined): WorkflowPhoto | null {
  if (!id) return null;
  return state.photos.find((photo) => photo.id === id) ?? null;
}
