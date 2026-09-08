import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { colors, spacing } from '@/theme';

/** Benefit rows with a teal check. Content comes from PaywallContent. */
export function PaywallBenefits({ benefits }: { benefits: readonly string[] }) {
  return (
    <Card padded={false} style={styles.card}>
      {benefits.map((benefit, index) => (
        <View
          key={benefit}
          style={[styles.row, index > 0 && styles.divider]}
          accessibilityRole="text"
          accessibilityLabel={benefit}
        >
          <Icon name="checkCircle" size={20} color={colors.teal500} />
          <AppText variant="bodyMedium">{benefit}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});
