/**
 * Temporary workflow model: what the user picked, where its working copy
 * lives, and nothing else. No EXIF or GPS is stored here; metadata is read on
 * demand in the inspection step (Phase 4) and never persisted.
 */
export interface WorkflowPhoto {
  /** Stable id for routing (`/photo/[id]`). */
  id: string;
  /** file:// URI of the working copy in app cache (or the picker URI on web). */
  uri: string;
  /** Sanitized name shown in the UI, e.g. "IMG_0421.HEIC". */
  displayName: string;
  /** Lower-case extension without the dot, e.g. "heic". */
  extension: string;
  mimeType?: string;
  width: number;
  height: number;
  fileSize?: number;
  addedAt: number;
}

export type WorkflowKind = 'single' | 'batch';

export interface WorkSession {
  id: string;
  /** file:// URI of the session directory holding working copies. */
  directoryUri: string;
}
