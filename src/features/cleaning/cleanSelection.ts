import { CLEAN_OPTIONS } from './cleanModes';

import type { CleanOption } from '@/types/metadata';

/**
 * Selection state for the Clean Up screen: a set of the three user-facing
 * options. "Remove all metadata" is not a fourth option but a preset that
 * means "every option selected"; it reads as selected exactly when all three
 * are, and deselecting any single option turns it off again.
 */
export type CleanSelection = readonly CleanOption[];

/** Recommended default: everything selected ("Remove all metadata"). */
export const DEFAULT_SELECTION: CleanSelection = CLEAN_OPTIONS;

export function isAllSelected(selection: CleanSelection): boolean {
  return CLEAN_OPTIONS.every((option) => selection.includes(option));
}

export function isSelected(selection: CleanSelection, option: CleanOption): boolean {
  return selection.includes(option);
}

/** Adds or removes one option; order is normalized to display order. */
export function toggleOption(selection: CleanSelection, option: CleanOption): CleanSelection {
  const next = selection.includes(option)
    ? selection.filter((item) => item !== option)
    : [...selection, option];
  return CLEAN_OPTIONS.filter((item) => next.includes(item));
}

/** The "Remove all metadata" card: selects everything (idempotent when already all). */
export function selectAll(): CleanSelection {
  return CLEAN_OPTIONS;
}
