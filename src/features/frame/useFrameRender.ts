import { useEffect, useState } from 'react';

import { renderClassicFrame, type RenderedFrame, type RenderOutcome } from './renderFrame';

import type { FrameText } from '@/features/shotinfo/format';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

export type FrameRenderState =
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'ready'; frame: RenderedFrame }
  | { status: 'unavailable' }
  | { status: 'failed' };

/** "IMG_0421.HEIC" → "IMG_0421-framed.jpg" */
export function framedFileName(displayName: string): string {
  const stem = displayName.replace(/\.[a-zA-Z0-9]+$/, '') || 'photo';
  return `${stem}-framed.jpg`;
}

/**
 * Renders the frame once the camera info is known. The same full-resolution
 * file is shown as the preview and later saved or shared, so what the user
 * sees is exactly what gets exported.
 */
export function useFrameRender(
  photo: WorkflowPhoto | null,
  session: WorkSession | null,
  text: FrameText | null,
  render: typeof renderClassicFrame = renderClassicFrame,
): FrameRenderState {
  const [state, setState] = useState<{ key: string; value: FrameRenderState } | null>(null);
  const key = photo && text ? `${photo.id}:${text.title ?? ''}|${text.settings ?? ''}|${text.date ?? ''}` : null;

  useEffect(() => {
    if (!photo || !session || !text || !key) return;
    let cancelled = false;
    render({
      sourceUri: photo.uri,
      lines: { title: text.title, settings: text.settings, date: text.date },
      session,
      fileName: framedFileName(photo.displayName),
    }).then((outcome: RenderOutcome) => {
      if (cancelled) return;
      setState({
        key,
        value:
          outcome.kind === 'rendered'
            ? { status: 'ready', frame: outcome.frame }
            : outcome.kind === 'unavailable'
              ? { status: 'unavailable' }
              : { status: 'failed' },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [photo, session, text, key, render]);

  if (!key) return { status: 'idle' };
  if (state && state.key === key) return state.value;
  return { status: 'rendering' };
}
