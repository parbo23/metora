/**
 * Central icon map. iOS renders SF Symbols through expo-symbols; Android and
 * web fall back to Material Symbols names so previews on Windows still show
 * an icon.
 */
export const icons = {
  settings: { ios: 'gearshape.fill', material: 'settings' },

  camera: { ios: 'camera', material: 'photo_camera' },
  calendar: { ios: 'calendar', material: 'calendar_month' },

  shield: { ios: 'shield.lefthalf.filled', material: 'shield' },
  lock: { ios: 'lock.fill', material: 'lock' },
  check: { ios: 'checkmark', material: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', material: 'check_circle' },
  warning: { ios: 'exclamationmark.triangle.fill', material: 'warning' },
  chevronRight: { ios: 'chevron.right', material: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', material: 'expand_more' },
  plus: { ios: 'plus', material: 'add' },
  photos: { ios: 'photo.on.rectangle', material: 'photo_library' },
  restore: { ios: 'arrow.clockwise', material: 'restore' },
  privacy: { ios: 'hand.raised.fill', material: 'verified_user' },
  document: { ios: 'doc.text', material: 'description' },
  version: { ios: 'number', material: 'tag' },
} as const;

export type IconName = keyof typeof icons;
