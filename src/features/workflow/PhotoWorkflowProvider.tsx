import { InteractionManager } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { findPhoto, initialWorkflowState, workflowReducer, type WorkflowError } from './workflowState';

import { pickPhoto, type PickPhotoResult } from '@/services/PhotoLibraryService';
import { temporaryFileService } from '@/services/TemporaryFileService';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

export interface PhotoWorkflowContextValue {
  photo: WorkflowPhoto | null;
  isPicking: boolean;
  error: WorkflowError;
  /** Opens the picker, replaces the current photo, and returns it (null = cancelled or failed). */
  choosePhoto(): Promise<WorkflowPhoto | null>;
  getPhoto(id: string | undefined): WorkflowPhoto | null;
  /** Current session (working-copy directory), needed to place outputs. */
  session: WorkSession | null;
  /** Ends the workflow and deletes the working copy and outputs. */
  clear(): void;
  dismissError(): void;
}

const PhotoWorkflowContext = createContext<PhotoWorkflowContextValue | null>(null);

interface Props {
  children: ReactNode;
  /** Test seam. */
  pick?: typeof pickPhoto;
}

export function PhotoWorkflowProvider({ children, pick = pickPhoto }: Props) {
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState);

  // Sweep working copies left behind by a previous run (crash, force quit).
  // Deferred so it never competes with first render.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      temporaryFileService.cleanupStale();
    });
    return () => task.cancel();
  }, []);

  const choosePhoto = useCallback(async (): Promise<WorkflowPhoto | null> => {
    dispatch({ type: 'pickStarted' });
    const previous = state.session;
    let session: WorkSession;
    try {
      session = temporaryFileService.createSession();
    } catch {
      dispatch({ type: 'pickFailed' });
      return null;
    }

    const result: PickPhotoResult = await pick({ session });

    if (result.kind === 'cancelled') {
      temporaryFileService.deleteSession(session);
      dispatch({ type: 'pickCancelled' });
      return null;
    }
    if (result.kind === 'failed') {
      temporaryFileService.deleteSession(session);
      dispatch({ type: 'pickFailed' });
      return null;
    }

    dispatch({ type: 'picked', session, photo: result.photo });
    if (previous) temporaryFileService.deleteSession(previous);
    return result.photo;
  }, [pick, state.session]);

  const clear = useCallback(() => {
    if (state.session) temporaryFileService.deleteSession(state.session);
    dispatch({ type: 'cleared' });
  }, [state.session]);

  const dismissError = useCallback(() => dispatch({ type: 'errorDismissed' }), []);

  const value = useMemo<PhotoWorkflowContextValue>(
    () => ({
      photo: state.photo,
      isPicking: state.isPicking,
      error: state.error,
      choosePhoto,
      getPhoto: (id) => findPhoto(state, id),
      session: state.session,
      clear,
      dismissError,
    }),
    [state, choosePhoto, clear, dismissError],
  );

  return <PhotoWorkflowContext.Provider value={value}>{children}</PhotoWorkflowContext.Provider>;
}

export function usePhotoWorkflow(): PhotoWorkflowContextValue {
  const context = useContext(PhotoWorkflowContext);
  if (!context) {
    throw new Error('usePhotoWorkflow must be used inside PhotoWorkflowProvider');
  }
  return context;
}
