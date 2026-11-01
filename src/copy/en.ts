/**
 * Single source of truth for user-facing English copy.
 * The paywall section is kept verbatim from the previous product; it is only
 * shown when the paywall is enabled (config/paywall.ts).
 */
export const copy = {
  brand: 'Metora',

  home: {
    subtitle: 'Show what you shot it with',
    emptyTitle: 'Choose a photo to add a frame with its camera info',
    choosePhoto: 'Choose Photo',
    loadingPhoto: 'Loading photo…',
  },

  frame: {
    /** Title line printed on the frame. */
    shotOn: (camera: string) => `Shot on ${camera}`,
    noCameraInfo: 'No camera info found in this photo',
  },

  preview: {
    title: 'Preview',
    reading: 'Reading camera info…',
  },

  export: {
    saving: 'Saving…',
    saveToPhotos: 'Save to Photos',
    share: 'Share',
    done: 'Done',
    savedTitle: 'Saved to Photos',
    savedBody: 'Your framed photo was added as a new photo. The original is untouched.',
    saveDeniedTitle: 'Permission needed to add photos',
    saveDeniedBody: 'Allow "Add Photos Only" in Settings to save the framed photo. Nothing else is accessed.',
    openSettings: 'Open Settings',
    saveFailedTitle: "Couldn't save the photo",
    saveFailedBody: 'Please try again. You can also use Share to send it somewhere else.',
    saveUnavailableTitle: 'Saving is not available here',
    saveUnavailableBody: 'Saving to Photos works on the iPhone build. Use Share instead.',
    shareUnavailableTitle: 'Sharing is not available here',
    shareUnavailableBody: 'The share sheet works on the iPhone build.',
    shareFailedTitle: "Couldn't open the share sheet",
    shareFailedBody: 'Please try again.',
  },

  settings: {
    title: 'Settings',
    purchase: 'Metora Pro',
    proActive: 'Metora Pro — Active',
    proInactive: 'Metora Pro — Not active',
    unlockPro: 'Unlock Metora Pro',
    proInactiveHint: 'Saving and sharing requires Metora Pro.',
    qaBuildTitle: 'QA TestFlight Build',
    qaBuildBody: 'Paywall bypassed for testing. Purchases are not connected in this build.',
    qaPro: 'Metora Pro — QA bypass',
    restorePurchase: 'Restore Purchases',
    previewPaywall: 'Preview Paywall (QA)',
    restoring: 'Restoring…',
    privacy: 'Privacy',
    privacyTitle: 'Everything stays on your iPhone',
    privacyBody: 'Photos are processed on your device and never uploaded to a server.',
    about: 'About',
    version: 'Version',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms',
    linkUnavailableTitle: "Couldn't open the link",
    linkUnavailableBody: 'Please check your connection and try again.',
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
    home: 'Home',
  },

  errors: {
    photoUnreadableTitle: "This photo couldn't be opened",
    photoUnreadableBody: 'Try another photo.',
    photoMissingTitle: 'This photo is no longer available',
    photoMissingBody: 'Choose it again from Home to continue.',
    tryAgain: 'Try Again',
  },
} as const;
