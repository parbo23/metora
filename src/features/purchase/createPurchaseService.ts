import { Platform } from 'react-native';

import { isQaPaywallBypassEnabled } from '@/config/qa';
import { PreviewPurchaseService } from '@/services/PreviewPurchaseService';
import { QaBypassPurchaseService } from '@/services/QaBypassPurchaseService';
import type { PurchaseService } from '@/services/PurchaseService';
import { RevenueCatPurchaseService } from '@/services/RevenueCatPurchaseService';

/**
 * Chooses the purchase implementation for the current platform.
 *
 * - QA TestFlight builds: paywall bypass, no store (see config/qa.ts).
 * - iOS / Android: RevenueCat, always. Needs an EAS development build and the
 *   public API key from `.env` (`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`).
 * - Web: the preview service, because web is only used for layout checks on
 *   Windows and has no store.
 */
export function createPurchaseService(): PurchaseService {
  // TestFlight QA builds only (EXPO_PUBLIC_QA_BYPASS_PAYWALL=true in the
  // `testflight` EAS profile). RevenueCat is not configured at all here.
  if (isQaPaywallBypassEnabled()) {
    return new QaBypassPurchaseService();
  }

  if (Platform.OS === 'web') {
    return new PreviewPurchaseService();
  }

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  return new RevenueCatPurchaseService({
    apiKey: apiKey ?? '',
    debugLogging: __DEV__,
  });
}
