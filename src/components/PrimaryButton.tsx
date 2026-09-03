import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';

import { colors, radius, spacing, type IconName } from '@/theme';

interface PrimaryButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  /** primary = filled navy, secondary = outlined navy, text = plain label. */
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
  icon?: IconName;
}

/**
 * Full-width call-to-action from the board: dark navy, white semibold label,
 * ~54 pt tall, rounded 15. Also offers the outlined and text variants used
 * for Share and Restore Purchase.
 */
export function PrimaryButton({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  accessibilityLabel,
  ...rest
}: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled) || loading;
  const labelColor = variant === 'primary' ? 'textOnDark' : 'navy900';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={variant === 'text' ? 8 : undefined}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'text' && styles.text,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textOnDark : colors.navy900} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={colors[labelColor]} /> : null}
          <AppText variant="button" color={labelColor}>
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.navy900,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.navy900,
  },
  text: {
    minHeight: 44,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
