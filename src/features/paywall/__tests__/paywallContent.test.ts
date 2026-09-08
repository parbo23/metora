import { defaultPaywallContent, resolvePaywallContent } from '../paywallContent';

import type { PurchaseOffering } from '@/services/PurchaseService';

function offering(metadata: Record<string, unknown>): PurchaseOffering {
  return { identifier: 'default', metadata, packages: [] };
}

describe('resolvePaywallContent', () => {
  it('uses the English defaults without an offering or metadata', () => {
    expect(resolvePaywallContent(null)).toEqual(defaultPaywallContent);
    expect(resolvePaywallContent(offering({}))).toEqual(defaultPaywallContent);
    expect(defaultPaywallContent.headline).toBe('Unlock Metora Pro');
    expect(defaultPaywallContent.restoreCta).toBe('Restore Purchases');
    expect(defaultPaywallContent.benefits).toContain('Cancel anytime');
  });

  it('applies well-typed overrides from offering metadata', () => {
    const content = resolvePaywallContent(
      offering({
        paywall: { headline: 'Variant B headline', benefits: ['One', 'Two'], template: 'standard' },
      }),
    );
    expect(content.headline).toBe('Variant B headline');
    expect(content.benefits).toEqual(['One', 'Two']);
    expect(content.template).toBe('standard');
    expect(content.supporting).toBe(defaultPaywallContent.supporting);
  });

  it('ignores malformed overrides', () => {
    const content = resolvePaywallContent(
      offering({ paywall: { headline: '', benefits: [1, 2], template: 'does-not-exist', footer: 42 } }),
    );
    expect(content).toEqual(defaultPaywallContent);
    expect(resolvePaywallContent(offering({ paywall: 'nope' }))).toEqual(defaultPaywallContent);
    expect(resolvePaywallContent(offering({ paywall: ['x'] }))).toEqual(defaultPaywallContent);
  });
});
