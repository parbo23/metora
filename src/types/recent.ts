import type { CleanMode, OutputFormat } from './metadata';

/**
 * One entry in the local activity log. This is deliberately the whole model:
 * no photo, thumbnail, URI, filename, coordinate or tag ever goes in here.
 */
export type RecentStatus = 'verifiedClean' | 'partial' | 'failed';

export interface RecentRecord {
  id: string;
  /** Unix epoch milliseconds of the cleaning action. */
  createdAt: number;
  /** Photos processed in this action (1 for the single flow). */
  photoCount: number;
  cleanedCount: number;
  failedCount: number;
  mode: CleanMode;
  status: RecentStatus;
  /** Distinct output formats, e.g. ["jpeg", "heic"]. */
  fileTypes: OutputFormat[];
}

/** Keys allowed in a stored record. Anything else is dropped on load. */
export const RECENT_RECORD_KEYS: readonly (keyof RecentRecord)[] = [
  'id',
  'createdAt',
  'photoCount',
  'cleanedCount',
  'failedCount',
  'mode',
  'status',
  'fileTypes',
];
