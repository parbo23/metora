import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
}

/**
 * Dynamic Type is supported everywhere, but growth is capped per variant so
 * large accessibility sizes enlarge text without breaking layouts: headlines
 * and buttons grow less than body text.
 */
const MAX_FONT_SCALE: Record<TypographyVariant, number> = {
  hero: 1.3,
  screenTitle: 1.4,
  sectionTitle: 1.5,
  cardHeading: 1.6,
  body: 1.8,
  bodyMedium: 1.8,
  secondary: 1.8,
  secondaryMedium: 1.8,
  caption: 1.8,
  captionMedium: 1.8,
  button: 1.4,
};

/** Thin Text wrapper that applies the type scale and color tokens. */
export function AppText({ variant = 'body', color = 'textPrimary', align, style, ...rest }: AppTextProps) {
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={MAX_FONT_SCALE[variant]}
      {...rest}
      style={[
        typography[variant],
        { color: colors[color] },
        align ? { textAlign: align } : undefined,
        styles.base,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // Keep multi-line text from stretching rows in flex layouts.
    flexShrink: 1,
  },
});
