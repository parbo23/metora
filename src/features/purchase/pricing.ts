import { copy } from '@/copy/en';
import type { BillingPeriod, PurchasePackage } from '@/services/PurchaseService';

/**
 * Turns a package into the paywall's price lines. Every amount comes from the
 * store's localized strings; only the surrounding words are ours. The intro
 * offer is shown only when RevenueCat confirmed eligibility.
 */
export interface PaywallPricing {
  /** Big price line on the product card, e.g. "$0.49" or "$4.99". */
  headlinePrice: string;
  /** Small label under the big price, e.g. "for 7 days" or "per week". */
  headlineLabel: string;
  /** Primary CTA, e.g. "Start for $0.49" or "Continue with Pro". */
  primaryCta: string;
  /** Supporting line, e.g. "7 days for $0.49, then $4.99/week" or "$4.99/week". */
  supporting: string;
  /** Renewal terms, shown for subscriptions only. */
  renewalNote: string | null;
  showsIntro: boolean;
}

/** "7 days", "1 week", "3 months", "1 year". */
export function formatPeriod(period: BillingPeriod): string {
  const unit = copy.paywall.periodUnits[period.unit];
  const name = period.count === 1 ? unit.one : unit.many;
  return `${period.count} ${name}`;
}

/** "/week", "/month", "/year"; falls back to "/period" for odd counts. */
export function formatPerPeriod(period: BillingPeriod | null): string {
  if (!period) return '';
  if (period.count === 1) return `/${copy.paywall.periodUnits[period.unit].one}`;
  return `/${formatPeriod(period)}`;
}

export function paywallPricing(pkg: PurchasePackage): PaywallPricing {
  const perPeriod = formatPerPeriod(pkg.billingPeriod);
  const regular = `${pkg.priceString}${perPeriod}`;
  const intro = pkg.introOffer;

  if (pkg.isSubscription && intro && pkg.introEligible) {
    const duration = formatPeriod({ unit: intro.period.unit, count: intro.period.count * intro.cycles });
    return {
      headlinePrice: intro.priceString,
      headlineLabel: copy.paywall.introFor(duration),
      primaryCta: copy.paywall.startFor(intro.priceString),
      supporting: copy.paywall.introThen(duration, intro.priceString, regular),
      renewalNote: copy.paywall.renewalNote(perPeriod.replace('/', '')),
      showsIntro: true,
    };
  }

  if (pkg.isSubscription) {
    return {
      headlinePrice: pkg.priceString,
      headlineLabel: copy.paywall.perPeriodLabel(perPeriod.replace('/', '')),
      primaryCta: copy.paywall.continueWithPro,
      supporting: regular,
      renewalNote: copy.paywall.renewalNote(perPeriod.replace('/', '')),
      showsIntro: false,
    };
  }

  // One-time purchase (e.g. a legacy lifetime package).
  return {
    headlinePrice: pkg.priceString,
    headlineLabel: copy.paywall.oneTimeLabel,
    primaryCta: copy.paywall.continueWithPro,
    supporting: copy.paywall.oneTimeSupporting(pkg.priceString),
    renewalNote: null,
    showsIntro: false,
  };
}
