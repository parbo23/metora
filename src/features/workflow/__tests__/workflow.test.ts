import { displayNameFor, extensionFor, isStillImage, toWorkflowPhoto } from '../photoAssets';
import { findPhoto, initialWorkflowState, routeForSelection, workflowReducer } from '../workflowState';

import type { WorkflowPhoto } from '@/types/workflow';

const photo = (id: string): WorkflowPhoto => ({
  id,
  uri: `file:///cache/${id}.jpg`,
  displayName: `${id}.jpg`,
  extension: 'jpg',
  width: 10,
  height: 10,
  addedAt: 0,
});

describe('routeForSelection', () => {
  it('routes one photo to the single flow and several to batch', () => {
    expect(routeForSelection(0)).toBeNull();
    expect(routeForSelection(1)).toBe('single');
    expect(routeForSelection(2)).toBe('batch');
    expect(routeForSelection(40)).toBe('batch');
  });
});

describe('workflowReducer', () => {
  const session = { id: 's1', directoryUri: 'file:///cache/metora-work/s1/' };

  it('tracks picking and clears errors when a new pick starts', () => {
    const failed = workflowReducer(initialWorkflowState, { type: 'pickFailed' });
    expect(failed.error).toBe('unreadable');
    const picking = workflowReducer(failed, { type: 'pickStarted' });
    expect(picking).toMatchObject({ isPicking: true, error: null });
  });

  it('replaces the selection on pick and exposes photos by id', () => {
    const state = workflowReducer(initialWorkflowState, {
      type: 'picked',
      session,
      photos: [photo('a'), photo('b')],
      kind: 'batch',
      skippedCount: 1,
    });
    expect(state.kind).toBe('batch');
    expect(state.skippedCount).toBe(1);
    expect(findPhoto(state, 'b')?.displayName).toBe('b.jpg');
    expect(findPhoto(state, 'zzz')).toBeNull();
    expect(findPhoto(state, undefined)).toBeNull();
  });

  it('returns to the initial state when cleared', () => {
    const state = workflowReducer(initialWorkflowState, {
      type: 'picked',
      session,
      photos: [photo('a')],
      kind: 'single',
      skippedCount: 0,
    });
    expect(workflowReducer(state, { type: 'cleared' })).toEqual(initialWorkflowState);
  });

  it('cancelling only stops the loading state', () => {
    const picking = workflowReducer(initialWorkflowState, { type: 'pickStarted' });
    expect(workflowReducer(picking, { type: 'pickCancelled' })).toEqual(initialWorkflowState);
  });
});

describe('photo asset mapping', () => {
  it('derives extension from the file name, then MIME type, then URI', () => {
    expect(extensionFor({ fileName: 'IMG_0001.HEIC', mimeType: 'image/jpeg', uri: 'file:///x.png' })).toBe(
      'heic',
    );
    expect(extensionFor({ fileName: null, mimeType: 'image/heic', uri: 'file:///x' })).toBe('heic');
    expect(extensionFor({ fileName: undefined, mimeType: undefined, uri: 'file:///a/b/photo.PNG?x=1' })).toBe(
      'png',
    );
    expect(extensionFor({ fileName: undefined, mimeType: undefined, uri: 'blob:abc' })).toBe('jpg');
  });

  it('uses the original file name or a numbered fallback', () => {
    expect(displayNameFor({ fileName: 'Vacation.jpg', uri: '' }, 0)).toBe('Vacation.jpg');
    expect(displayNameFor({ fileName: '/tmp/dir/IMG_2.HEIC', uri: '' }, 0)).toBe('IMG_2.HEIC');
    expect(displayNameFor({ fileName: null, mimeType: 'image/png', uri: '' }, 2)).toBe('Photo 3.png');
  });

  it('only admits still images', () => {
    expect(isStillImage({ type: 'image' })).toBe(true);
    expect(isStillImage({ type: 'livePhoto' })).toBe(true);
    expect(isStillImage({ type: undefined })).toBe(true);
    expect(isStillImage({ type: 'video' })).toBe(false);
    expect(isStillImage({ type: 'pairedVideo' })).toBe(false);
  });

  it('builds a workflow photo without copying any metadata', () => {
    const result = toWorkflowPhoto(
      {
        uri: 'file:///picker/a.heic',
        width: 4032,
        height: 3024,
        fileName: 'IMG_0421.HEIC',
        fileSize: 2_400_000,
        mimeType: 'image/heic',
        exif: { GPSLatitude: 52.3 },
      },
      0,
      'file:///cache/metora-work/s1/IMG_0421.HEIC',
      1_700_000_000_000,
    );
    expect(result).toMatchObject({
      uri: 'file:///cache/metora-work/s1/IMG_0421.HEIC',
      displayName: 'IMG_0421.HEIC',
      extension: 'heic',
      mimeType: 'image/heic',
      width: 4032,
      height: 3024,
      fileSize: 2_400_000,
      addedAt: 1_700_000_000_000,
    });
    expect(JSON.stringify(result)).not.toContain('GPS');
  });
});
