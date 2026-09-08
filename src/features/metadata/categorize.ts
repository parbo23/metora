import type { MetadataCategory } from '@/types/metadata';

/**
 * Maps a parsed tag (container + name) to the category Metora shows and
 * removes. Returns null for structural data that an image needs to render
 * (dimensions, color profile, orientation, encoding parameters) — those are
 * never counted as metadata and never promised to be removed.
 */

/** Containers that only describe the pixel encoding. */
const STRUCTURAL_GROUPS = new Set([
  'file',
  'jfif',
  'pngFile',
  'icc',
  'riff',
  'gif',
  'mpf',
  'composite',
  'metadataRange',
]);

const STRUCTURAL_TAGS = new Set([
  'Exif IFD Pointer',
  'GPS Info IFD Pointer',
  'Interoperability IFD Pointer',
  'InteroperabilityIndex',
  'InteroperabilityVersion',
  'ImageWidth',
  'ImageLength',
  'ImageHeight',
  'Image Width',
  'Image Height',
  'Bit Depth',
  'Bits Per Sample',
  'BitsPerSample',
  'Color Type',
  'Compression',
  'Filter',
  'Interlace',
  'Orientation',
  'PhotometricInterpretation',
  'SamplesPerPixel',
  'PlanarConfiguration',
  'XResolution',
  'YResolution',
  'ResolutionUnit',
  'YCbCrPositioning',
  'YCbCrSubSampling',
  'ExifVersion',
  'FlashpixVersion',
  'ColorSpace',
  'Gamma',
  'PixelXDimension',
  'PixelYDimension',
  'ComponentsConfiguration',
  'CompressedBitsPerPixel',
  'WhitePoint',
  'PrimaryChromaticities',
  'ReferenceBlackWhite',
  'TransferFunction',
  'Pixels Per Unit X',
  'Pixels Per Unit Y',
  'Pixel Units',
  'about',
  'format',
]);

const LOCATION_TAGS = new Set([
  'City',
  'Country',
  'CountryCode',
  'CountryName',
  'State',
  'ProvinceState',
  'Province/State',
  'Sublocation',
  'Sub-location',
  'Location',
  'LocationCreated',
  'LocationShown',
  'Country/Primary Location Name',
  'Country/Primary Location Code',
  'Content Location Name',
  'Content Location Code',
  'WorldRegion',
]);

const TIME_TAGS = new Set([
  'DateTime',
  'DateTimeOriginal',
  'DateTimeDigitized',
  'SubSecTime',
  'SubSecTimeOriginal',
  'SubSecTimeDigitized',
  'OffsetTime',
  'OffsetTimeOriginal',
  'OffsetTimeDigitized',
  'CreateDate',
  'ModifyDate',
  'MetadataDate',
  'DateCreated',
  'DateTimeCreated',
  'Date Created',
  'Time Created',
  'Digital Creation Date',
  'Digital Creation Time',
  'Creation Time',
  'ModificationTime',
  'Modification Time',
  'GPSDateStamp',
  'GPSTimeStamp',
]);

const DEVICE_TAGS = new Set([
  'Make',
  'Model',
  'BodySerialNumber',
  'SerialNumber',
  'CameraSerialNumber',
  'CameraOwnerName',
  'OwnerName',
  'HostComputer',
  'Firmware',
  'FirmwareVersion',
  'UniqueCameraModel',
  'LocalizedCameraModel',
]);

const SOFTWARE_TAGS = new Set(['Software', 'CreatorTool', 'ProcessingSoftware', 'HistorySoftwareAgent']);

const CAMERA_TAGS = new Set([
  'FNumber',
  'ExposureTime',
  'ExposureProgram',
  'ISOSpeedRatings',
  'ISOSpeed',
  'PhotographicSensitivity',
  'SensitivityType',
  'RecommendedExposureIndex',
  'StandardOutputSensitivity',
  'ShutterSpeedValue',
  'ApertureValue',
  'BrightnessValue',
  'ExposureBiasValue',
  'MaxApertureValue',
  'MeteringMode',
  'LightSource',
  'Flash',
  'FocalLength',
  'FocalLengthIn35mmFilm',
  'FocalPlaneXResolution',
  'FocalPlaneYResolution',
  'FocalPlaneResolutionUnit',
  'SubjectArea',
  'SubjectDistance',
  'SubjectDistanceRange',
  'SubjectLocation',
  'ExposureIndex',
  'SensingMethod',
  'FileSource',
  'SceneType',
  'CFAPattern',
  'CustomRendered',
  'ExposureMode',
  'WhiteBalance',
  'DigitalZoomRatio',
  'SceneCaptureType',
  'GainControl',
  'Contrast',
  'Saturation',
  'Sharpness',
  'DeviceSettingDescription',
  'CompositeImage',
  'SourceImageNumberOfCompositeImage',
  'SourceExposureTimesOfCompositeImage',
  'Gamma',
  'ExposureIndex',
  'ApertureValue',
]);

/** Tags whose presence, on its own, counts as privacy-sensitive when in "other". */
const SENSITIVE_OTHER_TAGS = new Set([
  'Artist',
  'Copyright',
  'creator',
  'Creator',
  'By-line',
  'By-line Title',
  'rights',
  'Rights',
  'Credit',
  'Source',
  'Writer/Editor',
  'Contact',
  'CopyrightNotice',
  'Copyright Notice',
  'UserComment',
  'ImageDescription',
  'description',
  'Description',
  'Caption/Abstract',
  'Comment',
  'Author',
  'Title',
  'ImageUniqueID',
  'DocumentID',
  'InstanceID',
  'OriginalDocumentID',
  'Headline',
  'Keywords',
  'subject',
]);

export function categorizeTag(group: string, name: string): MetadataCategory | null {
  if (STRUCTURAL_GROUPS.has(group)) return null;
  if (STRUCTURAL_TAGS.has(name)) return null;
  if (group === 'Thumbnail') return 'other';
  if (group === 'gps' || name.startsWith('GPS')) {
    return TIME_TAGS.has(name) ? 'captureTime' : 'location';
  }
  if (group === 'makerNotes' || name === 'MakerNote') return 'device';
  if (LOCATION_TAGS.has(name)) return 'location';
  if (TIME_TAGS.has(name)) return 'captureTime';
  if (DEVICE_TAGS.has(name)) return 'device';
  if (SOFTWARE_TAGS.has(name)) return 'software';
  if (CAMERA_TAGS.has(name) || name.startsWith('Lens')) return 'camera';
  return 'other';
}

/** Whether a tag should trigger the privacy warning. */
export function isSensitiveTag(category: MetadataCategory | null, name: string): boolean {
  switch (category) {
    case 'location':
    case 'captureTime':
    case 'device':
      return true;
    case 'other':
      return SENSITIVE_OTHER_TAGS.has(name);
    default:
      return false;
  }
}
