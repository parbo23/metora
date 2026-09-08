import type { ExpandedTags } from 'exifreader';

import { categorizeTag, isSensitiveTag } from './categorize';

import {
  ALL_METADATA_CATEGORIES,
  type MetadataCategory,
  type MetadataSnapshot,
  type RawMetadataEntry,
} from '@/types/metadata';
import { parseExifDate } from '@/utils/exifDate';

const MAX_DESCRIPTION_LENGTH = 200;

/** Tag groups whose values are binary blobs or duplicates we never display. */
const HIDDEN_GROUPS = new Set(['Thumbnail', 'metadataRange', 'composite', 'pngFile']);
const HIDDEN_TAGS = new Set(['_raw', 'MakerNote', 'JFIF Thumbnail', 'Thumbnail']);

interface TagLike {
  description?: unknown;
  value?: unknown;
}

function isTagLike(value: unknown): value is TagLike {
  return typeof value === 'object' && value !== null && ('description' in value || 'value' in value);
}

/** Turns a parser value into a short, printable, single-line string. */
export function describe(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return clip(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(describe).filter((part): part is string => Boolean(part));
    return parts.length > 0 ? clip(parts.join(', ')) : undefined;
  }
  if (isTagLike(value)) {
    if (typeof value.description === 'string' || typeof value.description === 'number') {
      return clip(String(value.description));
    }
    return describe(value.value);
  }
  return undefined;
}

function clip(text: string): string | undefined {
  const single = text.replace(/\s+/g, ' ').trim();
  if (!single) return undefined;
  return single.length > MAX_DESCRIPTION_LENGTH ? `${single.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…` : single;
}

function tagDescription(group: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!group) return undefined;
  return describe(group[name]);
}

/** Collects every removable tag across containers, categorized. */
export function collectRawEntries(tags: ExpandedTags): RawMetadataEntry[] {
  const entries: RawMetadataEntry[] = [];
  for (const [group, container] of Object.entries(tags)) {
    if (HIDDEN_GROUPS.has(group) || typeof container !== 'object' || container === null) continue;
    if (group === 'gps') {
      // Derived decimal coordinates; the underlying GPS* tags are listed under exif.
      continue;
    }
    for (const [name, value] of Object.entries(container as Record<string, unknown>)) {
      if (HIDDEN_TAGS.has(name)) continue;
      const category = categorizeTag(group, name);
      if (category === null) continue;
      const description = describe(value);
      if (!description) continue;
      entries.push({ group, name, description, category });
    }
  }
  return entries;
}

/** Builds the human-readable device string: Apple models read as "iPhone 17 Pro". */
export function deviceLabel(make?: string, model?: string): string | undefined {
  if (!model && !make) return undefined;
  if (!model) return make;
  if (!make) return model;
  if (/^apple$/i.test(make.trim()) || model.toLowerCase().startsWith(make.toLowerCase())) return model;
  return `${make} ${model}`;
}

/** "f/1.8" → "ƒ/1.8" */
function normalizeAperture(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/^f\//i, 'ƒ/');
}

function placeNameFrom(tags: ExpandedTags): string | undefined {
  const xmp = tags.xmp as Record<string, unknown> | undefined;
  const iptc = tags.iptc as Record<string, unknown> | undefined;
  const city = tagDescription(xmp, 'City') ?? tagDescription(iptc, 'City');
  const country =
    tagDescription(xmp, 'Country') ??
    tagDescription(xmp, 'CountryName') ??
    tagDescription(iptc, 'Country/Primary Location Name');
  const parts = [city, country].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Normalizes ExifReader's expanded output into Metora's domain snapshot.
 * Pure: safe to unit-test with fixture files.
 */
export function normalizeTags(tags: ExpandedTags): MetadataSnapshot {
  const exif = tags.exif as Record<string, unknown> | undefined;
  const raw = collectRawEntries(tags);

  const categories = ALL_METADATA_CATEGORIES.filter((category) =>
    raw.some((entry) => entry.category === category),
  );
  const sensitiveCategories = ALL_METADATA_CATEGORIES.filter((category) =>
    raw.some((entry) => entry.category === category && isSensitiveTag(category, entry.name)),
  );

  const gps = tags.gps;
  const placeName = placeNameFrom(tags);
  const hasLocation = categories.includes('location');
  const location = hasLocation
    ? {
        latitude: typeof gps?.Latitude === 'number' ? gps.Latitude : undefined,
        longitude: typeof gps?.Longitude === 'number' ? gps.Longitude : undefined,
        altitude: typeof gps?.Altitude === 'number' ? gps.Altitude : undefined,
        placeName,
      }
    : undefined;

  const captureText =
    tagDescription(exif, 'DateTimeOriginal') ??
    tagDescription(exif, 'DateTimeDigitized') ??
    tagDescription(exif, 'DateTime') ??
    tagDescription(tags.xmp as Record<string, unknown> | undefined, 'CreateDate');
  const capturedAt = parseExifDate(
    captureText,
    tagDescription(exif, 'OffsetTimeOriginal') ?? tagDescription(exif, 'OffsetTime'),
  );

  const make = tagDescription(exif, 'Make');
  const model = tagDescription(exif, 'Model');

  return {
    hasMetadata: raw.length > 0,
    fileType: tagDescription(tags.file as Record<string, unknown> | undefined, 'FileType'),
    location,
    capturedAt,
    capturedAtText: capturedAt ? undefined : captureText,
    make,
    model,
    lensModel: tagDescription(exif, 'LensModel'),
    focalLength: tagDescription(exif, 'FocalLength'),
    aperture: normalizeAperture(tagDescription(exif, 'FNumber')),
    iso: tagDescription(exif, 'ISOSpeedRatings') ?? tagDescription(exif, 'PhotographicSensitivity'),
    exposureTime: tagDescription(exif, 'ExposureTime'),
    software: tagDescription(exif, 'Software'),
    categories,
    sensitiveCategories,
    raw,
  };
}

/** Categories still present that a clean mode promised to remove. */
export function remainingCategories(
  snapshot: MetadataSnapshot,
  promised: readonly MetadataCategory[],
): MetadataCategory[] {
  return promised.filter((category) => snapshot.categories.includes(category));
}
