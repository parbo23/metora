import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { copy } from '@/copy/en';
import type { PurchaseNotice } from '@/features/purchase/purchaseState';
import { spacing } from '@/theme';

interface PaywallNoticeProps {
  notice: PurchaseNotice;
  onRetry: () => void;
}

/** Calm feedback for unavailable / failed / pending / restore outcomes. */
export function PaywallNotice({ notice, onRetry }: PaywallNoticeProps) {
  switch (notice.kind) {
    case 'none':
      return null;
    case 'offeringUnavailable':
      return (
        <View style={styles.stack}>
          <PrivacyCard
            variant="warning"
            title={copy.paywall.unavailableTitle}
            body={copy.paywall.unavailableBody}
          />
          <PrimaryButton title={copy.paywall.tryAgain} variant="secondary" onPress={onRetry} />
        </View>
      );
    case 'purchaseFailed': {
      const unavailable = notice.reason === 'unavailable';
      return (
        <View style={styles.stack}>
          <PrivacyCard
            variant="warning"
            title={unavailable ? copy.paywall.unavailableTitle : copy.paywall.failedTitle}
            body={unavailable ? copy.paywall.unavailableBody : copy.paywall.failedBody}
          />
          <PrimaryButton title={copy.paywall.tryAgain} variant="secondary" onPress={onRetry} />
        </View>
      );
    }
    case 'purchasePending':
      return (
        <PrivacyCard variant="neutral" title={copy.paywall.pendingTitle} body={copy.paywall.pendingBody} />
      );
    case 'restoreFailed':
      return (
        <PrivacyCard
          variant="warning"
          title={copy.paywall.restoreFailedTitle}
          body={copy.paywall.restoreFailedBody}
        />
      );
    case 'nothingToRestore':
      return (
        <PrivacyCard
          variant="neutral"
          icon="restore"
          title={copy.paywall.nothingToRestoreTitle}
          body={copy.paywall.nothingToRestoreBody}
        />
      );
    case 'restored':
      return (
        <PrivacyCard variant="success" title={copy.paywall.restoredTitle} body={copy.paywall.restoredBody} />
      );
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
});
