import { Pressable, StyleSheet, View } from 'react-native';

import { PaywallActions } from './components/PaywallActions';
import { PaywallBenefits } from './components/PaywallBenefits';
import { PaywallCopy, PaywallHeader, PaywallHeroVisual } from './components/PaywallHeader';
import { PaywallNotice } from './components/PaywallNotice';
import { PaywallPackages } from './components/PaywallPackages';
import type { PaywallContent, PaywallTemplateId } from './paywallContent';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import type { PurchaseNotice } from '@/features/purchase/purchaseState';
import type { PurchasePackage } from '@/services/PurchaseService';
import { spacing } from '@/theme';

/**
 * Everything a paywall layout needs. Templates are pure presentation: they
 * receive content + offering packages + callbacks and never talk to the store.
 * A future variant adds a new template component and a case in PaywallTemplate.
 */
export interface PaywallTemplateProps {
  content: PaywallContent;
  packages: readonly PurchasePackage[];
  selectedPackageId: string | null;
  /** CTA derived from the selected package's store pricing. */
  primaryCta: string;
  notice: PurchaseNotice;
  isPurchasing: boolean;
  isRestoring: boolean;
  onSelectPackage: (packageId: string) => void;
  onPurchase: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}

/** The standard layout: dismissible modal with hero, benefits, price card and CTA. */
export function StandardPaywallTemplate({
  content,
  packages,
  selectedPackageId,
  primaryCta,
  notice,
  isPurchasing,
  isRestoring,
  onSelectPackage,
  onPurchase,
  onRestore,
  onRetry,
  onDismiss,
  onTerms,
  onPrivacy,
}: PaywallTemplateProps) {
  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {/* Feedback sits above the CTA so it is always visible without scrolling. */}
          <PaywallNotice notice={notice} onRetry={onRetry} />
          <PaywallActions
            primaryCta={primaryCta}
            restoreCta={content.restoreCta}
            termsCta={content.termsCta}
            privacyCta={content.privacyCta}
            isPurchasing={isPurchasing}
            isRestoring={isRestoring}
            canPurchase={selectedPackageId !== null}
            onPurchase={onPurchase}
            onRestore={onRestore}
            onTerms={onTerms}
            onPrivacy={onPrivacy}
          />
        </View>
      }
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={onDismiss}
          disabled={isPurchasing || isRestoring}
          accessibilityRole="button"
          accessibilityLabel={content.dismissCta}
          hitSlop={12}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
        >
          <AppText variant="secondaryMedium" color="textSecondary">
            {content.dismissCta}
          </AppText>
        </Pressable>
      </View>
      <PaywallHeader />
      <PaywallHeroVisual />
      <PaywallCopy headline={content.headline} supporting={content.supporting} />
      <PaywallBenefits benefits={content.benefits} />
      <PaywallPackages
        packages={packages}
        selectedPackageId={selectedPackageId}
        onSelect={onSelectPackage}
        productName={content.productName}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: -spacing.lg,
  },
  dismiss: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});

/**
 * Renders the template named by the resolved content. Add a case here when a
 * new layout variant is introduced; unknown ids fall back to the standard one.
 */
export function PaywallTemplate({
  templateId,
  ...props
}: PaywallTemplateProps & { templateId: PaywallTemplateId }) {
  switch (templateId) {
    case 'standard':
    default:
      return <StandardPaywallTemplate {...props} />;
  }
}
