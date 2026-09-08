import {
  DEFAULT_OFFERING_ID,
  WEEKLY_PRODUCT_ID,
  type PurchaseOffering,
  type PurchaseOutcome,
  type PurchaseService,
  type RestoreOutcome,
} from './PurchaseService';

/**
 * In-memory stand-in used ONLY for the web preview on Windows, where the
 * RevenueCat native module does not exist. It never persists anything, so a
 * reload returns to the locked state, and it is never selected on iOS or
 * Android (see createPurchaseService).
 */
export class PreviewPurchaseService implements PurchaseService {
  readonly name = 'Preview (no real store)';

  private unlocked = false;
  private readonly listeners = new Set<(isUnlocked: boolean) => void>();

  constructor(private readonly offering: PurchaseOffering = previewOffering) {
    if (typeof console !== 'undefined') {
      console.warn('[Metora] Purchases are running in preview mode. No real store is connected.');
    }
  }

  async loadEntitlement(): Promise<boolean> {
    return this.unlocked;
  }

  async loadOffering(): Promise<PurchaseOffering | null> {
    return this.offering;
  }

  async purchase(packageIdentifier: string): Promise<PurchaseOutcome> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (!this.offering.packages.some((pkg) => pkg.identifier === packageIdentifier)) {
      return { kind: 'failed', reason: 'unavailable' };
    }
    this.setUnlocked(true);
    return { kind: 'unlocked' };
  }

  async restorePurchases(): Promise<RestoreOutcome> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return this.unlocked ? { kind: 'unlocked' } : { kind: 'nothingToRestore' };
  }

  subscribe(listener: (isUnlocked: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setUnlocked(value: boolean): void {
    this.unlocked = value;
    this.listeners.forEach((listener) => listener(value));
  }
}

/** Mirrors the intended App Store setup: weekly auto-renewing with a 7-day intro price. */
const previewOffering: PurchaseOffering = {
  identifier: DEFAULT_OFFERING_ID,
  metadata: {},
  packages: [
    {
      identifier: '$rc_weekly',
      packageType: 'weekly',
      productIdentifier: WEEKLY_PRODUCT_ID,
      title: 'Metora Pro',
      priceString: '$4.99',
      isSubscription: true,
      billingPeriod: { unit: 'week', count: 1 },
      introOffer: { priceString: '$0.49', price: 0.49, period: { unit: 'day', count: 7 }, cycles: 1 },
      introEligible: true,
    },
  ],
};
