import { describeFile, fileChanged } from '../fileDetails';

import type { ImageFileInfo } from '@/types/metadata';

const jpeg: ImageFileInfo = {
  format: 'jpeg',
  byteLength: 612_345,
  width: 2048,
  height: 1536,
  displayWidth: 1536,
  displayHeight: 2048,
  orientation: 6,
};

describe('describeFile', () => {
  it('shows format, displayed dimensions and size', () => {
    expect(describeFile(jpeg)).toBe('JPEG · 1536 × 2048 · 598 KB');
  });

  it('falls back to Unknown when dimensions could not be read', () => {
    expect(describeFile({ ...jpeg, format: 'other', displayWidth: null, displayHeight: null })).toBe(
      'Unknown · Unknown · 598 KB',
    );
  });
});

describe('fileChanged', () => {
  it('detects a format or pixel-size change between working copy and clean copy', () => {
    expect(fileChanged(jpeg, jpeg)).toBe(false);
    expect(fileChanged(jpeg, { ...jpeg, format: 'png' })).toBe(true);
    expect(fileChanged(jpeg, { ...jpeg, width: 1448, height: 1086 })).toBe(true);
    expect(fileChanged(jpeg, { ...jpeg, byteLength: 10 })).toBe(false);
  });
});
