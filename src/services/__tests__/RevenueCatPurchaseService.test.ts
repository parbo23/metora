import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

import { PRO_ENTITLEMENT_ID } from '../PurchaseService';
import {
  RevenueCatPurchaseService,
  classifyFailure,
  hasLifetimeEntitlement,
  selectOffering,
  toPurchaseOffering,
  type PurchasesSdk,
} from '../RevenueCatPurchaseService';

// The real SDK needs a native module; only the enums are needed here.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {},
  LOG_LEVEL: { DEBUG: 'DEBUG', ERROR: 'ERROR' },
  PACKAGE_TYPE: {
    UNKNOWN: 'UNKNOWN',
    CUSTOM: 'CUSTOM',
    LIFETIME: 'LIFETIME',
    ANNUAL: 'ANNUAL',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    TWO_MONTH: 'TWO_MONTH',
    THREE_MONTH: 'THREE_MONTH',
    SIX_MONTH: 'SIX_MONTH',
  },
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  },
  PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION', SUBSCRIPTION: 'SUBSCRIPTION' },
  PURCHASES_ERROR_CODE: {
    PURCHASE_CANCELLED_ERROR: '1',
    STORE_PROBLEM_ERROR: '2',
    PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: '5',
    NETWORK_ERROR: '10',
    PAYMENT_PENDING_ERROR: '20',
    CONFIGURATION_ERROR: '23',
    OFFLINE_CONNECTION_ERROR: '35',
  },
}));

function customerInfo(active: boolean): CustomerInfo {
  return {
    entitlements: {
      active: active ? { [PRO_ENTITLEMENT_ID]: { isActive: true, identifier: PRO_ENTITLEMENT_ID } } : {},
      all: {},
    },
  } as unknown as CustomerInfo;
}

function pkg(
  identifier: string,
  productIdentifier: string,
  packageType = 'LIFETIME',
  productCategory = 'NON_SUBSCRIPTION',
  extra: Record<string, unknown> = {},
): PurchasesPackage {
  return {
    identifier,
    packageType,
    offeringIdentifier: 'default',
    product: {
      identifier: productIdentifier,
      title: 'Metora Lifetime',
      priceString: 'CA$13.99',
      productCategory,
      introPrice: null,
      subscriptionPeriod: null,
      ...extra,
    },
  } as unknown as PurchasesPackage;
}

/** Weekly Pro plan with a 7-day pay-up-front intro offer, as configured in App Store Connect. */
function weeklyPkg(): PurchasesPackage {
  return pkg('$rc_weekly', 'metora_pro_weekly', 'WEEKLY', 'SUBSCRIPTION', {
    title: 'Metora Pro',
    priceString: '$4.99',
    subscriptionPeriod: 'P1W',
    introPrice: {
      price: 0.49,
      priceString: '$0.49',
      cycles: 1,
      period: 'P1W',
      periodUnit: 'WEEK',
      periodNumberOfUnits: 1,
    },
  });
}

function offerings(packages: PurchasesPackage[], metadata: Record<string, unknown> = {}): PurchasesOfferings {
  const offering = {
    identifier: 'default',
    serverDescription: 'Default',
    metadata,
    availablePackages: packages,
    lifetime: packages.find((p) => p.packageType === 'LIFETIME') ?? null,
  };
  return { current: offering, all: { default: offering } } as unknown as PurchasesOfferings;
}

function makeSdk(overrides: Partial<PurchasesSdk> = {}): jest.Mocked<PurchasesSdk> {
  return {
    configure: jest.fn(),
    setLogLevel: jest.fn().mockResolvedValue(undefined),
    getCustomerInfo: jest.fn().mockResolvedValue(customerInfo(false)),
    getOfferings: jest.fn().mockResolvedValue(offerings([pkg('$rc_lifetime', 'metora_lifetime')])),
    purchasePackage: jest.fn().mockResolvedValue({ customerInfo: customerInfo(true) }),
    restorePurchases: jest.fn().mockResolvedValue(customerInfo(false)),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn().mockReturnValue(true),
    checkTrialOrIntroductoryPriceEligibility: jest.fn().mockResolvedValue({}),
    ...overrides,
  } as jest.Mocked<PurchasesSdk>;
}

function service(sdk: PurchasesSdk, apiKey = 'appl_test') {
  return new RevenueCatPurchaseService({ apiKey, sdk });
}

