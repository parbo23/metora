/** Human-readable file size, e.g. "2.4 MB". */
export function formatBytes(bytes: number | undefined): string | undefined {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** "4032 × 3024" */
export function formatDimensions(width: number, height: number): string | undefined {
  if (!width || !height) return undefined;
  return `${width} × ${height}`;
}

const TYPE_LABELS: Record<string, string> = {
  jpg: 'JPEG',
  jpeg: 'JPEG',
  png: 'PNG',
  heic: 'HEIC',
  heif: 'HEIF',
  webp: 'WebP',
  gif: 'GIF',
  tif: 'TIFF',
  tiff: 'TIFF',
  dng: 'DNG (RAW)',
};

/** "HEIC", "JPEG", … from an extension or MIME type. */
export function fileTypeLabel(extension: string, mimeType?: string): string {
  const fromExt = TYPE_LABELS[extension.toLowerCase()];
  if (fromExt) return fromExt;
  const sub = mimeType?.split('/')[1];
  if (sub) return TYPE_LABELS[sub.toLowerCase()] ?? sub.toUpperCase();
  return extension.toUpperCase();
}
