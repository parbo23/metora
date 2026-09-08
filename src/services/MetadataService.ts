import { DOMParser } from '@xmldom/xmldom';
import { File } from 'expo-file-system';
import * as ExifReader from 'exifreader';
import { Platform } from 'react-native';

import { resolveCategories } from '@/features/cleaning/cleanModes';
import { normalizeTags, remainingCategories } from '@/features/metadata/normalize';
import type { CleanTarget, MetadataSnapshot, VerificationResult } from '@/types/metadata';
import { devLog } from '@/utils/devLog';

export class MetadataReadError extends Error {
  readonly kind = 'unreadable' as const;

  constructor(message = 'Photo could not be read') {
    super(message);
    this.name = 'MetadataReadError';
  }
}

export interface MetadataService {
  /** Reads and normalizes the metadata embedded in the file at `uri`. */
  inspect(uri: string): Promise<MetadataSnapshot>;
  /** Normalizes metadata from bytes already in memory. */
  inspectBytes(buffer: ArrayBuffer): MetadataSnapshot;
  /** Re-reads an exported file and checks the promised categories are gone. */
  verifyClean(uri: string, target: CleanTarget): Promise<VerificationResult>;
}

/**
 * Reads the whole file into memory. Metadata lives in the first kilobytes of
 * most files but HEIC/PNG place it anywhere, and the parser needs the bytes,
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
type LoadOptions = NonNullable<Parameters<typeof ExifReader.load>[1]>;
type XmlDomParser = LoadOptions['domParser'];

/**
 * ExifReader-backed implementation. Pure JavaScript, fully on-device.
 * XMP needs an XML parser, which React Native lacks, so xmldom is supplied.
 */
export class ExifReaderMetadataService implements MetadataService {
  constructor(private readonly readBytes: ReadBytes = readFileBytes) {}

  async inspect(uri: string): Promise<MetadataSnapshot> {
    let buffer: ArrayBuffer;
    try {
      buffer = await this.readBytes(uri);
    } catch (error) {
      devLog('metadata: read failed', error instanceof Error ? error.name : 'unknown');
      throw new MetadataReadError();
    }
    return this.inspectBytes(buffer);
  }

  /** Same as inspect() for bytes already in memory (avoids a second file read). */
  inspectBytes(buffer: ArrayBuffer): MetadataSnapshot {
    let tags: ExifReader.ExpandedTags;
    try {
      tags = ExifReader.load(buffer, {
        expanded: true,
        includeUnknown: false,
        domParser: new DOMParser() as unknown as XmlDomParser,
      });
    } catch (error) {
      // "No Exif data" style errors mean a readable image without metadata;
      // format errors mean the file is not an image we can open.
      if (isMetadataMissingError(error)) {
        return normalizeTags({});
      }
      devLog('metadata: parse failed', error instanceof Error ? error.name : 'unknown');
      throw new MetadataReadError();
    }

    const snapshot = normalizeTags(tags);
    devLog('metadata: inspected', { tags: snapshot.raw.length, categories: snapshot.categories });
    return snapshot;
  }

  async verifyClean(uri: string, target: CleanTarget): Promise<VerificationResult> {
    const snapshot = await this.inspect(uri);
    const remaining = remainingCategories(snapshot, resolveCategories(target));
    return { verified: remaining.length === 0, remainingCategories: remaining };
  }
}

function isMetadataMissingError(error: unknown): boolean {
  return error instanceof Error && error.name === 'MetadataMissingError';
}

export const metadataService: MetadataService = new ExifReaderMetadataService();
