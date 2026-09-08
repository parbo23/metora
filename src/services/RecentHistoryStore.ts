import AsyncStorage from '@react-native-async-storage/async-storage';

import { isCleanMode } from '@/features/cleaning/cleanModes';
import type { OutputFormat } from '@/types/metadata';
import { RECENT_RECORD_KEYS, type RecentRecord, type RecentStatus } from '@/types/recent';

/**
 * Local activity log. Stored as one JSON array in AsyncStorage, newest first,
 * capped at MAX_RECORDS. Records are validated and stripped to the allowed
 * keys on load, so nothing beyond the sanitized model can be read back even
 * if the storage was tampered with or written by an older build.
 */
export const RECENT_STORAGE_KEY = 'metora.recent.v1';
export const MAX_RECORDS = 100;

export interface RecentStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const OUTPUT_FORMATS: readonly OutputFormat[] = ['jpeg', 'png', 'heic', 'other'];
const STATUSES: readonly RecentStatus[] = ['verifiedClean', 'partial', 'failed'];

export function sanitizeRecord(value: unknown): RecentRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const id = typeof v.id === 'string' && v.id.length > 0 ? v.id : null;
  const createdAt = typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) ? v.createdAt : null;
  const photoCount = nonNegativeInt(v.photoCount);
  const cleanedCount = nonNegativeInt(v.cleanedCount);
  const failedCount = nonNegativeInt(v.failedCount);
  const mode = isCleanMode(v.mode) ? v.mode : null;
  const status = STATUSES.find((s) => s === v.status) ?? null;
  const fileTypes = Array.isArray(v.fileTypes)
    ? v.fileTypes.filter((f): f is OutputFormat => OUTPUT_FORMATS.includes(f as OutputFormat))
    : [];
  if (!id || createdAt === null || photoCount === null || cleanedCount === null || failedCount === null)
    return null;
  if (!mode || !status) return null;
  // Rebuild from scratch so unknown keys never survive a round trip.
  const record: RecentRecord = {
    id,
    createdAt,
    photoCount,
    cleanedCount,
    failedCount,
    mode,
    status,
    fileTypes,
  };
  return record;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

export function statusFor(cleanedCount: number, failedCount: number): RecentStatus {
  if (failedCount === 0 && cleanedCount > 0) return 'verifiedClean';
  if (cleanedCount === 0) return 'failed';
  return 'partial';
}

export interface NewRecordInput {
  mode: RecentRecord['mode'];
  cleanedCount: number;
  failedCount: number;
  fileTypes: OutputFormat[];
  createdAt?: number;
}

export function buildRecord(input: NewRecordInput): RecentRecord {
  const createdAt = input.createdAt ?? Date.now();
  return {
    id: `${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    photoCount: input.cleanedCount + input.failedCount,
    cleanedCount: input.cleanedCount,
    failedCount: input.failedCount,
    mode: input.mode,
    status: statusFor(input.cleanedCount, input.failedCount),
    fileTypes: Array.from(new Set(input.fileTypes)).sort(),
  };
}

export class RecentHistoryStore {
  constructor(private readonly storage: RecentStorage = AsyncStorage) {}

  async load(): Promise<RecentRecord[]> {
    let raw: string | null;
    try {
      raw = await this.storage.getItem(RECENT_STORAGE_KEY);
    } catch {
      return [];
    }
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(sanitizeRecord)
        .filter((r): r is RecentRecord => r !== null)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, MAX_RECORDS);
    } catch {
      // Corrupt storage: start fresh rather than crash.
      return [];
    }
  }

  /** Prepends a record and returns the new list (newest first, capped). */
  async add(record: RecentRecord): Promise<RecentRecord[]> {
    const current = await this.load();
    const next = [record, ...current.filter((r) => r.id !== record.id)].slice(0, MAX_RECORDS);
    await this.storage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  /** Deletes the whole log immediately. Photos in the library are never touched. */
  async clear(): Promise<void> {
    await this.storage.removeItem(RECENT_STORAGE_KEY);
  }
}

export const recentHistoryStore = new RecentHistoryStore();

/** Ensures every stored key is on the allow-list; used by tests and as a guard. */
export function recordHasOnlyAllowedKeys(record: object): boolean {
  return Object.keys(record).every((key) => (RECENT_RECORD_KEYS as readonly string[]).includes(key));
}
