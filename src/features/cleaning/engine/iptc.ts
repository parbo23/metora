import { ByteReader, ByteWriter, concat } from './bytes';

import { categorizeTag } from '@/features/metadata/categorize';
import type { MetadataCategory } from '@/types/metadata';

/**
 * Photoshop Image Resource Blocks (JPEG APP13 "Photoshop 3.0") carry IPTC-IIM
 * datasets in resource 0x0404. This editor filters IPTC datasets by category
 * and keeps every other resource byte-for-byte.
 */

export class IptcParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IptcParseError';
  }
}

export const PHOTOSHOP_HEADER = 'Photoshop 3.0\0';
const IPTC_RESOURCE_ID = 0x0404;

/** IPTC record 2 dataset numbers → the names ExifReader reports. */
const IPTC_DATASET_NAMES: Record<number, string> = {
  5: 'Object Name',
  7: 'Edit Status',
  10: 'Urgency',
  15: 'Category',
  20: 'Supplemental Category',
  22: 'Fixture Identifier',
  25: 'Keywords',
  26: 'Content Location Code',
  27: 'Content Location Name',
  30: 'Release Date',
  35: 'Release Time',
  37: 'Expiration Date',
  38: 'Expiration Time',
  40: 'Special Instructions',
  55: 'Date Created',
  60: 'Time Created',
  62: 'Digital Creation Date',
  63: 'Digital Creation Time',
  65: 'Originating Program',
  70: 'Program Version',
  80: 'By-line',
  85: 'By-line Title',
  90: 'City',
  92: 'Sub-location',
  95: 'Province/State',
  100: 'Country/Primary Location Code',
  101: 'Country/Primary Location Name',
  103: 'Original Transmission Reference',
  105: 'Headline',
  110: 'Credit',
  115: 'Source',
  116: 'Copyright Notice',
  118: 'Contact',
  120: 'Caption/Abstract',
  122: 'Writer/Editor',
};

interface Resource {
  id: number;
  name: Uint8Array; // raw pascal string incl. length byte and padding
  data: Uint8Array;
}

function parseResources(payload: Uint8Array): Resource[] {
  const reader = new ByteReader(payload);
  const resources: Resource[] = [];
  let cursor = 0;
  while (cursor + 12 <= payload.length) {
    if (reader.ascii(cursor, 4) !== '8BIM') throw new IptcParseError('bad resource signature');
    const id = reader.u16(cursor + 4);
    const nameLength = reader.u8(cursor + 6);
    const namePadded = (nameLength + 1) % 2 === 0 ? nameLength + 1 : nameLength + 2;
    const name = payload.slice(cursor + 6, cursor + 6 + namePadded);
    const sizeOffset = cursor + 6 + namePadded;
    const size = reader.u32(sizeOffset);
    const dataStart = sizeOffset + 4;
    if (dataStart + size > payload.length) throw new IptcParseError('resource overruns payload');
    resources.push({ id, name, data: payload.slice(dataStart, dataStart + size) });
    cursor = dataStart + size + (size % 2);
  }
  return resources;
}

function serializeResources(resources: Resource[]): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const resource of resources) {
    const w = new ByteWriter();
    w.ascii('8BIM').u16(resource.id).bytes(resource.name).u32(resource.data.length).bytes(resource.data);
    if (resource.data.length % 2 === 1) w.u8(0);
    parts.push(w.toUint8Array());
  }
  return concat(parts);
}

interface Dataset {
  record: number;
  dataset: number;
  data: Uint8Array;
}

function parseDatasets(iim: Uint8Array): Dataset[] {
  const reader = new ByteReader(iim);
  const datasets: Dataset[] = [];
  let cursor = 0;
  while (cursor + 5 <= iim.length) {
    if (reader.u8(cursor) !== 0x1c) throw new IptcParseError('bad dataset marker');
    const record = reader.u8(cursor + 1);
    const dataset = reader.u8(cursor + 2);
    let length = reader.u16(cursor + 3);
    let dataStart = cursor + 5;
    if (length & 0x8000) {
      const lengthBytes = length & 0x7fff;
      if (lengthBytes > 4) throw new IptcParseError('extended dataset too long');
      length = 0;
      for (let i = 0; i < lengthBytes; i += 1) length = length * 256 + reader.u8(dataStart + i);
      dataStart += lengthBytes;
    }
    if (dataStart + length > iim.length) throw new IptcParseError('dataset overruns block');
    datasets.push({ record, dataset, data: iim.slice(dataStart, dataStart + length) });
    cursor = dataStart + length;
  }
  return datasets;
}

function serializeDatasets(datasets: Dataset[]): Uint8Array {
  const w = new ByteWriter();
  for (const d of datasets) {
    w.u8(0x1c).u8(d.record).u8(d.dataset);
    if (d.data.length < 0x8000) {
      w.u16(d.data.length);
    } else {
      w.u16(0x8004).u32(d.data.length);
    }
    w.bytes(d.data);
  }
  return w.toUint8Array();
}

/**
 * Filters IPTC datasets in an APP13 payload (after the "Photoshop 3.0\0"
 * header). Non-IPTC resources are preserved unchanged.
 */
export function cleanPhotoshopIrb(
  payload: Uint8Array,
  remove: ReadonlySet<MetadataCategory>,
): { bytes: Uint8Array; removed: number } {
  const resources = parseResources(payload);
  let removed = 0;
  const kept: Resource[] = [];
  for (const resource of resources) {
    if (resource.id !== IPTC_RESOURCE_ID) {
      kept.push(resource);
      continue;
    }
    const datasets = parseDatasets(resource.data);
    const remaining = datasets.filter((d) => {
      if (d.record !== 2) return true;
      const category = categorizeTag('iptc', IPTC_DATASET_NAMES[d.dataset] ?? `Dataset${d.dataset}`);
      if (category !== null && remove.has(category)) {
        removed += 1;
        return false;
      }
      return true;
    });
    if (remaining.length > 0) kept.push({ ...resource, data: serializeDatasets(remaining) });
  }
  return { bytes: serializeResources(kept), removed };
}
