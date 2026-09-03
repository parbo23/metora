import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';

import { colors, radius, spacing, type IconName } from '@/theme';

type PrivacyCardVariant = 'warning' | 'success' | 'neutral';

interface PrivacyCardProps {
  variant: PrivacyCardVariant;
  title: string;
  body?: string;
  icon?: IconName;
}

const variantStyles: Record<
  PrivacyCardVariant,
  { background: string; text: string; icon: IconName }
> = {
  warning: { background: colors.warningBackground, text: colors.warningText, icon: 'warning' },
  success: { background: colors.successBackground, text: colors.textPrimary, icon: 'lock' },
  neutral: { background: colors.navySoft, text: colors.textPrimary, icon: 'shield' },
};

/**
 * Soft informational card. Warning uses the pale yellow from the board, never
 * red; success uses the pale green trust card; neutral is a navy tint.
 */
export function PrivacyCard({ variant, title, body, icon }: PrivacyCardProps) {
  const theme = variantStyles[variant];
  const iconColor = variant === 'success' ? colors.green500 : variant === 'neutral' ? colors.navy800 : theme.text;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={body ? `${title}. ${body}` : title}
      style={[styles.card, { backgroundColor: theme.background }]}>
      <Icon name={icon ?? theme.icon} size={22} color={iconColor} style={styles.icon} />
      <View style={styles.text}>
        <AppText variant="cardHeading" style={{ color: theme.text }}>
          {title}
        </AppText>
        {body ? (
          <AppText variant="secondary" style={{ color: variant === 'warning' ? theme.text : colors.textSecondary }}>
            {body}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
});
