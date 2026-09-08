import { formatPeriod, formatPerPeriod, paywallPricing } from '../pricing';

import type { PurchasePackage } from '@/services/PurchaseService';

const weekly: PurchasePackage = {
  identifier: '$rc_weekly',
  packageType: 'weekly',
  productIdentifier: 'metora_pro_weekly',
  title: 'Metora Pro',
  priceString: '$4.99',
  isSubscription: true,
  billingPeriod: { unit: 'week', count: 1 },
  introOffer: { priceString: '$0.49', price: 0.49, period: { unit: 'day', count: 7 }, cycles: 1 },
  introEligible: true,
};

describe('paywallPricing', () => {
  it('renders the intro offer when eligible', () => {
    const p = paywallPricing(weekly);
    expect(p.showsIntro).toBe(true);
    expect(p.primaryCta).toBe('Start for $0.49');
    expect(p.supporting).toBe('7 days for $0.49, then $4.99/week');
    expect(p.headlinePrice).toBe('$0.49');
    expect(p.headlineLabel).toBe('for 7 days');
    expect(p.renewalNote).toContain('Auto-renews every week');
  });

  it('falls back to the regular price when not eligible or when there is no intro offer', () => {
    for (const pkg of [
      { ...weekly, introEligible: false },
      { ...weekly, introOffer: null, introEligible: false },
    ]) {
      const p = paywallPricing(pkg);
      expect(p.showsIntro).toBe(false);
      expect(p.primaryCta).toBe('Continue with Pro');
      expect(p.supporting).toBe('$4.99/week');
      expect(p.headlinePrice).toBe('$4.99');
      expect(p.headlineLabel).toBe('per week');
    }
  });

  it('describes a one-time package without renewal terms', () => {
    const p = paywallPricing({
      ...weekly,
      packageType: 'lifetime',
      isSubscription: false,
      billingPeriod: null,
      introOffer: null,
      introEligible: false,
      priceString: '$9.99',
    });
    expect(p.primaryCta).toBe('Continue with Pro');
    expect(p.supporting).toBe('$9.99 once. No subscription.');
    expect(p.renewalNote).toBeNull();
  });

  it('formats periods with the store-provided counts', () => {
    expect(formatPeriod({ unit: 'day', count: 7 })).toBe('7 days');
    expect(formatPeriod({ unit: 'week', count: 1 })).toBe('1 week');
    expect(formatPeriod({ unit: 'month', count: 3 })).toBe('3 months');
    expect(formatPerPeriod({ unit: 'week', count: 1 })).toBe('/week');
    expect(formatPerPeriod({ unit: 'month', count: 2 })).toBe('/2 months');
    expect(formatPerPeriod(null)).toBe('');
  });

  it('uses intro cycles for the duration (e.g. 3 × 1 week)', () => {
    const p = paywallPricing({
      ...weekly,
      introOffer: { priceString: '$0.99', price: 0.99, period: { unit: 'week', count: 1 }, cycles: 3 },
    });
    expect(p.supporting).toBe('3 weeks for $0.99, then $4.99/week');
  });
});
