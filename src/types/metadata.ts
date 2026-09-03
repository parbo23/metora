/**
 * Domain types shared by the metadata, cleaning and verification services.
 * Shapes follow the build spec (sections 18 and 19). Services arrive in
 * later phases; Phase 1 only uses these to type static mock data.
 */
export type MetadataCategory = 'location' | 'captureTime' | 'device' | 'camera' | 'software' | 'other';

export interface MetadataSnapshot {
  hasMetadata: boolean;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  capturedAt?: Date;
  make?: string;
  model?: string;
  lensModel?: string;
  focalLength?: string;
  aperture?: string;
  iso?: string | number;
  software?: string;
  raw?: Record<string, unknown>;
}

export type CleanMode = 'location' | 'camera' | 'dateTime' | 'all';

export interface CleanResult {
  outputUri: string;
  originalUri: string;
  verified: boolean;
  removedCategories: MetadataCategory[];
  outputFormat: 'jpeg' | 'png' | 'other';
}

export interface VerificationResult {
  verified: boolean;
  /** Categories that were requested to be removed but are still present. */
  remainingCategories: MetadataCategory[];
}
