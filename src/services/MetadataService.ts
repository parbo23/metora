import { File } from 'expo-file-system';
import * as ExifReader from 'exifreader';
import { Platform } from 'react-native';

import { devLog } from '@/utils/devLog';

export class MetadataReadError extends Error {
  readonly kind = 'unreadable' as const;

  constructor(message = 'Photo could not be read') {
    super(message);
    this.name = 'MetadataReadError';
  }
}

/** Parsed tag containers (exif, gps, file, …) as ExifReader returns them in expanded mode. */
export type ImageTags = ExifReader.ExpandedTags;

export interface MetadataService {
  /**
   * Reads the tags embedded in the file at `uri`. A photo without camera tags
   * yields only the structural `file` container (or `{}` for formats without one).
   */
  readTags(uri: string): Promise<ImageTags>;
}

/**
 * Reads the whole file into memory. The tags live in the first kilobytes of
 * most files but HEIC places them anywhere, and the parser needs the bytes,
 * not decoded pixels, so no image decoding happens here.
 */
export async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new MetadataReadError();
    return response.arrayBuffer();
  }
  const file = new File(uri);
  if (!file.exists) throw new MetadataReadError();
  const bytes = await file.bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

type ReadBytes = (uri: string) => Promise<ArrayBuffer>;

/**
 * ExifReader-backed implementation. Pure JavaScript, fully on-device. This is
 * the single source of camera info: it reads the original bytes of the working
 * copy, so it sees the full EXIF even for HEIC straight from the camera.
 */
export class ExifReaderMetadataService implements MetadataService {
  constructor(private readonly readBytes: ReadBytes = readFileBytes) {}

  async readTags(uri: string): Promise<ImageTags> {
    let buffer: ArrayBuffer;
    try {
      buffer = await this.readBytes(uri);
    } catch (error) {
      devLog('metadata: read failed', error instanceof Error ? error.name : 'unknown');
      throw new MetadataReadError();
    }
    return this.readTagsFromBytes(buffer);
  }

  /** Same as readTags() for bytes already in memory. */
  readTagsFromBytes(buffer: ArrayBuffer): ImageTags {
    try {
      // No XML parser is supplied, so XMP is left unparsed; only EXIF/TIFF is needed.
      return ExifReader.load(buffer, { expanded: true, includeUnknown: false });
    } catch (error) {
      // "No Exif data" style errors mean a readable image without tags;
      // format errors mean the file is not an image we can open.
      if (isMetadataMissingError(error)) return {};
      devLog('metadata: parse failed', error instanceof Error ? error.name : 'unknown');
      throw new MetadataReadError();
    }
  }
}

function isMetadataMissingError(error: unknown): boolean {
  return error instanceof Error && error.name === 'MetadataMissingError';
}

export const metadataService: MetadataService = new ExifReaderMetadataService();
