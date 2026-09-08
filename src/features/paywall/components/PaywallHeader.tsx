import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { copy } from '@/copy/en';
import { colors, radius, spacing } from '@/theme';

const appIcon = require('@/assets/images/icon.png');

/** App icon + brand name, as specified for the top of Screen 0. */
export function PaywallHeader() {
  return (
    <View style={styles.header}>
      <Image source={appIcon} style={styles.icon} accessibilityLabel="Metora app icon" />
      <AppText variant="hero" color="navy900">
        {copy.brand}
      </AppText>
    </View>
  );
}

/** Compact navy / teal visual: private fields Metora removes. Decorative. */
export function PaywallHeroVisual({ fields = ['GPS', 'Device', 'Date'] }: { fields?: readonly string[] }) {
  return (
    <View style={styles.heroCard} accessibilityElementsHidden importantForAccessibility="no">
      <View style={styles.shield}>
        <Icon name="shield" size={26} color={colors.teal500} />
      </View>
      <View style={styles.pills}>
        {fields.map((field) => (
          <View key={field} style={styles.pill}>
            <AppText variant="captionMedium" style={styles.pillText}>
              {field}
            </AppText>
            <Icon name="check" size={11} color={colors.teal500} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Headline and supporting sentence. */
export function PaywallCopy({ headline, supporting }: { headline: string; supporting: string }) {
  return (
    <View style={styles.copy}>
      <AppText variant="screenTitle" align="center">
        {headline}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {supporting}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  icon: {
    width: 76,
    height: 76,
    borderRadius: radius.card,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.navy900,
    borderRadius: radius.large,
    padding: spacing.lg,
  },
  shield: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.navy800,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  pillText: {
    color: colors.textOnDarkMuted,
    textDecorationLine: 'line-through',
  },
  copy: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
