/**
 * EXIF stores dates as "YYYY:MM:DD HH:MM:SS" in local time, optionally with a
 * separate "+HH:MM" offset tag. Returns undefined when the string is not a
 * usable date (e.g. "0000:00:00 00:00:00").
 */
export function parseExifDate(value: string | undefined, offset?: string): Date | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return parseIsoLike(value);
  const [, y, mo, d, h, mi, s] = match.map(Number);
  if (!y || !mo || !d) return undefined;

  const offsetMatch = offset?.trim().match(/^([+-])(\d{2}):(\d{2})$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const offsetMinutes = sign * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]));
    const utc = Date.UTC(y, mo - 1, d, h, mi, s) - offsetMinutes * 60_000;
    return validDate(new Date(utc));
  }
  // No offset: treat as device-local wall time.
  return validDate(new Date(y, mo - 1, d, h, mi, s));
}

function parseIsoLike(value: string): Date | undefined {
  // XMP dates are ISO 8601 ("2026-09-03T14:32:11+02:00").
  if (!/^\d{4}-\d{2}-\d{2}/.test(value.trim())) return undefined;
  return validDate(new Date(value.trim()));
}

function validDate(date: Date): Date | undefined {
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "Sep 3, 2026 · 2:32 PM" */
export function formatCaptureDate(date: Date, locale = 'en-US'): string {
  const day = date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
