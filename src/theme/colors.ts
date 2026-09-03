/**
 * Metora color tokens. Starting values come straight from the build spec.
 * Light appearance only in v1. Never use raw hex values in components.
 */
export const colors = {
  navy900: '#071B3C',
  navy800: '#0B2A58',
  teal500: '#18B7A5',
  green500: '#27B45E',
  background: '#F7F9FC',
  card: '#FFFFFF',
  textPrimary: '#0B1833',
  textSecondary: '#667085',
  divider: '#E7EBF2',
  warningBackground: '#FFF6DC',
  warningText: '#8A5A00',
  successBackground: '#EAF8EF',
  danger: '#D92D20',

  // Derived tints used for icon badges and selected states.
  navySoft: '#EEF2F8',
  tealSoft: '#E3F7F4',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255, 255, 255, 0.72)',
} as const;

export type ColorToken = keyof typeof colors;
