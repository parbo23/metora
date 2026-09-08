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
    loadingPhotos: 'Loading photos…',
    features: [
      { title: 'See Hidden Data', description: 'Location, device and time details' },
      { title: 'Batch Clean', description: 'Clean multiple photos' },
      { title: 'Privacy First', description: 'Everything stays on your iPhone' },
    ],
  },

  metadata: {
    title: 'Metadata',
    warningTitle: 'This photo contains shareable private data',
    warningBody: 'Location, capture time, or device details may travel with the original file.',
    viewAll: 'View All Metadata',
    reading: 'Reading metadata…',
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
    orChoose: 'Or choose what to remove',
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
    alreadyCleanHeading: 'Already Clean',
    alreadyCleanBody: 'This photo had no metadata to remove. Your copy is ready to save or share.',
    original: 'Original',
    cleanCopy: 'Clean Copy',
    present: 'Present',
    kept: 'Kept',
    /** "Original" column labels per category. */
    originalRows: {
      location: 'Location',
      captureTime: 'Capture time',
      device: 'Device info',
      camera: 'Camera info',
      software: 'Software',
      other: 'Other data',
    },
    /** "Clean Copy" column labels per verified-removed category. */
    cleanRows: {
      location: 'No GPS',
      device: 'No device details',
      camera: 'No camera metadata',
      captureTime: 'No capture metadata',
      software: 'No software details',
      other: 'No other private data',
    },
    fileDetails: 'File details',
    fileOriginal: 'Original',
    fileCleanCopy: 'Clean copy',
    fileUnknown: 'Unknown',
    saveCopy: 'Save Copy',
    saving: 'Saving…',
    share: 'Share',
    done: 'Done',
    // Save / share feedback. Not in the spec's copy table; written to match its tone.
    savedTitle: 'Saved to Photos',
    savedBody: 'Your clean copy was added as a new photo. The original is untouched.',
    saveDeniedTitle: 'Metora needs permission to add photos',
    saveDeniedBody: 'Allow "Add Photos Only" in Settings to save the clean copy. Nothing else is accessed.',
    openSettings: 'Open Settings',
    saveFailedTitle: "Couldn't save the clean copy",
    saveFailedBody: 'Please try again. You can also use Share to send it somewhere else.',
    saveUnavailableTitle: 'Saving is not available here',
    saveUnavailableBody: 'Saving to Photos works on the iPhone build. Use Share instead.',
    shareUnavailableTitle: 'Sharing is not available here',
    shareUnavailableBody: 'The share sheet works on the iPhone build.',
    shareFailedTitle: "Couldn't open the share sheet",
    shareFailedBody: 'Please try again.',
  },

  batch: {
    title: 'Batch',
    emptyTitle: 'Clean multiple photos at once',
    emptyBody: 'Choose photos and remove metadata from all of them in one pass.',
    choosePhotos: 'Choose Photos',
    selected: (count: number) => (count === 1 ? '1 photo selected' : `${count} photos selected`),
    cleanPhotos: (count: number) => (count === 1 ? 'Clean 1 Photo' : `Clean ${count} Photos`),
    onDeviceTitle: 'Everything stays on your iPhone',
    onDeviceBody: 'Batch cleaning runs on your device. Metora never uploads your photos.',
    recentActivity: 'Recent activity',
    seeAll: 'See all activity',
    cleaningOption: 'Cleaning option',
    clearSelection: 'Clear Selection',
    // Processing and results (spec section 15); feedback strings written to match its tone.
    cleaningProgress: (current: number, total: number) => `Cleaning ${current} of ${total}`,
    verifyingProgress: (current: number, total: number) => `Verifying ${current} of ${total}`,
    summaryCleaned: (count: number) => (count === 1 ? '1 photo cleaned' : `${count} photos cleaned`),
    summaryVerified: (count: number) => `${count} verified`,
    summaryFailed: (count: number) => `${count} failed`,
    allCleanedTitle: 'All photos cleaned',
    allCleanedBody: 'Every clean copy was verified. Save them to Photos or finish.',
    someFailedTitle: 'Some photos could not be cleaned',
    someFailedBody: 'The photos below were not changed. You can retry them.',
    failedHeader: 'Failed photos',
    retryFailed: 'Retry Failed',
    saveAll: 'Save All Copies',
    savingAll: 'Saving…',
    savedAll: (saved: number, total: number) =>
      saved === total
        ? total === 1
          ? 'Saved 1 copy to Photos'
          : `Saved all ${total} copies to Photos`
        : `Saved ${saved} of ${total} copies`,
    savedAllBody: 'Each clean copy was added as a new photo. Your originals are untouched.',
    savePartialBody: 'Some copies could not be saved. You can try again.',
    pendingStatus: 'Waiting',
    cleanedStatus: 'Cleaned',
    skipped: (count: number) =>
      count === 1
        ? "1 photo couldn't be opened and was skipped."
        : `${count} photos couldn't be opened and were skipped.`,
  },

  recent: {
    title: 'Recent',
    clearHistory: 'Clear History',
    emptyTitle: 'No recent activity',
    emptyBody: 'Your cleaning activity will appear here.',
    privacyTitle: 'A local activity log, not a photo archive',
    privacyBody:
      'Metora does not keep your photos or their metadata. Recent only stores a local record of cleaning activity.',
    // Clear confirmation (inline, so it also works on the web preview).
    confirmTitle: 'Clear history?',
    confirmBody: 'This removes the local activity log only. Photos saved to your library are not affected.',
    confirmClear: 'Clear',
    cancel: 'Cancel',
    cleared: 'History cleared',
    // Row content
    today: 'Today',
    yesterday: 'Yesterday',
    onePhoto: '1 photo',
    photos: (count: number) => `${count} photos`,
    statusVerified: 'Verified clean',
    statusFailed: 'Failed',
    statusPartial: (cleaned: number, failed: number) => `${cleaned} cleaned · ${failed} failed`,
    modes: {
      location: 'Location removed',
      camera: 'Camera info removed',
      dateTime: 'Date & time removed',
      all: 'All metadata removed',
      custom: 'Selected metadata removed',
    },
  },

  settings: {
    title: 'Settings',
    purchase: 'Metora Pro',
    proActive: 'Metora Pro — Active',
    proInactive: 'Metora Pro — Not active',
    unlockPro: 'Unlock Metora Pro',
    proInactiveHint: 'Saving and sharing clean copies requires Metora Pro.',
    qaBuildTitle: 'QA TestFlight Build',
    qaBuildBody: 'Paywall bypassed for testing. Purchases are not connected in this build.',
    qaPro: 'Metora Pro — QA bypass',
    restorePurchase: 'Restore Purchases',
    resetOnboarding: 'Reset onboarding (development)',
    previewPaywall: 'Preview Paywall (QA)',
    restoring: 'Restoring…',
    privacy: 'Privacy',
    privacyTitle: 'How Metora handles photos',
    privacyBody:
      'Photos are processed on your device. Metora does not upload your photos or metadata to a server.',
    about: 'About',
    version: 'Version',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms',
    linkUnavailableTitle: "Couldn't open the link",
    linkUnavailableBody: 'Please check your connection and try again.',
  },

  onboarding: {
    skip: 'Skip',
    continue: 'Continue',
    getStarted: 'Get Started',
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    pages: [
      {
        title: 'Your photos reveal more than you think',
        body: 'Location, device details, timestamps and other hidden data can stay attached when you share a photo.',
      },
      {
        title: 'Remove what you don’t want to share',
        body: 'Choose exactly what metadata to remove and keep your personal information private.',
      },
      {
        title: 'Create a clean copy',
        body: 'Metora creates a separate, cleaned copy of your photo. Your original stays untouched.',
      },
      {
        title: 'Private by design',
        body: '',
      },
    ],
    // Verified against the codebase: processing is pure JavaScript on the device,
    // no network call ever carries photo data, and no analytics or ad SDK is included.
    trustPoints: [
      'Photos are processed on your device',
      'Your originals stay untouched',
      'No photo uploads',
      'No tracking',
    ],
    visual: {
      location: 'Location',
      device: 'Device',
      time: 'Time',
      untouched: 'Kept as is',
    },
  },

  paywall: {
    headline: 'Unlock Metora Pro',
    supporting: 'Save and share clean copies of your photos with the hidden data removed.',
    benefits: [
      'Save and share clean photos',
      'Unlimited cleanups',
      'Choose exactly what to remove',
      'Future privacy features',
      'Cancel anytime',
    ],
    productName: 'Metora Pro',
    // Price lines. Every amount is the store's localized string; only the words are ours.
    startFor: (introPrice: string) => `Start for ${introPrice}`,
    continueWithPro: 'Continue with Pro',
    introFor: (duration: string) => `for ${duration}`,
    introThen: (duration: string, introPrice: string, regular: string) =>
      `${duration} for ${introPrice}, then ${regular}`,
    perPeriodLabel: (unit: string) => `per ${unit}`,
    oneTimeLabel: 'one-time purchase',
    oneTimeSupporting: (price: string) => `${price} once. No subscription.`,
    renewalNote: (unit: string) =>
      `Auto-renews every ${unit} until cancelled. Cancel anytime in your App Store subscription settings.`,
    periodUnits: {
      day: { one: 'day', many: 'days' },
      week: { one: 'week', many: 'weeks' },
      month: { one: 'month', many: 'months' },
      year: { one: 'year', many: 'years' },
    },
    restore: 'Restore Purchases',
    terms: 'Terms',
    privacy: 'Privacy',
    notNow: 'Not now',
    priceLoading: 'Loading price…',
    // Purchase feedback, written to match the app's tone.
    unavailableTitle: 'Metora Pro is temporarily unavailable',
    unavailableBody: 'Please check your connection and try again.',
    failedTitle: "The purchase didn't complete",
    failedBody: 'Please try again. If the problem continues, check your App Store connection.',
    pendingTitle: 'Purchase pending',
    pendingBody:
      'Your purchase is waiting for approval. Metora Pro activates automatically once it is confirmed.',
    restoreFailedTitle: "Couldn't restore purchases",
    restoreFailedBody: 'Please check your connection and try again.',
    nothingToRestoreTitle: 'No previous purchase found',
    nothingToRestoreBody: 'Make sure you are signed in with the Apple ID used for the original purchase.',
    restoredTitle: 'Purchase restored',
    restoredBody: 'Metora Pro is active on this device.',
    tryAgain: 'Try Again',
  },

  notFound: {
    title: 'This screen is not available',
    body: 'Go back to Home to choose a photo.',
  },

  errors: {
    photoUnreadableTitle: "This photo couldn't be opened",
    photoUnreadableBody: 'Try another photo or export a standard copy first.',
    photoMissingTitle: 'This photo is no longer available',
    photoMissingBody: 'Choose it again from Home to continue.',
    noMetadataTitle: 'No removable metadata found',
    noMetadataBody: 'This photo already looks clean.',
    exportFailedTitle: "Couldn't create a clean copy",
    exportFailedBody: 'Your original photo was not changed. Please try again.',
    verificationFailedTitle: "We couldn't verify this copy",
    verificationFailedBody: "Metora won't mark a photo as clean unless it can confirm the metadata is gone.",
    unsupportedTitle: "This photo format isn't supported yet",
    unsupportedBody: 'Metora can clean JPEG, HEIC and PNG photos. Your original photo was not changed.',
    tryAgain: 'Try Again',
  },
} as const;
