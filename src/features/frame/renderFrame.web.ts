import type { RenderInput, RenderOutcome } from './renderFrame';

export type { RenderedFrame, RenderInput, RenderOutcome } from './renderFrame';

/**
 * Web preview only: the full-resolution Skia renderer needs CanvasKit, which
 * the Windows preview does not load. The preview screen shows the text lines
 * instead and export stays unavailable, like saving to Photos.
 */
export async function renderClassicFrame(_input: RenderInput): Promise<RenderOutcome> {
  return { kind: 'unavailable' };
}
