import type { PurchaseOffering } from '@/services/PurchaseService';

/**
 * QA preview offering — used ONLY when the paywall is opened from
 * Settings → "Preview Paywall (QA)" (development / QA TestFlight builds) and the
 * store returned no pricing. It exists so testers can inspect the paywall and
 * capture App Store review screenshots. It is never used by the export gate,
 * the real paywall flow or production builds, which always render the store's
 * localized RevenueCat / StoreKit pricing.
 */
export const QA_PREVIEW_OFFERING: PurchaseOffering = {
  identifier: 'qa-preview',
  metadata: {},
  packages: [
    {
      identifier: '$rc_weekly',
      packageType: 'weekly',
      productIdentifier: 'metora_pro_weekly',
      title: 'Metora Pro',
      priceString: '€4.99',
      isSubscription: true,
      billingPeriod: { unit: 'week', count: 1 },
      introOffer: { priceString: '€0.49', price: 0.49, period: { unit: 'week', count: 1 }, cycles: 1 },
      introEligible: true,
    },
  ],
};

/** The route param that switches the paywall into preview mode. */
export const PAYWALL_PREVIEW_PARAM = 'preview';
export const PAYWALL_PREVIEW_VALUE = '1';

export function isPaywallPreview(value: string | string[] | undefined): boolean {
  return value === PAYWALL_PREVIEW_VALUE;
}
