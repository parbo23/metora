import { requestFromSelection, resolveCategories, toCleanRequest } from '../cleanModes';
import { DEFAULT_SELECTION, isAllSelected, selectAll, toggleOption } from '../cleanSelection';

describe('clean selection', () => {
  it('defaults to everything selected, which reads as "Remove all metadata"', () => {
    expect(DEFAULT_SELECTION).toEqual(['location', 'camera', 'dateTime']);
    expect(isAllSelected(DEFAULT_SELECTION)).toBe(true);
  });

  it('deselecting one option turns "all" off; reselecting it turns "all" back on', () => {
    const withoutCamera = toggleOption(DEFAULT_SELECTION, 'camera');
    expect(withoutCamera).toEqual(['location', 'dateTime']);
    expect(isAllSelected(withoutCamera)).toBe(false);
    expect(isAllSelected(toggleOption(withoutCamera, 'camera'))).toBe(true);
  });

  it('keeps display order regardless of toggle order', () => {
    expect(toggleOption(toggleOption([], 'dateTime'), 'location')).toEqual(['location', 'dateTime']);
  });

  it('can reach an empty selection, and selectAll restores everything', () => {
    let selection = DEFAULT_SELECTION;
    for (const option of DEFAULT_SELECTION) selection = toggleOption(selection, option);
    expect(selection).toEqual([]);
    expect(requestFromSelection(selection)).toBeNull();
    expect(selectAll()).toEqual(DEFAULT_SELECTION);
  });
});

describe('requestFromSelection', () => {
  it('maps all three options to the "all" preset (everything removable)', () => {
    expect(requestFromSelection(['location', 'camera', 'dateTime'])).toEqual({
      mode: 'all',
      categories: ['location', 'captureTime', 'device', 'camera', 'software', 'other'],
    });
  });

  it('maps a single option to its own mode', () => {
    expect(requestFromSelection(['camera'])).toEqual({
      mode: 'camera',
      categories: ['device', 'camera', 'software'],
    });
    expect(requestFromSelection(['dateTime'])).toEqual({ mode: 'dateTime', categories: ['captureTime'] });
  });

  it('maps two options to a custom request with the union of their categories', () => {
    expect(requestFromSelection(['location', 'dateTime'])).toEqual({
      mode: 'custom',
      categories: ['location', 'captureTime'],
    });
    expect(requestFromSelection(['dateTime', 'camera'])).toEqual({
      mode: 'custom',
      categories: ['captureTime', 'device', 'camera', 'software'],
    });
    expect(requestFromSelection(['location', 'camera'])).toEqual({
      mode: 'custom',
      categories: ['location', 'device', 'camera', 'software'],
    });
  });
});

describe('resolveCategories / toCleanRequest', () => {
  it('accepts a mode or an explicit list and de-duplicates', () => {
    expect(resolveCategories('location')).toEqual(['location']);
    expect(resolveCategories(['camera', 'location', 'camera'])).toEqual(['location', 'camera']);
    expect(toCleanRequest(['captureTime'])).toEqual({ mode: 'custom', categories: ['captureTime'] });
    expect(toCleanRequest('all').categories).toHaveLength(6);
    const request = { mode: 'custom' as const, categories: ['location' as const] };
    expect(toCleanRequest(request)).toBe(request);
  });
});
