import { deviceLabel } from './normalize';

import { copy } from '@/copy/en';
import type { IconName } from '@/theme';
import type { MetadataSnapshot, RawMetadataEntry } from '@/types/metadata';
import type { WorkflowPhoto } from '@/types/workflow';
import { formatCaptureDate } from '@/utils/exifDate';
import { fileTypeLabel, formatBytes, formatDimensions } from '@/utils/format';

export interface MetadataDisplayRow {
  key: string;
  icon: IconName;
  title: string;
  value: string;
}

/** "52.3676° N, 4.9041° E" — shown when no embedded place name exists. */
export function formatCoordinates(latitude?: number, longitude?: number): string | undefined {
  if (latitude === undefined || longitude === undefined) return undefined;
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lon}`;
}

/** "24 mm · ƒ/1.8 · ISO 80" */
export function cameraLine(snapshot: MetadataSnapshot): string | undefined {
  const parts = [
    snapshot.focalLength,
    snapshot.aperture,
    snapshot.iso !== undefined ? `ISO ${snapshot.iso}` : undefined,
    snapshot.exposureTime ? `${snapshot.exposureTime} s` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/**
 * Human-readable rows for the Metadata screen, in the spec's order. Rows are
 * only produced when data exists. File facts come from the picker asset.
 */
export function metadataRows(snapshot: MetadataSnapshot, photo: WorkflowPhoto): MetadataDisplayRow[] {
  const rows = copy.metadata.rows;
  const location =
    snapshot.location?.placeName ??
    formatCoordinates(snapshot.location?.latitude, snapshot.location?.longitude);
  const captured = snapshot.capturedAt ? formatCaptureDate(snapshot.capturedAt) : snapshot.capturedAtText;
  const device = deviceLabel(snapshot.make, snapshot.model);
  const camera = cameraLine(snapshot);

  const candidates: { key: string; icon: IconName; title: string; value?: string }[] = [
    { key: 'location', icon: 'location', title: rows.location, value: location },
    { key: 'captured', icon: 'calendar', title: rows.captured, value: captured },
    { key: 'device', icon: 'device', title: rows.device, value: device },
    { key: 'camera', icon: 'camera', title: rows.camera, value: camera },
    { key: 'lens', icon: 'lens', title: rows.lens, value: snapshot.lensModel },
    { key: 'software', icon: 'software', title: rows.software, value: snapshot.software },
    {
      key: 'dimensions',
      icon: 'dimensions',
      title: rows.dimensions,
      value: formatDimensions(photo.width, photo.height),
    },
    {
      key: 'fileType',
      icon: 'file',
      title: rows.fileType,
      value: fileTypeLabel(photo.extension, photo.mimeType),
    },
    { key: 'fileSize', icon: 'file', title: rows.fileSize, value: formatBytes(photo.fileSize) },
  ];

  return candidates.filter((row): row is MetadataDisplayRow => Boolean(row.value));
}

const GROUP_LABELS: Record<string, string> = {
  exif: 'EXIF',
  iptc: 'IPTC',
  xmp: 'XMP',
  png: 'PNG',
  pngText: 'PNG text',
  photoshop: 'Photoshop',
  makerNotes: 'Maker notes',
  icc: 'Color profile',
};

export function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

/** Raw entries sorted by container then tag name, for "View All Metadata". */
export function sortedRawEntries(raw: RawMetadataEntry[]): RawMetadataEntry[] {
  const order = ['exif', 'iptc', 'xmp', 'png', 'pngText', 'photoshop', 'makerNotes'];
  return [...raw].sort((a, b) => {
    const ga = order.indexOf(a.group);
    const gb = order.indexOf(b.group);
    if (ga !== gb) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb);
    return a.name.localeCompare(b.name);
  });
}
