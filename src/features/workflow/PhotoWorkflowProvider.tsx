import { InteractionManager } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import {
  findPhoto,
  initialWorkflowState,
  routeForSelection,
  workflowReducer,
  type WorkflowError,
} from './workflowState';

import { pickPhotos, type PickPhotosResult } from '@/services/PhotoLibraryService';
import { temporaryFileService } from '@/services/TemporaryFileService';
import type { CleanResult } from '@/types/metadata';
import type { WorkSession, WorkflowKind, WorkflowPhoto } from '@/types/workflow';

/** Where the app should go after a successful pick (null = cancelled or failed). */
export type PickRoute = { kind: 'single'; photoId: string } | { kind: 'batch' } | null;

export interface PhotoWorkflowContextValue {
  photos: WorkflowPhoto[];
  kind: WorkflowKind | null;
  isPicking: boolean;
  skippedCount: number;
  error: WorkflowError;
  /** Opens the picker, replaces the current selection, and returns the route to take. */
  choosePhotos(options: { allowsMultiple: boolean }): Promise<PickRoute>;
  getPhoto(id: string | undefined): WorkflowPhoto | null;
  /** Current session (working-copy directory), needed to place outputs. */
  session: WorkSession | null;
  /** Verified clean copies produced in this session, by photo id. */
  getCleanResult(photoId: string | undefined): CleanResult | null;
  setCleanResult(photoId: string, result: CleanResult): void;
  /** Ends the workflow and deletes the working copies and outputs. */
  clear(): void;
  dismissError(): void;
}

const PhotoWorkflowContext = createContext<PhotoWorkflowContextValue | null>(null);

interface Props {
  children: ReactNode;
  /** Test seam. */
  pick?: typeof pickPhotos;
}

export function PhotoWorkflowProvider({ children, pick = pickPhotos }: Props) {
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState);
  const [cleanResults, setCleanResults] = useState<Record<string, CleanResult>>({});

  // Sweep working copies left behind by a previous run (crash, force quit).
  // Deferred so it never competes with first render and the entitlement check.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      temporaryFileService.cleanupStale();
    });
    return () => task.cancel();
  }, []);

  const choosePhotos = useCallback(
    async ({ allowsMultiple }: { allowsMultiple: boolean }): Promise<PickRoute> => {
      dispatch({ type: 'pickStarted' });
      const previous = state.session;
      let session: WorkSession;
      try {
        session = temporaryFileService.createSession();
      } catch {
        dispatch({ type: 'pickFailed' });
        return null;
      }

      const result: PickPhotosResult = await pick({ allowsMultiple, session });

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

      const kind = routeForSelection(result.photos.length) ?? 'single';
      setCleanResults({});
      dispatch({ type: 'picked', session, photos: result.photos, kind, skippedCount: result.failedCount });
      if (previous) temporaryFileService.deleteSession(previous);
      return kind === 'single' ? { kind, photoId: result.photos[0].id } : { kind };
    },
    [pick, state.session],
  );

  const clear = useCallback(() => {
    if (state.session) temporaryFileService.deleteSession(state.session);
    setCleanResults({});
    dispatch({ type: 'cleared' });
  }, [state.session]);

  const setCleanResult = useCallback((photoId: string, result: CleanResult) => {
    setCleanResults((current) => ({ ...current, [photoId]: result }));
  }, []);

  const dismissError = useCallback(() => dispatch({ type: 'errorDismissed' }), []);

  const value = useMemo<PhotoWorkflowContextValue>(
    () => ({
      photos: state.photos,
      kind: state.kind,
      isPicking: state.isPicking,
      skippedCount: state.skippedCount,
      error: state.error,
      choosePhotos,
      getPhoto: (id) => findPhoto(state, id),
      session: state.session,
      getCleanResult: (photoId) => (photoId ? (cleanResults[photoId] ?? null) : null),
      setCleanResult,
      clear,
      dismissError,
    }),
    [state, cleanResults, choosePhotos, setCleanResult, clear, dismissError],
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