describe('entitlement helpers', () => {
  it('detects the lifetime entitlement', () => {
    expect(hasLifetimeEntitlement(customerInfo(true))).toBe(true);
    expect(hasLifetimeEntitlement(customerInfo(false))).toBe(false);
  });

  it('prefers the current offering and falls back to default', () => {
    const current = offerings([pkg('$rc_lifetime', 'metora_lifetime')]);
    expect(selectOffering(current)?.identifier).toBe('default');

    const noCurrent = { ...current, current: null } as unknown as PurchasesOfferings;
    expect(selectOffering(noCurrent)?.identifier).toBe('default');

    const empty = { current: null, all: {} } as unknown as PurchasesOfferings;
    expect(selectOffering(empty)).toBeNull();
  });

  it('normalizes one-time and subscription packages, including intro offers', () => {
    const offering = offerings([pkg('$rc_lifetime', 'metora_lifetime'), weeklyPkg()], {
      paywall: { headline: 'Variant B' },
    }).current!;
    const normalized = toPurchaseOffering(offering, {
      metora_pro_weekly: { status: 2, description: 'eligible' } as never,
    });
    expect(normalized.packages).toHaveLength(2);
    expect(normalized.packages[0]).toMatchObject({
      identifier: '$rc_lifetime',
      packageType: 'lifetime',
      isSubscription: false,
      billingPeriod: null,
      introOffer: null,
      introEligible: false,
    });
    expect(normalized.packages[1]).toEqual({
      identifier: '$rc_weekly',
      packageType: 'weekly',
      productIdentifier: 'metora_pro_weekly',
      title: 'Metora Pro',
      priceString: '$4.99',
      isSubscription: true,
      billingPeriod: { unit: 'week', count: 1 },
      introOffer: { priceString: '$0.49', price: 0.49, period: { unit: 'week', count: 1 }, cycles: 1 },
      introEligible: true,
    });
    expect(normalized.metadata).toEqual({ paywall: { headline: 'Variant B' } });
  });

  it('shows the intro offer only when the store confirms eligibility', () => {
    const offering = offerings([weeklyPkg()]).current!;
    expect(toPurchaseOffering(offering, {}).packages[0].introEligible).toBe(false);
    expect(
      toPurchaseOffering(offering, { metora_pro_weekly: { status: 0 } as never }).packages[0].introEligible,
    ).toBe(false);
    expect(
      toPurchaseOffering(offering, { metora_pro_weekly: { status: 1 } as never }).packages[0].introEligible,
    ).toBe(false);
    expect(
      toPurchaseOffering(offering, { metora_pro_weekly: { status: 2 } as never }).packages[0].introEligible,
    ).toBe(true);
  });

  it('loadOffering asks eligibility only for products with an intro price and survives a failing check', async () => {
    const sdk = makeSdk({
      getOfferings: jest
        .fn()
        .mockResolvedValue(offerings([pkg('$rc_lifetime', 'metora_lifetime'), weeklyPkg()])),
      checkTrialOrIntroductoryPriceEligibility: jest.fn().mockRejectedValue(new Error('offline')),
    });
    const offering = await service(sdk).loadOffering();
    expect(sdk.checkTrialOrIntroductoryPriceEligibility).toHaveBeenCalledWith(['metora_pro_weekly']);
    expect(offering?.packages.find((p) => p.identifier === '$rc_weekly')?.introEligible).toBe(false);
  });

  it('classifies failures', () => {
    expect(classifyFailure({ code: '10' })).toBe('network');
    expect(classifyFailure({ code: '35' })).toBe('network');
    expect(classifyFailure({ code: '2' })).toBe('unavailable');
    expect(classifyFailure({ code: '23' })).toBe('unavailable');
    expect(classifyFailure({ code: '99' })).toBe('unknown');
    expect(classifyFailure(new Error('boom'))).toBe('unknown');
  });
});

