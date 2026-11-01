/**
 * Temporary workflow model: the photo the user picked, where its working copy
 * lives, and nothing else. Camera info is read on demand from the working
 * copy's bytes and never stored here.
 */
export interface WorkflowPhoto {
  /** Stable id for routing. */
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

export interface WorkSession {
  id: string;
  /** file:// URI of the session directory holding the working copy and outputs. */
  directoryUri: string;
}
