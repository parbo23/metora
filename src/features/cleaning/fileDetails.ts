import { copy } from '@/copy/en';
import type { ImageFileInfo } from '@/types/metadata';
import { fileTypeLabel, formatBytes } from '@/utils/format';

/** "JPEG · 1536 × 2048 · 612 KB" — format, displayed dimensions, size. */
export function describeFile(info: ImageFileInfo): string {
  const format = info.format === 'other' ? copy.result.fileUnknown : fileTypeLabel(info.format);
  const dims =
    info.displayWidth && info.displayHeight
      ? `${info.displayWidth} × ${info.displayHeight}`
      : copy.result.fileUnknown;
  return `${format} · ${dims} · ${formatBytes(info.byteLength) ?? copy.result.fileUnknown}`;
}

/** True when the clean copy differs from the working copy in format or pixel size. */
export function fileChanged(original: ImageFileInfo, output: ImageFileInfo): boolean {
  return (
    original.format !== output.format || original.width !== output.width || original.height !== output.height
  );
}
