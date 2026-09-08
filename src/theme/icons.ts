/**
 * Central icon map. iOS renders SF Symbols through expo-symbols; Android and
 * web fall back to Material Symbols names so previews on Windows still show
 * an icon.
 */
export const icons = {
  home: { ios: 'house.fill', material: 'home' },
  batch: { ios: 'square.stack.3d.up.fill', material: 'layers' },
  recent: { ios: 'clock.fill', material: 'schedule' },
  settings: { ios: 'gearshape.fill', material: 'settings' },

  location: { ios: 'mappin.and.ellipse', material: 'location_on' },
  calendar: { ios: 'calendar', material: 'calendar_month' },
  device: { ios: 'iphone', material: 'smartphone' },
  camera: { ios: 'camera', material: 'photo_camera' },
  lens: { ios: 'camera.aperture', material: 'camera' },
  software: { ios: 'info.circle', material: 'info' },
  dimensions: { ios: 'aspectratio', material: 'aspect_ratio' },
  file: { ios: 'doc', material: 'description' },
  list: { ios: 'list.bullet', material: 'list' },

  shield: { ios: 'shield.lefthalf.filled', material: 'shield' },
  lock: { ios: 'lock.fill', material: 'lock' },
  check: { ios: 'checkmark', material: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', material: 'check_circle' },
  warning: { ios: 'exclamationmark.triangle.fill', material: 'warning' },
  chevronRight: { ios: 'chevron.right', material: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', material: 'expand_more' },
  arrowRight: { ios: 'arrow.right', material: 'arrow_forward' },
  plus: { ios: 'plus', material: 'add' },
  search: { ios: 'magnifyingglass', material: 'search' },
  photos: { ios: 'photo.on.rectangle', material: 'photo_library' },
  restore: { ios: 'arrow.clockwise', material: 'restore' },
  privacy: { ios: 'hand.raised.fill', material: 'verified_user' },
  document: { ios: 'doc.text', material: 'description' },
  mail: { ios: 'envelope', material: 'mail' },
  version: { ios: 'number', material: 'tag' },
} as const;

export type IconName = keyof typeof icons;
