import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  MetadataReadError,
  metadataService as defaultMetadataService,
  readFileBytes,
  type MetadataService,
} from './MetadataService';

import { toCleanRequest } from '@/features/cleaning/cleanModes';
import {
  CleanProcessingError,
  UnsupportedFormatError,
  cleanImageBytes,
  detectFormat,
  sniffUnsupportedFormat,
  type KnownUnsupportedFormat,
} from '@/features/cleaning/engine';
import { readImageInfo } from '@/features/cleaning/engine/imageInfo';
import type {
  CleanRequest,
  CleanResult,
  CleanTarget,
  MetadataCategory,
  OutputFormat,
} from '@/types/metadata';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';
import { devLog } from '@/utils/devLog';

/**
 * Every way a clean attempt can end. The UI distinguishes them:
 * - unsupported: the container is not JPEG/PNG/HEIC.
 * - unreadable: the working copy could not be read or parsed as an image.
 * - processingFailed: supported format, but its metadata blocks could not be
 *   rewritten safely (malformed EXIF/XMP/IPTC in a selective mode, etc.).
 * - verificationFailed: an output was produced but re-reading it still found
 *   promised categories. The output is deleted and never exposed.
 */
export type CleanOutcome =
  | { kind: 'cleaned'; result: CleanResult }
  | { kind: 'unsupported'; format: KnownUnsupportedFormat | 'unknown' }
  | { kind: 'unreadable' }
  | { kind: 'processingFailed' }
  | { kind: 'verificationFailed'; remaining: MetadataCategory[] };

export interface CleanFileSystem {
  readBytes(uri: string): Promise<ArrayBuffer>;
  /** Writes bytes to a new file in the session directory and returns its URI. */
  writeOutput(session: WorkSession, name: string, bytes: Uint8Array): Promise<string>;
  /** Copies the source verbatim to a new file and returns its URI. */
  copyOutput(session: WorkSession, sourceUri: string, name: string): Promise<string>;
  delete(uri: string): Promise<void>;
}

interface Dependencies {
  files: CleanFileSystem;
  metadata: MetadataService;
}

export function outputNameFor(displayName: string, format: OutputFormat): string {
  const dot = displayName.lastIndexOf('.');
  const stem = dot > 0 ? displayName.slice(0, dot) : displayName;
  const originalExt = dot > 0 ? displayName.slice(dot + 1).toLowerCase() : '';
  const ext =
    format === 'jpeg'
      ? originalExt === 'jpeg' || originalExt === 'jpg'
        ? originalExt
        : 'jpg'
      : format === 'heic'
        ? originalExt === 'heif'
          ? 'heif'
          : 'heic'
        : format === 'png'
          ? 'png'
          : originalExt || 'img';
  return `${stem}-clean.${ext}`;
}

/**
 * Creates a verified clean copy of a working copy. The original photo in the
 * library is never touched: the input is already Metora's own copy, and the
 * output is always a new file.
 */
export class PhotoCleaningService {
  private readonly files: CleanFileSystem;
  private readonly metadata: MetadataService;

  constructor({ files, metadata }: Partial<Dependencies> = {}) {
    this.files = files ?? nativeFileSystem;
    this.metadata = metadata ?? defaultMetadataService;
  }

