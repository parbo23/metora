import type { CleanMode, CleanOption, CleanRequest, CleanTarget, MetadataCategory } from '@/types/metadata';

/** The three user-selectable categories on the Clean Up screen, in display order. */
export const CLEAN_OPTIONS: readonly CleanOption[] = ['location', 'camera', 'dateTime'];

/** Everything the cleaner can remove. "Remove all metadata" promises exactly this. */
export const ALL_REMOVABLE_CATEGORIES: readonly MetadataCategory[] = [
  'location',
  'captureTime',
  'device',
  'camera',
  'software',
  'other',
];

export const defaultCleanMode: CleanMode = 'all';

/** Which metadata categories each option / preset promises to remove. */
export function categoriesForMode(mode: CleanMode): MetadataCategory[] {
  switch (mode) {
    case 'location':
      return ['location'];
    case 'camera':
      // "Device, lens and camera settings" — software identifies the device too.
      return ['device', 'camera', 'software'];
    case 'dateTime':
      return ['captureTime'];
    case 'all':
      return [...ALL_REMOVABLE_CATEGORIES];
    case 'custom':
      // A custom request always carries its own explicit category list.
      return [];
  }
}

export function isCleanMode(value: unknown): value is CleanMode {
  return (
    value === 'location' ||
    value === 'camera' ||
    value === 'dateTime' ||
    value === 'all' ||
    value === 'custom'
  );
}

export function isCleanOption(value: unknown): value is CleanOption {
  return value === 'location' || value === 'camera' || value === 'dateTime';
}

/** Turns a preset mode or an explicit category list into the categories to remove. */
export function resolveCategories(target: CleanTarget): MetadataCategory[] {
  if (typeof target === 'string') return categoriesForMode(target);
  return dedupe(target);
}

/** Normalizes any accepted input into a full request (mode label + categories). */
export function toCleanRequest(target: CleanTarget | CleanRequest): CleanRequest {
  if (typeof target === 'string') return { mode: target, categories: categoriesForMode(target) };
  if (Array.isArray(target))
    return { mode: 'custom', categories: dedupe(target as readonly MetadataCategory[]) };
  return target as CleanRequest;
}

/**
 * Builds the request for a set of selected Clean Up options.
 *
 * - all three options → the "all" preset (adds software and other data, i.e. everything removable)
 * - exactly one option → that option's mode
 * - two options → "custom" with the union of their categories
 * - nothing → null; the screen disables "Create Clean Copy"
 */
export function requestFromSelection(selection: readonly CleanOption[]): CleanRequest | null {
  const options = CLEAN_OPTIONS.filter((option) => selection.includes(option));
  if (options.length === 0) return null;
  if (options.length === CLEAN_OPTIONS.length) return toCleanRequest('all');
  if (options.length === 1) return toCleanRequest(options[0]);
  return {
    mode: 'custom',
    categories: dedupe(options.flatMap((option) => categoriesForMode(option))),
  };
}

function dedupe(categories: readonly MetadataCategory[]): MetadataCategory[] {
  return ALL_REMOVABLE_CATEGORIES.filter((category) => categories.includes(category));
}
