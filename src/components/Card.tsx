import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

interface CardProps extends ViewProps {
  /** Use the larger radius and shadow for hero-level cards. */
  size?: 'standard' | 'large';
  /** Remove inner padding when children manage their own spacing (lists). */
  padded?: boolean;
}

/** White surface with the board's rounded corners and a very subtle shadow. */
export function Card({ size = 'standard', padded = true, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        size === 'large' ? styles.large : styles.standard,
        padded && styles.padded,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  standard: {
    borderRadius: radius.card,
    ...shadows.card,
  },
  large: {
    borderRadius: radius.large,
    ...shadows.raised,
  },
  padded: {
    padding: spacing.lg,
  },
});
