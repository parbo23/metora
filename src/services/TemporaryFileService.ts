import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { WorkSession } from '@/types/workflow';

/** Sessions older than this are removed on launch. */
export const STALE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const ROOT_DIRECTORY_NAME = 'metora-work';

/** Characters allowed in a working-copy file name. Everything else becomes "_". */
export function sanitizeFileName(name: string, fallback = 'photo'): string {
  const trimmed = name
    .trim()
    .replace(/[^\w.\-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safe = trimmed.length > 0 ? trimmed : fallback;
  return safe.length > 120 ? safe.slice(-120) : safe;
}

/** Pure staleness rule, exported for tests. */
export function isStale(
  entry: { creationTime?: number | null; modificationTime?: number | null },
  now: number,
  maxAgeMs: number = STALE_SESSION_MAX_AGE_MS,
): boolean {
  const stamp = entry.creationTime ?? entry.modificationTime;
  if (stamp === null || stamp === undefined) return true;
  return now - stamp > maxAgeMs;
}

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Manages working copies of selected photos inside the app cache directory
 * (`<cache>/metora-work/<session>/`). Everything here is temporary: sessions
 * are deleted when the workflow ends, and stale ones are swept at launch.
 *
 * Not available on web, where the picker URI is used directly.
 */
export class TemporaryFileService {
  readonly isSupported = Platform.OS !== 'web';

  private get root(): Directory {
    return new Directory(Paths.cache, ROOT_DIRECTORY_NAME);
  }

  createSession(): WorkSession {
    const id = newSessionId();
    if (!this.isSupported) {
      return { id, directoryUri: '' };
    }
    const directory = new Directory(this.root, id);
    directory.create({ intermediates: true, idempotent: true });
    return { id, directoryUri: directory.uri };
  }

  /**
   * Copies `sourceUri` into the session directory under a sanitized, unique
   * name and returns the working copy. The source is never modified.
   */
  async importFile(sourceUri: string, session: WorkSession, preferredName: string): Promise<File> {
    const directory = new Directory(session.directoryUri);
    const source = new File(sourceUri);
    const name = sanitizeFileName(preferredName, source.name || 'photo');
    let destination = new File(directory, name);
    let attempt = 1;
    while (destination.exists) {
      const dot = name.lastIndexOf('.');
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      destination = new File(directory, `${stem}-${attempt}${ext}`);
      attempt += 1;
    }
    await source.copy(destination);
    return destination;
  }

  deleteSession(session: WorkSession): void {
    if (!this.isSupported || !session.directoryUri) return;
    try {
      const directory = new Directory(session.directoryUri);
      if (directory.exists) directory.delete();
    } catch {
      // Best effort; a stale sweep will pick it up later.
    }
  }

  /** Removes session directories older than `maxAgeMs`. Returns how many were deleted. */
  cleanupStale(now: number = Date.now(), maxAgeMs: number = STALE_SESSION_MAX_AGE_MS): number {
    if (!this.isSupported) return 0;
    let removed = 0;
    try {
      const root = this.root;
      if (!root.exists) return 0;
      for (const entry of root.list()) {
        try {
          if (isStale(entry.info(), now, maxAgeMs)) {
            entry.delete();
            removed += 1;
          }
        } catch {
          // Skip entries we cannot inspect.
        }
      }
    } catch {
      // Cache directory unavailable; nothing to clean.
    }
    return removed;
  }
}

export const temporaryFileService = new TemporaryFileService();
