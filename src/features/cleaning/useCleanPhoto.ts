import { useCallback, useRef, useState } from 'react';

import { photoCleaningService, type CleanOutcome } from '@/services/PhotoCleaningService';
import type { CleanRequest, CleanTarget } from '@/types/metadata';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';
import { haptics } from '@/utils/haptics';

/** Screen-facing state for one clean attempt. */
export type CleanPhase =
  | { status: 'idle' }
  | { status: 'cleaning' }
  | { status: 'verifying' }
  | { status: 'done'; outcome: Extract<CleanOutcome, { kind: 'cleaned' }> }
  | { status: 'failed'; outcome: Exclude<CleanOutcome, { kind: 'cleaned' }> };

/**
 * Runs the clean pipeline for a photo and reports progress. The heavy work is
 * byte manipulation on the JS thread; it is yielded between the read/rewrite
 * and verify steps so the progress text can repaint.
 */
export function useCleanPhoto(service = photoCleaningService) {
  const [phase, setPhase] = useState<CleanPhase>({ status: 'idle' });
  const running = useRef(false);

  const run = useCallback(
    async (photo: WorkflowPhoto, target: CleanTarget | CleanRequest, session: WorkSession) => {
      if (running.current) return null;
      running.current = true;
      setPhase({ status: 'cleaning' });
      await nextFrame();
      try {
        const outcome = await service.clean(photo, target, session, {
          onVerifying: () => setPhase({ status: 'verifying' }),
        });
        if (outcome.kind === 'cleaned') {
          haptics.success();
          setPhase({ status: 'done', outcome });
        } else {
          haptics.error();
          setPhase({ status: 'failed', outcome });
        }
        return outcome;
      } catch {
        const outcome = { kind: 'processingFailed' as const };
        setPhase({ status: 'failed', outcome });
        return outcome;
      } finally {
        running.current = false;
      }
    },
    [service],
  );

  const reset = useCallback(() => setPhase({ status: 'idle' }), []);

  return { phase, run, reset };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
