import { copy } from '@/copy/en';
import type { PurchaseOffering } from '@/services/PurchaseService';

/**
 * Everything the paywall template renders, separated from the purchase logic.
 *
 * Defaults come from the English copy file. An offering served by RevenueCat
 * may override any field through its dashboard metadata, e.g.
 *
 *   { "paywall": { "template": "standard", "headline": "…", "benefits": ["…"] } }
 *
 * so a future A/B test can change copy or layout without a code change. Only
 * well-typed values are accepted; anything else falls back to the default.
 * Prices and CTAs that contain prices are never part of content: they are
 * derived from the store's localized strings (see purchase/pricing.ts).
 */
export type PaywallTemplateId = 'standard';

export interface PaywallContent {
  template: PaywallTemplateId;
  headline: string;
  supporting: string;
  benefits: readonly string[];
  /** Product card title, e.g. "Metora Pro". */
  productName: string;
  restoreCta: string;
  termsCta: string;
  privacyCta: string;
  dismissCta: string;
}

export const defaultPaywallContent: PaywallContent = {
  template: 'standard',
  headline: copy.paywall.headline,
  supporting: copy.paywall.supporting,
  benefits: copy.paywall.benefits,
  productName: copy.paywall.productName,
  restoreCta: copy.paywall.restore,
  termsCta: copy.paywall.terms,
  privacyCta: copy.paywall.privacy,
  dismissCta: copy.paywall.notNow,
};

const TEMPLATE_IDS: readonly PaywallTemplateId[] = ['standard'];

/** Metadata key under which paywall overrides live in a RevenueCat offering. */
export const PAYWALL_METADATA_KEY = 'paywall';

function readString(source: Record<string, unknown>, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readStringList(
  source: Record<string, unknown>,
  key: string,
  fallback: readonly string[],
): readonly string[] {
  const value = source[key];
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return strings.length > 0 ? strings : fallback;
}

function readTemplate(source: Record<string, unknown>): PaywallTemplateId {
  const value = source.template;
  return TEMPLATE_IDS.find((id) => id === value) ?? defaultPaywallContent.template;
}

/** Merges offering metadata overrides onto the default content. */
export function resolvePaywallContent(offering: PurchaseOffering | null): PaywallContent {
  const overrides = offering?.metadata[PAYWALL_METADATA_KEY];
  if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
    return defaultPaywallContent;
  }
  const source = overrides as Record<string, unknown>;
  return {
    template: readTemplate(source),
    headline: readString(source, 'headline', defaultPaywallContent.headline),
    supporting: readString(source, 'supporting', defaultPaywallContent.supporting),
    benefits: readStringList(source, 'benefits', defaultPaywallContent.benefits),
    productName: readString(source, 'productName', defaultPaywallContent.productName),
    restoreCta: readString(source, 'restoreCta', defaultPaywallContent.restoreCta),
    termsCta: defaultPaywallContent.termsCta,
    privacyCta: defaultPaywallContent.privacyCta,
    dismissCta: readString(source, 'dismissCta', defaultPaywallContent.dismissCta),
  };
}
