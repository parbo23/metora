import type { PurchaseOffering, PurchaseOutcome, PurchaseService, RestoreOutcome } from './PurchaseService';

/**
 * Used ONLY when EXPO_PUBLIC_QA_BYPASS_PAYWALL=true (the `testflight` EAS
 * profile). Reports the lifetime entitlement as active so testers reach the
 * app, never talks to RevenueCat, and offers nothing to buy. Not for release.
 */
export class QaBypassPurchaseService implements PurchaseService {
  readonly name = 'QA bypass (no store)';

  async loadEntitlement(): Promise<boolean> {
    return true;
  }

  async loadOffering(): Promise<PurchaseOffering | null> {
    return null;
  }

  async purchase(): Promise<PurchaseOutcome> {
    return { kind: 'unlocked' };
  }

  async restorePurchases(): Promise<RestoreOutcome> {
    return { kind: 'unlocked' };
  }

  subscribe(): () => void {
    return () => {};
  }
}
