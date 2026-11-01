import type { ImageTags } from '@/services/MetadataService';
import { parseExifDate } from '@/utils/exifDate';

/**
 * The camera info printed on the frame. Every field is optional: screenshots
 * and messenger images carry none of it, edited images only some.
 */
export type ShotInfo = {
  make?: string; // "Apple", "FUJIFILM", "SONY"
  model?: string; // "iPhone 15 Pro", "X-T5"
  lens?: string; // raw LensModel, never shown as-is
  focalLength35mm?: number; // preferred: FocalLenIn35mmFilm
  focalLength?: number; // fallback: FocalLength (mm, actual)
  aperture?: number; // FNumber, e.g. 1.78
  exposureTime?: number; // seconds, e.g. 0.008333
  iso?: number; // ISOSpeedRatings / PhotographicSensitivity
  date?: Date; // DateTimeOriginal (+ OffsetTimeOriginal if present)
};

/** A parsed tag as ExifReader returns it; value shapes differ per tag type. */
interface TagLike {
  value?: unknown;
  description?: unknown;
}

type TagGroup = Record<string, TagLike | undefined>;

function textOf(tag: TagLike | undefined): string | undefined {
  if (!tag) return undefined;
  const raw =
    typeof tag.description === 'string'
      ? tag.description
      : Array.isArray(tag.value) && typeof tag.value[0] === 'string'
        ? tag.value[0]
        : typeof tag.value === 'string'
          ? tag.value
          : undefined;
  const text = raw?.replace(/\0/g, '').trim();
  return text ? text : undefined;
}

/**
 * Value of a RATIONAL tag (FNumber, ExposureTime, FocalLength): a plain number,
 * `[numerator, denominator]`, a nested rational, or the fraction / number in
 * the description ("1/120", "f/1.8", "24 mm").
 */
function rationalOf(tag: TagLike | undefined): number | undefined {
  if (!tag) return undefined;
  const value = tag.value;
  if (typeof value === 'number') return finite(value);
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return value[1] === 0 ? undefined : finite(value[0] / value[1]);
  }
  if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
    return rationalOf({ value: value[0] });
  }
  return numberInDescription(tag, true);
}

/**
 * Value of a plain numeric tag (ISO, FocalLengthIn35mmFilm): a number, the
 * first entry of an array (ISO is an array on iOS), or the description.
 */
function plainNumberOf(tag: TagLike | undefined): number | undefined {
  if (!tag) return undefined;
  const value = tag.value;
  if (typeof value === 'number') return finite(value);
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'number') return finite(first);
    if (Array.isArray(first)) return plainNumberOf({ value: first });
  }
  return numberInDescription(tag, false);
}

function numberInDescription(tag: TagLike, allowFraction: boolean): number | undefined {
  if (typeof tag.description === 'number') return finite(tag.description);
  if (typeof tag.description !== 'string') return undefined;
  const text = tag.description.replace(',', '.');
  if (allowFraction) {
    const fraction = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (fraction) {
      const denominator = Number(fraction[2]);
      return denominator === 0 ? undefined : finite(Number(fraction[1]) / denominator);
    }
  }
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? finite(Number(match[0])) : undefined;
}

function finite(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Maps the EXIF/TIFF containers of a photo to ShotInfo. Pure, so it can be
 * tested against fixture files and hand-built tag objects.
 */
export function shotInfoFromTags(tags: ImageTags): ShotInfo {
  const exif = (tags.exif ?? {}) as TagGroup;

  const original = textOf(exif.DateTimeOriginal);
  const date = original
    ? parseExifDate(original, textOf(exif.OffsetTimeOriginal))
    : parseExifDate(textOf(exif.DateTimeDigitized), textOf(exif.OffsetTimeDigitized));

  const info: ShotInfo = {
    make: textOf(exif.Make),
    model: textOf(exif.Model),
    lens: textOf(exif.LensModel),
    focalLength35mm: positive(plainNumberOf(exif.FocalLengthIn35mmFilm)),
    focalLength: positive(rationalOf(exif.FocalLength)),
    aperture: positive(rationalOf(exif.FNumber)),
    exposureTime: positive(rationalOf(exif.ExposureTime)),
    iso: positive(plainNumberOf(exif.ISOSpeedRatings) ?? plainNumberOf(exif.PhotographicSensitivity)),
    date,
  };

  // Drop undefined keys so callers can compare with toEqual and spread safely.
  return Object.fromEntries(Object.entries(info).filter(([, v]) => v !== undefined)) as ShotInfo;
}

function positive(value: number | undefined): number | undefined {
  return value !== undefined && value > 0 ? value : undefined;
}

/** True when at least one camera field (not just the date) is present. */
export function hasCameraInfo(info: ShotInfo): boolean {
  return (
    info.make !== undefined ||
    info.model !== undefined ||
    info.focalLength35mm !== undefined ||
    info.focalLength !== undefined ||
    info.aperture !== undefined ||
    info.exposureTime !== undefined ||
    info.iso !== undefined
  );
}
