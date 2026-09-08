/**
 * Domain types shared by the metadata, cleaning and verification services.
 * Shapes follow the build spec (sections 18 and 19), extended with the fields
 * the Metadata screen and the verifier need.
 */
export type MetadataCategory = 'location' | 'captureTime' | 'device' | 'camera' | 'software' | 'other';

export const ALL_METADATA_CATEGORIES: readonly MetadataCategory[] = [
  'location',
  'captureTime',
  'device',
  'camera',
  'software',
  'other',
];

/** A single normalized tag for the "View All Metadata" disclosure. */
export interface RawMetadataEntry {
  /** Source container, e.g. "exif", "gps", "xmp", "iptc", "png". */
  group: string;
  name: string;
  /** Human-readable value as produced by the parser (never binary). */
  description: string;
  category: MetadataCategory | null;
}

export interface MetadataSnapshot {
  /** True when any removable (non-structural) metadata exists. */
  hasMetadata: boolean;
  fileType?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    /** Place name taken from embedded IPTC/XMP fields only; never geocoded. */
    placeName?: string;
  };
  capturedAt?: Date;
  /** Original capture string when it could not be parsed into a Date. */
  capturedAtText?: string;
  make?: string;
  model?: string;
  lensModel?: string;
  focalLength?: string;
  aperture?: string;
  iso?: string | number;
  exposureTime?: string;
  software?: string;
  /** Removable categories present in the file. */
  categories: MetadataCategory[];
  /** Categories that may reveal private information (drives the warning card). */
  sensitiveCategories: MetadataCategory[];
  /** Every removable tag, for the power-user disclosure. */
  raw: RawMetadataEntry[];
}

/** The three categories a user can tick on the Clean Up screen. */
export type CleanOption = 'location' | 'camera' | 'dateTime';

/**
 * Preset label for a clean action: one option, "all" (everything removable),
 * or "custom" for a combination of options. Stored in Recent history.
 */
export type CleanMode = CleanOption | 'all' | 'custom';

/** What a clean should remove: a preset mode or an explicit category list. */
export type CleanTarget = CleanMode | readonly MetadataCategory[];

/** Fully resolved clean request: the label plus the categories it promises to remove. */
export interface CleanRequest {
  mode: CleanMode;
  categories: MetadataCategory[];
}

export type OutputFormat = 'jpeg' | 'png' | 'heic' | 'other';

/** Container facts read from a file's bytes (no pixel decoding). */
export interface ImageFileInfo {
  format: OutputFormat;
  byteLength: number;
  /** Stored pixel dimensions, or null when the container could not be parsed. */
  width: number | null;
  height: number | null;
  /** Dimensions as displayed (EXIF orientation / HEIF irot applied). */
  displayWidth: number | null;
  displayHeight: number | null;
  /** EXIF orientation 1–8 when present (JPEG). */
  orientation: number | null;
}

export interface CleanResult {
  outputUri: string;
  originalUri: string;
  /** Always true for a returned result: unverified output is never exposed. */
  verified: boolean;
  mode: CleanMode;
  /** Categories the mode promised to remove that were present in the original. */
  removedCategories: MetadataCategory[];
  /** Removable categories found in the original before cleaning. */
  originalCategories: MetadataCategory[];
  /** Categories intentionally kept (present in the original, not targeted by the mode). */
  keptCategories: MetadataCategory[];
  outputFormat: OutputFormat;
  outputDisplayName: string;
  /** True when the original had nothing to remove for this mode; the copy is byte-identical. */
  alreadyClean: boolean;
  /** The working copy exactly as the pipeline received it. */
  originalInfo: ImageFileInfo;
  /** The clean copy exactly as written to disk (and later handed to Photos). */
  outputInfo: ImageFileInfo;
}

export interface VerificationResult {
  verified: boolean;
  /** Categories that were requested to be removed but are still present. */
  remainingCategories: MetadataCategory[];
}
