import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
}

/** Thin Text wrapper that applies the type scale and color tokens. */
export function AppText({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      allowFontScaling
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
