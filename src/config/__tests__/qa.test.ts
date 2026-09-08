import { isQaPaywallBypassEnabled } from '../qa';

describe('isQaPaywallBypassEnabled', () => {
  it('is enabled only for the exact string "true"', () => {
    expect(isQaPaywallBypassEnabled('true')).toBe(true);
    expect(isQaPaywallBypassEnabled('TRUE')).toBe(false);
    expect(isQaPaywallBypassEnabled('1')).toBe(false);
    expect(isQaPaywallBypassEnabled('')).toBe(false);
    expect(isQaPaywallBypassEnabled(undefined)).toBe(false);
  });
});
