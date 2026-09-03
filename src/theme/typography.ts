import type { TextStyle } from 'react-native';

/**
 * Type scale. The system font is used everywhere (San Francisco on iOS),
 * so no fontFamily is set on native.
 */
export const typography = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  screenTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  cardHeading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyMedium: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  secondaryMedium: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  captionMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
