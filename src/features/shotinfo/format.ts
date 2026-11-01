import { hasCameraInfo, type ShotInfo } from './shotInfo';

import { copy } from '@/copy/en';

/** Separator between values on the settings line. */
export const SEPARATOR = ' · ';

/** "FUJIFILM" → "Fujifilm", "NIKON CORPORATION" → "Nikon Corporation"; mixed case stays as-is. */
export function formatMake(make: string | undefined): string | undefined {
  const trimmed = make?.trim();
  if (!trimmed) return undefined;
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => (part.trim() ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('');
}

/**
 * "iPhone 15 Pro", "Fujifilm X-T5", "Canon EOS R5". Apple models are shown
 * without the make (the familiar "Shot on iPhone" form), and a model that
 * already starts with the make is not prefixed again.
 */
export function formatCameraName(make: string | undefined, model: string | undefined): string | undefined {
  const cleanMake = formatMake(make);
  const cleanModel = model?.trim() || undefined;
  if (!cleanModel) return cleanMake;
  if (!cleanMake) return cleanModel;
  const rawMake = make?.trim().toLowerCase() ?? '';
  if (rawMake === 'apple' || cleanModel.toLowerCase().startsWith(rawMake)) return cleanModel;
  return `${cleanMake} ${cleanModel}`;
}

/** "24mm": the 35mm-equivalent focal length when known, otherwise the actual one, rounded. */
export function formatFocalLength(info: Pick<ShotInfo, 'focalLength35mm' | 'focalLength'>): string | undefined {
  const value = info.focalLength35mm ?? info.focalLength;
  if (value === undefined || !Number.isFinite(value) || value <= 0) return undefined;
  return `${Math.round(value)}mm`;
}

/** "f/1.8", "f/2" (one decimal, trailing .0 dropped). */
export function formatAperture(fNumber: number | undefined): string | undefined {
  if (fNumber === undefined || !Number.isFinite(fNumber) || fNumber <= 0) return undefined;
  return `f/${trimZero(fNumber.toFixed(1))}`;
}

/** "1/120s" below one second, "1s" / "2.5s" at one second or above. */
export function formatShutter(seconds: number | undefined): string | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  if (seconds < 1) {
    const denominator = Math.max(1, Math.round(1 / seconds));
    return denominator === 1 ? '1s' : `1/${denominator}s`;
  }
  return `${trimZero(seconds.toFixed(1))}s`;
}

/** "ISO 80" */
export function formatIso(iso: number | undefined): string | undefined {
  if (iso === undefined || !Number.isFinite(iso) || iso <= 0) return undefined;
  return `ISO ${Math.round(iso)}`;
}

/**
 * Localised short date without time or time zone, e.g. "1 Nov 2026" (en-GB)
 * or "Nov 1, 2026" (en-US). `locale` defaults to the device locale.
 */
export function formatDate(date: Date | undefined, locale?: string): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  try {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return date.toDateString();
  }
}

/** "24mm · f/1.8 · 1/120s · ISO 80"; missing values are omitted together with their separator. */
export function formatSettingsLine(info: ShotInfo): string | undefined {
  const parts = [
    formatFocalLength(info),
    formatAperture(info.aperture),
    formatShutter(info.exposureTime),
    formatIso(info.iso),
  ].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(SEPARATOR) : undefined;
}

/** Everything the frame prints. Lines that have no data are absent, never empty. */
export interface FrameText {
  /** "Shot on iPhone 15 Pro" */
  title?: string;
  /** "24mm · f/1.8 · 1/120s · ISO 80" */
  settings?: string;
  /** "1 Nov 2026" */
  date?: string;
  /** False for screenshots and messenger images: the frame shows a note instead. */
  hasCameraInfo: boolean;
}

export function frameText(info: ShotInfo, locale?: string): FrameText {
  const camera = formatCameraName(info.make, info.model);
  const text: FrameText = { hasCameraInfo: hasCameraInfo(info) };
  if (camera) text.title = copy.frame.shotOn(camera);
  const settings = formatSettingsLine(info);
  if (settings) text.settings = settings;
  const date = formatDate(info.date, locale);
  if (date) text.date = date;
  return text;
}

function trimZero(fixed: string): string {
  return fixed.replace(/\.0$/, '');
}
