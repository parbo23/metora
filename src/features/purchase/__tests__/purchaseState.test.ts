import {
  defaultPackageId,
  initialPurchaseState,
  purchaseReducer,
  selectedPackage,
  type PurchaseAction,
  type PurchaseState,
} from '../purchaseState';

import type { PurchaseOffering } from '@/services/PurchaseService';

const offering: PurchaseOffering = {
  identifier: 'default',
  metadata: {},
  packages: [
    {
      identifier: '$rc_custom',
      packageType: 'custom',
      productIdentifier: 'metora_x',
      title: 'X',
      priceString: '$1',
      isSubscription: false,
      billingPeriod: null,
      introOffer: null,
      introEligible: false,
    },
    {
      identifier: '$rc_lifetime',
      packageType: 'lifetime',
      productIdentifier: 'metora_lifetime',
      title: 'L',
      priceString: '$9.99',
      isSubscription: false,
      billingPeriod: null,
      introOffer: null,
      introEligible: false,
    },
  ],
};

function run(actions: PurchaseAction[], from: PurchaseState = initialPurchaseState): PurchaseState {
  return actions.reduce(purchaseReducer, from);
}

describe('entitlement gate', () => {
  it('starts loading and locked', () => {
    expect(initialPurchaseState.isLoading).toBe(true);
    expect(initialPurchaseState.isUnlocked).toBe(false);
  });

  it('unlocks only from a positive entitlement result', () => {
    expect(run([{ type: 'entitlementLoaded', isUnlocked: true }]).isUnlocked).toBe(true);
    expect(run([{ type: 'entitlementLoaded', isUnlocked: false }]).isUnlocked).toBe(false);
  });

  it('stays locked when the entitlement check fails', () => {
    const state = run([{ type: 'entitlementLoadFailed' }]);
    expect(state.isLoading).toBe(false);
    expect(state.isUnlocked).toBe(false);
  });

  it('follows entitlement changes pushed by the store, including revocation', () => {
    const unlocked = run([{ type: 'entitlementLoaded', isUnlocked: true }]);
    expect(run([{ type: 'entitlementChanged', isUnlocked: false }], unlocked).isUnlocked).toBe(false);
  });
});

describe('offering', () => {
  it('selects the lifetime package by default', () => {
    expect(defaultPackageId(offering)).toBe('$rc_lifetime');
    expect(defaultPackageId(null)).toBeNull();
    const state = run([{ type: 'offeringLoaded', offering }]);
    expect(selectedPackage(state)?.priceString).toBe('$9.99');
  });

  it('keeps a valid selection across reloads and drops an invalid one', () => {
    const selected = run([
      { type: 'offeringLoaded', offering },
      { type: 'packageSelected', packageId: '$rc_custom' },
    ]);
    expect(selected.selectedPackageId).toBe('$rc_custom');
    expect(run([{ type: 'offeringLoaded', offering }], selected).selectedPackageId).toBe('$rc_custom');

    const lifetimeOnly = { ...offering, packages: [offering.packages[1]] };
    expect(run([{ type: 'offeringLoaded', offering: lifetimeOnly }], selected).selectedPackageId).toBe(
      '$rc_lifetime',
    );
  });

  it('ignores selecting a package that is not in the offering', () => {
    const state = run([
      { type: 'offeringLoaded', offering },
      { type: 'packageSelected', packageId: 'nope' },
    ]);
    expect(state.selectedPackageId).toBe('$rc_lifetime');
  });

  it('shows the unavailable notice when no offering can be loaded and clears it once one arrives', () => {
    const failed = run([{ type: 'offeringLoadFailed' }]);
    expect(failed.notice).toEqual({ kind: 'offeringUnavailable' });
    expect(run([{ type: 'offeringLoaded', offering: null }]).notice).toEqual({ kind: 'offeringUnavailable' });
    expect(run([{ type: 'offeringLoaded', offering }], failed).notice).toEqual({ kind: 'none' });
  });
});

describe('purchase outcomes', () => {
  const ready = run([
    { type: 'entitlementLoaded', isUnlocked: false },
    { type: 'offeringLoaded', offering },
  ]);

  it('unlocks on success', () => {
    const state = run(
      [{ type: 'purchaseStarted' }, { type: 'purchaseFinished', outcome: { kind: 'unlocked' } }],
      ready,
    );
    expect(state.isUnlocked).toBe(true);
    expect(state.isPurchasing).toBe(false);
    expect(state.notice).toEqual({ kind: 'none' });
  });

  it('shows no error when the user cancels', () => {
    const state = run(
      [{ type: 'purchaseStarted' }, { type: 'purchaseFinished', outcome: { kind: 'cancelled' } }],
      ready,
    );
    expect(state.isUnlocked).toBe(false);
    expect(state.notice).toEqual({ kind: 'none' });
  });

  it('reports pending without unlocking', () => {
    const state = run(
      [{ type: 'purchaseStarted' }, { type: 'purchaseFinished', outcome: { kind: 'pending' } }],
      ready,
    );
    expect(state.isUnlocked).toBe(false);
    expect(state.notice).toEqual({ kind: 'purchasePending' });
  });

  it('reports a failure with its reason and clears it on retry', () => {
    const failed = run(
      [
        { type: 'purchaseStarted' },
        { type: 'purchaseFinished', outcome: { kind: 'failed', reason: 'network' } },
      ],
      ready,
    );
    expect(failed.notice).toEqual({ kind: 'purchaseFailed', reason: 'network' });
    expect(run([{ type: 'purchaseStarted' }], failed).notice).toEqual({ kind: 'none' });
  });
});

describe('restore outcomes', () => {
  it('unlocks and confirms when a purchase is restored', () => {
    const state = run([
      { type: 'restoreStarted' },
      { type: 'restoreFinished', outcome: { kind: 'unlocked' } },
    ]);
    expect(state.isUnlocked).toBe(true);
    expect(state.notice).toEqual({ kind: 'restored' });
  });

  it('stays locked when there is nothing to restore or restore fails', () => {
    expect(run([{ type: 'restoreFinished', outcome: { kind: 'nothingToRestore' } }])).toMatchObject({
      isUnlocked: false,
      notice: { kind: 'nothingToRestore' },
    });
    expect(run([{ type: 'restoreFinished', outcome: { kind: 'failed', reason: 'unknown' } }])).toMatchObject({
      isUnlocked: false,
      notice: { kind: 'restoreFailed', reason: 'unknown' },
    });
  });
});
