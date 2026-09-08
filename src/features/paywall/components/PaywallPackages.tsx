import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { copy } from '@/copy/en';
import { paywallPricing } from '@/features/purchase/pricing';
import type { PurchasePackage } from '@/services/PurchaseService';
import { colors, radius, spacing } from '@/theme';

interface PaywallPackagesProps {
  packages: readonly PurchasePackage[];
  selectedPackageId: string | null;
  onSelect: (packageId: string) => void;
  productName: string;
}

/**
 * Renders whatever packages the current offering contains, with prices taken
 * from the store. One package (today's weekly Pro plan) shows the product card:
 * intro price and duration when the user is eligible, otherwise the regular
 * price. Several packages render as selectable cards.
 */
export function PaywallPackages({
  packages,
  selectedPackageId,
  onSelect,
  productName,
}: PaywallPackagesProps) {
  if (packages.length === 0) {
    return <LoadingCard name={productName} />;
  }

  if (packages.length === 1) {
    return <ProductCard name={productName} pkg={packages[0]} />;
  }

  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {packages.map((pkg) => {
        const selected = pkg.identifier === selectedPackageId;
        const pricing = paywallPricing(pkg);
        return (
          <Pressable
            key={pkg.identifier}
            onPress={() => onSelect(pkg.identifier)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={`${pkg.title}, ${pricing.supporting}`}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.optionText}>
              <AppText variant="cardHeading">{pkg.title}</AppText>
              <AppText variant="secondary" color="textSecondary">
                {pricing.supporting}
              </AppText>
            </View>
            <View style={[styles.indicator, selected && styles.indicatorSelected]}>
              {selected ? <Icon name="check" size={13} color={colors.textOnDark} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProductCard({ name, pkg }: { name: string; pkg: PurchasePackage }) {
  const pricing = paywallPricing(pkg);
  return (
    <Card
      size="large"
      style={styles.product}
      accessibilityRole="summary"
      accessibilityLabel={`${name}. ${pricing.supporting}. ${pricing.renewalNote ?? ''}`}
    >
      <AppText variant="cardHeading" color="textSecondary">
        {name}
      </AppText>
      <AppText variant="hero" color="navy900">
        {pricing.headlinePrice}
      </AppText>
      <AppText variant="secondaryMedium">{pricing.headlineLabel}</AppText>
      <AppText variant="secondary" color="textSecondary" align="center">
        {pricing.supporting}
      </AppText>
      {pricing.renewalNote ? (
        <AppText variant="caption" color="textSecondary" align="center" style={styles.renewal}>
          {pricing.renewalNote}
        </AppText>
      ) : null}
    </Card>
  );
}

function LoadingCard({ name }: { name: string }) {
  return (
    <Card
      size="large"
      style={styles.product}
      accessibilityRole="summary"
      accessibilityLabel={copy.paywall.priceLoading}
    >
      <AppText variant="cardHeading" color="textSecondary">
        {name}
      </AppText>
      <AppText variant="secondary" color="textSecondary">
        {copy.paywall.priceLoading}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  product: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
  },
  renewal: {
    paddingTop: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.card,
    minHeight: 72,
  },
  optionSelected: {
    borderColor: colors.teal500,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: {
    backgroundColor: colors.teal500,
    borderColor: colors.teal500,
  },
});