describe('RevenueCatPurchaseService', () => {
  it('configures the SDK once and reports the entitlement', async () => {
    const sdk = makeSdk({ getCustomerInfo: jest.fn().mockResolvedValue(customerInfo(true)) });
    const svc = service(sdk);
    await expect(svc.loadEntitlement()).resolves.toBe(true);
    await expect(svc.loadEntitlement()).resolves.toBe(true);
    expect(sdk.configure).toHaveBeenCalledTimes(1);
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'appl_test' });
  });

  it('refuses a Test Store key in release builds instead of letting the native SDK crash', async () => {
    const sdk = makeSdk();
    const release = new RevenueCatPurchaseService({ apiKey: 'test_abc', sdk, allowTestStoreKeys: false });
    await expect(release.loadEntitlement()).rejects.toThrow(/development builds/);
    await expect(release.loadOffering()).rejects.toThrow(/development builds/);
    expect(sdk.configure).not.toHaveBeenCalled();

    const debug = new RevenueCatPurchaseService({ apiKey: 'test_abc', sdk, allowTestStoreKeys: true });
    await expect(debug.loadEntitlement()).resolves.toBe(false);
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'test_abc' });
  });

  it('refuses to run without an API key instead of unlocking', async () => {
    const sdk = makeSdk();
    const svc = service(sdk, '');
    await expect(svc.loadEntitlement()).rejects.toThrow(/API key/);
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it('loads the current offering with its localized price', async () => {
    const svc = service(makeSdk());
    const offering = await svc.loadOffering();
    expect(offering?.packages[0].priceString).toBe('CA$13.99');
    expect(offering?.packages[0].identifier).toBe('$rc_lifetime');
  });

  it('keeps subscription-only offerings (Pro is a subscription) and returns null when empty', async () => {
    const sdk = makeSdk({ getOfferings: jest.fn().mockResolvedValue(offerings([weeklyPkg()])) });
    const offering = await service(sdk).loadOffering();
    expect(offering?.packages.map((p) => p.identifier)).toEqual(['$rc_weekly']);

    const empty = makeSdk({ getOfferings: jest.fn().mockResolvedValue(offerings([])) });
    await expect(service(empty).loadOffering()).resolves.toBeNull();
  });

  it('unlocks when the purchase returns the active entitlement', async () => {
    const sdk = makeSdk();
    const svc = service(sdk);
    await svc.loadOffering();
    await expect(svc.purchase('$rc_lifetime')).resolves.toEqual({ kind: 'unlocked' });
    expect(sdk.purchasePackage).toHaveBeenCalledWith(expect.objectContaining({ identifier: '$rc_lifetime' }));
  });

  it('loads the offering lazily when purchasing before loadOffering', async () => {
    const sdk = makeSdk();
    await expect(service(sdk).purchase('$rc_lifetime')).resolves.toEqual({ kind: 'unlocked' });
    expect(sdk.getOfferings).toHaveBeenCalledTimes(1);
  });

  it('fails as unavailable for an unknown package id', async () => {
    const sdk = makeSdk();
    await expect(service(sdk).purchase('$rc_monthly')).resolves.toEqual({
      kind: 'failed',
      reason: 'unavailable',
    });
    expect(sdk.purchasePackage).not.toHaveBeenCalled();
  });

  it('treats a purchase without an active entitlement as pending', async () => {
    const sdk = makeSdk({
      purchasePackage: jest.fn().mockResolvedValue({ customerInfo: customerInfo(false) }),
    });
    await expect(service(sdk).purchase('$rc_lifetime')).resolves.toEqual({ kind: 'pending' });
  });

  it('maps cancelled, pending and failed purchases', async () => {
    const cancelled = makeSdk({
      purchasePackage: jest.fn().mockRejectedValue({ code: '1', userCancelled: true }),
    });
    await expect(service(cancelled).purchase('$rc_lifetime')).resolves.toEqual({ kind: 'cancelled' });

    const pending = makeSdk({ purchasePackage: jest.fn().mockRejectedValue({ code: '20' }) });
    await expect(service(pending).purchase('$rc_lifetime')).resolves.toEqual({ kind: 'pending' });

    const offline = makeSdk({ purchasePackage: jest.fn().mockRejectedValue({ code: '35' }) });
    await expect(service(offline).purchase('$rc_lifetime')).resolves.toEqual({
      kind: 'failed',
      reason: 'network',
    });
  });

  it('restores an existing purchase or reports nothing to restore', async () => {
    const restored = makeSdk({ restorePurchases: jest.fn().mockResolvedValue(customerInfo(true)) });
    await expect(service(restored).restorePurchases()).resolves.toEqual({ kind: 'unlocked' });

    const nothing = makeSdk();
    await expect(service(nothing).restorePurchases()).resolves.toEqual({ kind: 'nothingToRestore' });

    const failed = makeSdk({ restorePurchases: jest.fn().mockRejectedValue({ code: '10' }) });
    await expect(service(failed).restorePurchases()).resolves.toEqual({ kind: 'failed', reason: 'network' });
  });

  it('forwards entitlement updates and removes the listener on unsubscribe', () => {
    const sdk = makeSdk();
    const svc = service(sdk);
    const listener = jest.fn();
    const unsubscribe = svc.subscribe(listener);

    const sdkListener = sdk.addCustomerInfoUpdateListener.mock.calls[0][0];
    sdkListener(customerInfo(true));
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    expect(sdk.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(sdkListener);
  });
});
