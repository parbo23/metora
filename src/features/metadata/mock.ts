import type { ImageSourcePropType } from 'react-native';

import type { IconName } from '@/theme';
import type { CleanMode, MetadataSnapshot } from '@/types/metadata';

/**
 * Static mock data for the Phase 1 visual skeleton.
 * Replaced by real picker output and ExifReader results in Phases 3 and 4.
 */
export interface MockPhoto {
  id: string;
  fileName: string;
  source: ImageSourcePropType;
}

export const mockPhoto: MockPhoto = {
  id: 'mock-1',
  fileName: 'Vacation.jpg',
  source: require('@/assets/images/mock-photo.jpg'),
};

export const mockSnapshot: MetadataSnapshot = {
  hasMetadata: true,
  location: { latitude: 52.3676, longitude: 4.9041 },
  capturedAt: new Date(2026, 8, 3, 14, 32),
  make: 'Apple',
  model: 'iPhone 17 Pro',
  lensModel: 'iPhone 17 Pro back camera 24mm f/1.8',
  focalLength: '24 mm',
  aperture: 'ƒ/1.8',
  iso: 80,
  software: 'iOS 26',
};

export interface MockMetadataRow {
  key: string;
  icon: IconName;
  title: string;
  value: string;
}

/** Human-readable rows exactly as the Metadata screen will display them. */
export const mockMetadataRows: MockMetadataRow[] = [
  { key: 'location', icon: 'location', title: 'Location', value: 'Amsterdam, Netherlands' },
  { key: 'captured', icon: 'calendar', title: 'Captured', value: 'Sep 3, 2026 · 2:32 PM' },
  { key: 'device', icon: 'device', title: 'Device', value: 'iPhone 17 Pro' },
  { key: 'camera', icon: 'camera', title: 'Camera', value: '24 mm · ƒ/1.8 · ISO 80' },
  { key: 'software', icon: 'software', title: 'Software', value: 'iOS 26' },
];

export const defaultCleanMode: CleanMode = 'all';

export interface MockRecentItem {
  id: string;
  fileName: string;
  status: string;
  when: string;
  source: ImageSourcePropType;
}

export const mockRecentItems: MockRecentItem[] = [
  {
    id: 'r1',
    fileName: 'Vacation.jpg',
    status: 'Metadata removed',
    when: 'Today · 2:32 PM',
    source: require('@/assets/images/mock-photo.jpg'),
  },
  {
    id: 'r2',
    fileName: 'Listing-photo.heic',
    status: 'Metadata removed',
    when: 'Today · 11:08 AM',
    source: require('@/assets/images/mock-photo.jpg'),
  },
  {
    id: 'r3',
    fileName: 'Kids-park.jpg',
    status: 'Location removed',
    when: 'Yesterday · 6:42 PM',
    source: require('@/assets/images/mock-photo.jpg'),
  },
];
