import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { links } from '@/config/links';
import { copy } from '@/copy/en';
import { PaywallTemplate } from '@/features/paywall/PaywallTemplate';
import { resolvePaywallContent } from '@/features/paywall/paywallContent';
import { useExportGate } from '@/features/purchase/ExportGateProvider';
import { usePurchases } from '@/features/purchase/PurchaseProvider';
import { paywallPricing } from '@/features/purchase/pricing';
import { QA_PREVIEW_OFFERING, isPaywallPreview } from '@/features/paywall/qaPreview';

/**
 * Metora Pro paywall, presented as a modal when a free user tries to save,
 * share or export a clean copy. It never blocks inspecting, choosing what to
 * remove or creating the clean copy.
 *
 * On unlock (purchase or restore) it dismisses itself and resumes the export
 * that opened it. Closing it without unlocking drops that pending export; the
 * user stays on the Done screen and can retry.
 */
export default function PaywallScreen() {
  const router = useRouter();
  const {
    offering,
    selectedPackage,
    notice,
    isPurchasing,
    isRestoring,
    isUnlocked,
    selectPackage,
    purchaseLifetime,
    restorePurchases,
    loadOffering,
  } = usePurchases();
  const { resumePendingAction, cancelPendingAction } = useExportGate();
  // QA preview (Settings → "Preview Paywall (QA)", dev / QA TestFlight builds only,
  // identified by the ?preview=1 route param). Renders the paywall as for a
  // non-subscriber: real store pricing when available, otherwise a fixed preview
  // offering; no notices, no purchase, no restore, no auto-dismiss. Entitlement
  // state, export gating and production builds are untouched.
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = isPaywallPreview(preview);
  const storeHasPricing = (offering?.packages.length ?? 0) > 0;
  const shownOffering = isPreview && !storeHasPricing ? QA_PREVIEW_OFFERING : offering;
  const shownPackage = isPreview
    ? (shownOffering?.packages.find((pkg) => pkg.identifier === selectedPackage?.identifier) ??
      shownOffering?.packages[0] ??
      null)
    : selectedPackage;
  const shownNotice = isPreview ? ({ kind: 'none' } as const) : notice;

  const content = useMemo(() => resolvePaywallContent(shownOffering), [shownOffering]);
  const primaryCta = shownPackage ? paywallPricing(shownPackage).primaryCta : copy.paywall.continueWithPro;

  // Once Pro is active, close the modal and continue what the user was doing.
  const handled = useRef(false);
  useEffect(() => {
    if (isPreview || !isUnlocked || handled.current) return;
    handled.current = true;
    if (router.canGoBack()) router.back();
    void resumePendingAction();
  }, [isPreview, isUnlocked, resumePendingAction, router]);

  // Dismissed without unlocking (swipe down or "Not now"): forget the pending export.
  useEffect(
    () => () => {
      if (!handled.current) cancelPendingAction();
    },
    [cancelPendingAction],
  );

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const openLink = async (url: string) => {
    try {
      if (Platform.OS === 'web') await Linking.openURL(url);
      else await WebBrowser.openBrowserAsync(url);
    } catch {
      // The link is informational; a failure here should not interrupt the paywall.
    }
  };

  const retry = () => {
    if (notice.kind === 'offeringUnavailable' || !offering) {
      void loadOffering();
    } else {
      void purchaseLifetime();
    }
  };

  return (
    <PaywallTemplate
      templateId={content.template}
      content={content}
      packages={shownOffering?.packages ?? []}
      selectedPackageId={shownPackage?.identifier ?? null}
      primaryCta={primaryCta}
      notice={shownNotice}
      isPurchasing={isPreview ? false : isPurchasing}
      isRestoring={isPreview ? false : isRestoring}
      onSelectPackage={isPreview ? () => {} : selectPackage}
      onPurchase={isPreview ? () => {} : () => void purchaseLifetime()}
      onRestore={isPreview ? () => {} : () => void restorePurchases()}
      onRetry={retry}
      onDismiss={dismiss}
      onTerms={() => void openLink(links.terms)}
      onPrivacy={() => void openLink(links.privacyPolicy)}
    />
  );
}
