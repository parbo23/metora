import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

/**
 * Pure state for the temporary single-photo workflow. Holds file references
 * only; no camera info is ever kept here.
 */
export type WorkflowError = 'unreadable' | null;

export interface WorkflowState {
  session: WorkSession | null;
  photo: WorkflowPhoto | null;
  isPicking: boolean;
  error: WorkflowError;
}

export type WorkflowAction =
  | { type: 'pickStarted' }
  | { type: 'pickCancelled' }
  | { type: 'pickFailed' }
  | { type: 'picked'; session: WorkSession; photo: WorkflowPhoto }
  | { type: 'cleared' }
  | { type: 'errorDismissed' };

export const initialWorkflowState: WorkflowState = {
  session: null,
  photo: null,
  isPicking: false,
  error: null,
};

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'pickStarted':
      return { ...state, isPicking: true, error: null };
    case 'pickCancelled':
      return { ...state, isPicking: false };
    case 'pickFailed':
      return { ...state, isPicking: false, error: 'unreadable' };
    case 'picked':
      return { session: action.session, photo: action.photo, isPicking: false, error: null };
    case 'cleared':
      return { ...initialWorkflowState };
    case 'errorDismissed':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function findPhoto(state: WorkflowState, id: string | undefined): WorkflowPhoto | null {
  if (!id || !state.photo || state.photo.id !== id) return null;
  return state.photo;
}
