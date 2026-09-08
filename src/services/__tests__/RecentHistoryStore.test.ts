import {
  MAX_RECORDS,
  RECENT_STORAGE_KEY,
  RecentHistoryStore,
  buildRecord,
  recordHasOnlyAllowedKeys,
  sanitizeRecord,
  statusFor,
  type RecentStorage,
} from '../RecentHistoryStore';

import { fileTypesLabel, formatRecentDate, recordSubtitle } from '@/features/recent/presentation';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage: RecentStorage = {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
  return { storage, map };
}

describe('buildRecord', () => {
  it('derives count and status and de-duplicates file types', () => {
    const r = buildRecord({
      mode: 'all',
      cleanedCount: 11,
      failedCount: 1,
      fileTypes: ['jpeg', 'heic', 'jpeg'],
      createdAt: 5,
    });
    expect(r).toMatchObject({
      photoCount: 12,
      cleanedCount: 11,
      failedCount: 1,
      mode: 'all',
      status: 'partial',
      createdAt: 5,
    });
    expect(r.fileTypes).toEqual(['heic', 'jpeg']);
    expect(statusFor(3, 0)).toBe('verifiedClean');
    expect(statusFor(0, 2)).toBe('failed');
    expect(statusFor(0, 0)).toBe('failed');
  });

  it('contains only the allow-listed keys and nothing that could identify a photo', () => {
    const r = buildRecord({ mode: 'location', cleanedCount: 1, failedCount: 0, fileTypes: ['jpeg'] });
    expect(recordHasOnlyAllowedKeys(r)).toBe(true);
    const json = JSON.stringify(r).toLowerCase();
    for (const forbidden of ['uri', 'file:', 'name', 'gps', 'lat', 'exif', 'thumb', 'path']) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe('sanitizeRecord', () => {
  const valid = buildRecord({
    mode: 'camera',
    cleanedCount: 2,
    failedCount: 0,
    fileTypes: ['png'],
    createdAt: 1000,
  });

  it('accepts a valid record and strips unknown keys', () => {
    const tampered = { ...valid, uri: 'file:///secret.jpg', fileName: 'IMG_1.HEIC', gps: { lat: 1 } };
    const cleaned = sanitizeRecord(tampered);
    expect(cleaned).toEqual(valid);
    expect(recordHasOnlyAllowedKeys(cleaned!)).toBe(true);
  });

  it('rejects malformed records', () => {
    expect(sanitizeRecord(null)).toBeNull();
    expect(sanitizeRecord('x')).toBeNull();
    expect(sanitizeRecord({ ...valid, mode: 'everything' })).toBeNull();
    expect(sanitizeRecord({ ...valid, mode: 'custom' })).toMatchObject({ mode: 'custom' });
    expect(sanitizeRecord({ ...valid, status: 'ok' })).toBeNull();
    expect(sanitizeRecord({ ...valid, cleanedCount: -1 })).toBeNull();
    expect(sanitizeRecord({ ...valid, createdAt: 'yesterday' })).toBeNull();
    expect(sanitizeRecord({ ...valid, fileTypes: ['jpeg', 'exe'] })?.fileTypes).toEqual(['jpeg']);
  });
});

describe('RecentHistoryStore', () => {
  it('starts empty and persists records newest first', async () => {
    const { storage, map } = memoryStorage();
    const store = new RecentHistoryStore(storage);
    expect(await store.load()).toEqual([]);
    const a = buildRecord({
      mode: 'all',
      cleanedCount: 1,
      failedCount: 0,
      fileTypes: ['jpeg'],
      createdAt: 1,
    });
    const b = buildRecord({
      mode: 'location',
      cleanedCount: 3,
      failedCount: 1,
      fileTypes: ['heic'],
      createdAt: 2,
    });
    await store.add(a);
    const list = await store.add(b);
    expect(list.map((r) => r.id)).toEqual([b.id, a.id]);
    expect(await store.load()).toEqual(list);
    expect(map.has(RECENT_STORAGE_KEY)).toBe(true);
  });

  it('caps the log at the maximum', async () => {
    const store = new RecentHistoryStore(memoryStorage().storage);
    for (let i = 0; i < MAX_RECORDS + 5; i += 1) {
      await store.add(
        buildRecord({ mode: 'all', cleanedCount: 1, failedCount: 0, fileTypes: [], createdAt: i }),
      );
    }
    const list = await store.load();
    expect(list).toHaveLength(MAX_RECORDS);
    expect(list[0].createdAt).toBe(MAX_RECORDS + 4);
  });

  it('clears immediately and completely', async () => {
    const { storage, map } = memoryStorage();
    const store = new RecentHistoryStore(storage);
    await store.add(buildRecord({ mode: 'all', cleanedCount: 1, failedCount: 0, fileTypes: [] }));
    await store.clear();
    expect(map.size).toBe(0);
    expect(await store.load()).toEqual([]);
  });

  it('survives corrupt or foreign storage content', async () => {
    const corrupt = new RecentHistoryStore(memoryStorage({ [RECENT_STORAGE_KEY]: '{not json' }).storage);
    expect(await corrupt.load()).toEqual([]);
    const wrongShape = new RecentHistoryStore(memoryStorage({ [RECENT_STORAGE_KEY]: '{"a":1}' }).storage);
    expect(await wrongShape.load()).toEqual([]);
    const mixed = new RecentHistoryStore(
      memoryStorage({
        [RECENT_STORAGE_KEY]: JSON.stringify([
          buildRecord({ mode: 'all', cleanedCount: 1, failedCount: 0, fileTypes: [], createdAt: 9 }),
          { junk: true, uri: 'file:///x.jpg' },
        ]),
      }).storage,
    );
    const loaded = await mixed.load();
    expect(loaded).toHaveLength(1);
    expect(JSON.stringify(loaded)).not.toContain('file:///');
  });

  it('never throws to callers when storage fails to read', async () => {
    const failing: RecentStorage = {
      getItem: async () => {
        throw new Error('disk');
      },
      setItem: async () => {},
      removeItem: async () => {},
    };
    expect(await new RecentHistoryStore(failing).load()).toEqual([]);
  });
});

describe('presentation', () => {
  const now = new Date(2026, 8, 6, 15, 0).getTime();

  it('formats relative dates', () => {
    expect(formatRecentDate(new Date(2026, 8, 6, 14, 32).getTime(), now)).toBe('Today · 2:32 PM');
    expect(formatRecentDate(new Date(2026, 8, 5, 18, 42).getTime(), now)).toBe('Yesterday · 6:42 PM');
    expect(formatRecentDate(new Date(2026, 8, 3, 14, 32).getTime(), now)).toBe('Sep 3 · 2:32 PM');
    expect(formatRecentDate(new Date(2025, 11, 24, 9, 5).getTime(), now)).toBe('Dec 24, 2025 · 9:05 AM');
  });

  it('describes records without any photo identifiers', () => {
    const ok = buildRecord({ mode: 'all', cleanedCount: 1, failedCount: 0, fileTypes: ['heic'] });
    expect(recordSubtitle(ok)).toBe('1 photo · Verified clean');
    expect(fileTypesLabel(ok)).toBe('HEIC');
    const partial = buildRecord({
      mode: 'location',
      cleanedCount: 11,
      failedCount: 1,
      fileTypes: ['jpeg', 'png'],
    });
    expect(recordSubtitle(partial)).toBe('12 photos · 11 cleaned · 1 failed');
    expect(fileTypesLabel(partial)).toBe('JPEG, PNG');
    const failed = buildRecord({ mode: 'dateTime', cleanedCount: 0, failedCount: 2, fileTypes: [] });
    expect(recordSubtitle(failed)).toBe('2 photos · Failed');
    expect(fileTypesLabel(failed)).toBeUndefined();
  });
});
