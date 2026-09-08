import { QA_PREVIEW_OFFERING, isPaywallPreview } from '../qaPreview';

import { paywallPricing } from '@/features/purchase/pricing';

describe('QA paywall preview', () => {
  it('is identified only by the exact preview route param', () => {
    expect(isPaywallPreview('1')).toBe(true);
    expect(isPaywallPreview('true')).toBe(false);
    expect(isPaywallPreview(undefined)).toBe(false);
    expect(isPaywallPreview(['1'])).toBe(false);
  });

  it('renders the specified fallback pricing when the store has none', () => {
    const pricing = paywallPricing(QA_PREVIEW_OFFERING.packages[0]);
    expect(pricing.primaryCta).toBe('Start for €0.49');
    expect(pricing.supporting).toBe('1 week for €0.49, then €4.99/week');
    expect(pricing.headlinePrice).toBe('€0.49');
    expect(pricing.showsIntro).toBe(true);
  });
});
