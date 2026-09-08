import { copy } from '@/copy/en';
import type { CleanMode } from '@/types/metadata';
import type { RecentRecord } from '@/types/recent';

/** "Today · 2:32 PM", "Yesterday · 6:42 PM", "Sep 3 · 2:32 PM" (year added when different). */
export function formatRecentDate(timestamp: number, now: number = Date.now(), locale = 'en-US'): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const time = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  if (sameDay(date, today)) return `${copy.recent.today} · ${time}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return `${copy.recent.yesterday} · ${time}`;
  const day =
    date.getFullYear() === today.getFullYear()
      ? date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
      : date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${day} · ${time}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function modeLabel(mode: CleanMode): string {
  return copy.recent.modes[mode];
}

/** Second line of a row: "3 photos · Verified clean" or "12 photos · 11 cleaned · 1 failed". */
export function recordSubtitle(record: RecentRecord): string {
  const photos = record.photoCount === 1 ? copy.recent.onePhoto : copy.recent.photos(record.photoCount);
  switch (record.status) {
    case 'verifiedClean':
      return `${photos} · ${copy.recent.statusVerified}`;
    case 'failed':
      return `${photos} · ${copy.recent.statusFailed}`;
    case 'partial':
      return `${photos} · ${copy.recent.statusPartial(record.cleanedCount, record.failedCount)}`;
  }
}

/** "JPEG, HEIC" for the optional file type summary. */
export function fileTypesLabel(record: RecentRecord): string | undefined {
  if (record.fileTypes.length === 0) return undefined;
  const labels: Record<RecentRecord['fileTypes'][number], string> = {
    jpeg: 'JPEG',
    png: 'PNG',
    heic: 'HEIC',
    other: 'Other',
  };
  return record.fileTypes.map((f) => labels[f]).join(', ');
}