  async clean(
    photo: WorkflowPhoto,
    target: CleanTarget | CleanRequest,
    session: WorkSession,
    progress: { onVerifying?: () => void } = {},
  ): Promise<CleanOutcome> {
    const request = toCleanRequest(target);
    const { mode } = request;
    // 1. Read the working copy once; inspect it from memory.
    let source: ArrayBuffer;
    try {
      source = await this.files.readBytes(photo.uri);
    } catch {
      return { kind: 'unreadable' };
    }
    const input = new Uint8Array(source);

    // A recognizable but unsupported container gets its own message; anything
    // else that is not JPEG/PNG/HEIC is treated as a file we cannot open.
    if (detectFormat(input) === 'unknown') {
      const known = sniffUnsupportedFormat(input);
      return known ? { kind: 'unsupported', format: known } : { kind: 'unreadable' };
    }

    let originalCategories: MetadataCategory[];
    try {
      originalCategories = this.metadata.inspectBytes(source).categories;
    } catch (error) {
      if (error instanceof MetadataReadError) return { kind: 'unreadable' };
      throw error;
    }

    const promised = request.categories;
    const removedCategories = promised.filter((c) => originalCategories.includes(c));
    const keptCategories = originalCategories.filter((c) => !promised.includes(c));

    // 2. Rewrite the container, or copy verbatim when there is nothing to remove.
    let outputBytes: Uint8Array | null = null;
    let format: OutputFormat;
    const alreadyClean = removedCategories.length === 0;
    try {
      if (alreadyClean) {
        const detected = cleanImageBytes(input, promised); // validates the container; removes nothing
        format = detected.format;
      } else {
        const cleaned = cleanImageBytes(input, promised);
        outputBytes = cleaned.bytes;
        format = cleaned.format;
      }
    } catch (error) {
      if (error instanceof UnsupportedFormatError) return { kind: 'unsupported', format: 'unknown' };
      if (error instanceof CleanProcessingError) {
        devLog('clean: processing failed', error.message);
        return { kind: 'processingFailed' };
      }
      throw error;
    }

    // 3. Write the output as a new file.
    const outputDisplayName = outputNameFor(photo.displayName, format);
    let outputUri: string;
    try {
      outputUri = outputBytes
        ? await this.files.writeOutput(session, outputDisplayName, outputBytes)
        : await this.files.copyOutput(session, photo.uri, outputDisplayName);
    } catch (error) {
      devLog('clean: write failed', error instanceof Error ? error.name : 'unknown');
      return { kind: 'processingFailed' };
    }

    // 4. Verify by re-reading the output from disk. Never trust the in-memory result.
    progress.onVerifying?.();
    await yieldToUi();
    let verification;
    try {
      verification = await this.metadata.verifyClean(outputUri, promised);
    } catch {
      await this.discard(outputUri);
      return { kind: 'verificationFailed', remaining: promised };
    }
    if (!verification.verified) {
      await this.discard(outputUri);
      devLog('clean: verification failed', verification.remainingCategories);
      return { kind: 'verificationFailed', remaining: verification.remainingCategories };
    }

    return {
      kind: 'cleaned',
      result: {
        outputUri,
        originalUri: photo.uri,
        verified: true,
        mode,
        removedCategories,
        originalCategories,
        keptCategories,
        outputFormat: format,
        outputDisplayName,
        alreadyClean,
        originalInfo: readImageInfo(input),
        outputInfo: readImageInfo(outputBytes ?? input),
      },
    };
  }

  private async discard(uri: string): Promise<void> {
    try {
      await this.files.delete(uri);
    } catch {
      // Best effort; the session sweep removes leftovers.
    }
  }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------- file system adapters

/** Web preview: outputs become in-memory blob URLs so the verifier can fetch them. */
const webFileSystem: CleanFileSystem = {
  readBytes: readFileBytes,
  async writeOutput(_session, _name, bytes) {
    const blob = new Blob([bytes as BlobPart]);
    return URL.createObjectURL(blob);
  },
  async copyOutput(_session, sourceUri) {
    const response = await fetch(sourceUri);
    return URL.createObjectURL(await response.blob());
  },
  async delete(uri) {
    URL.revokeObjectURL(uri);
  },
};

const expoFileSystem: CleanFileSystem = {
  readBytes: readFileBytes,
  async writeOutput(session, name, bytes) {
    const file = uniqueFile(session, name);
    file.create({ intermediates: true });
    file.write(bytes);
    return file.uri;
  },
  async copyOutput(session, sourceUri, name) {
    const destination = uniqueFile(session, name);
    await new File(sourceUri).copy(destination);
    return destination.uri;
  },
  async delete(uri) {
    const file = new File(uri);
    if (file.exists) file.delete();
  },
};

function uniqueFile(session: WorkSession, name: string): File {
  const directory = new Directory(session.directoryUri);
  let candidate = new File(directory, name);
  let attempt = 1;
  while (candidate.exists) {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    candidate = new File(directory, `${stem}-${attempt}${ext}`);
    attempt += 1;
  }
  return candidate;
}

const nativeFileSystem: CleanFileSystem = Platform.OS === 'web' ? webFileSystem : expoFileSystem;

export const photoCleaningService = new PhotoCleaningService();
