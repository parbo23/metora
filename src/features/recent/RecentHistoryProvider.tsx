import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  buildRecord,
  recentHistoryStore,
  type NewRecordInput,
  type RecentHistoryStore,
} from '@/services/RecentHistoryStore';
import type { RecentRecord } from '@/types/recent';

/**
 * Shares the local activity log between the Recent screen, the Batch tab
 * preview, and the flows that append to it. Records never contain photo data.
 */
export interface RecentHistoryContextValue {
  records: RecentRecord[];
  isLoaded: boolean;
  record(input: NewRecordInput): Promise<void>;
  clearHistory(): Promise<void>;
}

const RecentHistoryContext = createContext<RecentHistoryContextValue | null>(null);

export function RecentHistoryProvider({
  children,
  store = recentHistoryStore,
}: {
  children: ReactNode;
  store?: RecentHistoryStore;
}) {
  const [records, setRecords] = useState<RecentRecord[]>([]);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    store.load().then((loaded) => {
      if (!cancelled) {
        setRecords(loaded);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const record = useCallback(
    async (input: NewRecordInput) => {
      try {
        const next = await store.add(buildRecord(input));
        setRecords(next);
      } catch {
        // History is a convenience; a storage error must never affect the clean flow.
      }
    },
    [store],
  );

  const clearHistory = useCallback(async () => {
    setRecords([]);
    try {
      await store.clear();
    } catch {
      // Already cleared in memory; storage will be overwritten on the next add.
    }
  }, [store]);

  const value = useMemo(
    () => ({ records, isLoaded, record, clearHistory }),
    [records, isLoaded, record, clearHistory],
  );
  return <RecentHistoryContext.Provider value={value}>{children}</RecentHistoryContext.Provider>;
}

export function useRecentHistory(): RecentHistoryContextValue {
  const context = useContext(RecentHistoryContext);
  if (!context) throw new Error('useRecentHistory must be used inside RecentHistoryProvider');
  return context;
}
