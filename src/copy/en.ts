/**
 * Single source of truth for user-facing English copy.
 * Strings are taken verbatim from METORA_REACT_NATIVE_BUILD_SPEC.md.
 * Never copy Dutch labels from the design board.
 */
export const copy = {
  brand: 'Metora',

  tabs: {
    home: 'Home',
    batch: 'Batch',
    recent: 'Recent',
    settings: 'Settings',
  },

  home: {
    subtitle: 'What is hidden in your photo?',
    choosePhotos: 'Choose Photos',
    features: [
      { title: 'View EXIF', description: 'See hidden photo details' },
      { title: 'Batch Clean', description: 'Clean multiple photos' },
      { title: 'Privacy First', description: 'Everything stays on your iPhone' },
    ],
  },

  metadata: {
    title: 'Metadata',
    warningTitle: 'This photo contains shareable private data',
    warningBody: 'Location, capture time, or device details may travel with the original file.',
    viewAll: 'View All Metadata',
    removeMetadata: 'Remove Metadata',
    rows: {
      location: 'Location',
      captured: 'Captured',
      device: 'Device',
      camera: 'Camera',
      lens: 'Lens',
      software: 'Software',
      dimensions: 'Dimensions',
      fileType: 'File Type',
      fileSize: 'File Size',
    },
  },

  clean: {
    title: 'Clean Up',
    options: {
      location: { title: 'Remove location only', description: 'GPS coordinates' },
      camera: { title: 'Remove camera info', description: 'Device, lens and camera settings' },
      dateTime: { title: 'Remove date & time', description: 'Capture date and timestamp' },
      all: { title: 'Remove all metadata', description: 'Remove all removable metadata' },
    },
    recommended: 'Recommended',
    trustTitle: 'Your original photo stays untouched',
    trustBody: 'Metora creates a new clean copy.',
    createCleanCopy: 'Create Clean Copy',
  },

  processing: {
    cleaning: 'Cleaning photo…',
    verifying: 'Verifying metadata…',
    batch: (done: number, total: number) => `Cleaning ${done} of ${total}`,
  },

  result: {
    title: 'Done',
    heading: 'Metadata Removed',
    body: 'Your clean copy is ready to save or share.',
    original: 'Original',
    cleanCopy: 'Clean Copy',
    present: 'Present',
    originalRows: {
      location: 'Location',
      camera: 'Camera info',
      captureTime: 'Capture time',
    },
    cleanRows: {
      gps: 'No GPS',
      device: 'No device details',
      camera: 'No camera metadata',
      capture: 'No capture metadata',
    },
    saveCopy: 'Save Copy',
    share: 'Share',
  },

  batch: {
    title: 'Batch',
    emptyTitle: 'Clean multiple photos at once',
    emptyBody: 'Choose photos and remove metadata from all of them in one pass.',
    choosePhotos: 'Choose Photos',
    selected: (count: number) => `${count} photos selected`,
    cleanPhotos: (count: number) => `Clean ${count} Photos`,
    onDeviceTitle: 'Everything stays on your iPhone',
    onDeviceBody: 'Batch cleaning runs on your device. Metora never uploads your photos.',
    recentExports: 'Recent exports',
    seeAll: 'See all exports',
  },

  recent: {
    title: 'Recent',
    clearHistory: 'Clear History',
    emptyTitle: 'No recent activity',
    emptyBody: 'Cleaned photos will appear here.',
  },

  settings: {
    title: 'Settings',
    purchase: 'Purchase',
    lifetimeActive: 'Metora Lifetime — Active',
    restorePurchase: 'Restore Purchase',
    cleaning: 'Cleaning',
    defaultCleanMode: 'Default clean mode',
    defaultCleanModeValue: 'All Metadata',
    keepOriginal: 'Keep original',
    keepOriginalValue: 'Always on',
    privacy: 'Privacy',
    privacyTitle: 'How Metora handles photos',
    privacyBody:
      'Photos are processed on your device. Metora does not upload your photos or metadata to a server.',
    about: 'About',
    version: 'Version',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms',
    contactSupport: 'Contact Support',
  },

  errors: {
    photoUnreadableTitle: "This photo couldn't be opened",
    photoUnreadableBody: 'Try another photo or export a standard copy first.',
    noMetadataTitle: 'No removable metadata found',
    noMetadataBody: 'This photo already looks clean.',
    exportFailedTitle: "Couldn't create a clean copy",
    exportFailedBody: 'Your original photo was not changed. Please try again.',
    verificationFailedTitle: "We couldn't verify this copy",
    verificationFailedBody:
      "Metora won't mark a photo as clean unless it can confirm the metadata is gone.",
    tryAgain: 'Try Again',
  },
} as const;
