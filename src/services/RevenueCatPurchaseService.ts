import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PACKAGE_TYPE,
  PRODUCT_CATEGORY,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type IntroEligibility,
  type MakePurchaseResult,
  type PurchasesError,
  type PurchasesIntroPrice,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

import {
  DEFAULT_OFFERING_ID,
  PRO_ENTITLEMENT_ID,
  type BillingPeriod,
  type IntroOffer,
  type PeriodUnit,
  type PurchaseFailureReason,
  type PurchaseOffering,
  type PurchaseOutcome,
  type PurchasePackage,
  type PurchasePackageType,
  type PurchaseService,
  type RestoreOutcome,
} from './PurchaseService';

/**
 * The subset of the RevenueCat SDK Metora uses. Injected so unit tests can
 * exercise every branch without native modules.
 */
export interface PurchasesSdk {
  configure(configuration: { apiKey: string }): void;
  setLogLevel(level: LOG_LEVEL): Promise<void>;
  getCustomerInfo(): Promise<CustomerInfo>;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(aPackage: PurchasesPackage): Promise<MakePurchaseResult>;
  restorePurchases(): Promise<CustomerInfo>;
  addCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): void;
  removeCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): boolean;
  checkTrialOrIntroductoryPriceEligibility(
    productIdentifiers: string[],
  ): Promise<{ [productId: string]: IntroEligibility }>;
}

interface Options {
  apiKey: string;
  sdk?: PurchasesSdk;
  debugLogging?: boolean;
  /**
   * RevenueCat Test Store keys ("test_…") are only allowed in debug builds.
   * The native SDK crashes on purpose when one reaches a release build, so we
   * refuse before configuring and let the paywall show "unavailable" instead.
   */
  allowTestStoreKeys?: boolean;
}

export const TEST_STORE_KEY_PREFIX = 'test_';

export function isTestStoreKey(apiKey: string): boolean {
  return apiKey.startsWith(TEST_STORE_KEY_PREFIX);
}

/** True when the RevenueCat customer has the Pro entitlement. */
export function hasProEntitlement(info: CustomerInfo): boolean {
  const entitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];
  return Boolean(entitlement?.isActive);
}

/** @deprecated kept for older call sites; same check as hasProEntitlement. */
export const hasLifetimeEntitlement = hasProEntitlement;

/**
 * The offering to present: RevenueCat's `current` offering (which is where an
 * A/B experiment or targeting rule lands), falling back to the `default`
 * offering when no current offering is set.
 */
export function selectOffering(offerings: PurchasesOfferings): PurchasesOffering | null {
  return offerings.current ?? offerings.all[DEFAULT_OFFERING_ID] ?? null;
}

function toPackageType(type: PACKAGE_TYPE): PurchasePackageType {
  switch (type) {
    case PACKAGE_TYPE.WEEKLY:
      return 'weekly';
    case PACKAGE_TYPE.MONTHLY:
      return 'monthly';
    case PACKAGE_TYPE.TWO_MONTH:
      return 'twoMonth';
    case PACKAGE_TYPE.THREE_MONTH:
      return 'threeMonth';
    case PACKAGE_TYPE.SIX_MONTH:
      return 'sixMonth';
    case PACKAGE_TYPE.ANNUAL:
      return 'annual';
    case PACKAGE_TYPE.LIFETIME:
      return 'lifetime';
    case PACKAGE_TYPE.CUSTOM:
      return 'custom';
    default:
      return 'unknown';
  }
}

/** Parses an ISO 8601 duration such as "P1W", "P7D", "P1M" or "P1Y". */
export function parseIsoPeriod(value: string | null | undefined): BillingPeriod | null {
  if (!value) return null;
  const match = /^P(\d+)([DWMY])$/i.exec(value.trim());
  if (!match) return null;
  const count = Number(match[1]);
  const units: Record<string, PeriodUnit> = { D: 'day', W: 'week', M: 'month', Y: 'year' };
  const unit = units[match[2].toUpperCase()];
  return unit && count > 0 ? { unit, count } : null;
}

function periodFromIntro(intro: PurchasesIntroPrice): BillingPeriod | null {
  const fromIso = parseIsoPeriod(intro.period);
  if (fromIso) return fromIso;
  const units: Record<string, PeriodUnit> = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };
  const unit = units[(intro.periodUnit ?? '').toUpperCase()];
  return unit && intro.periodNumberOfUnits > 0 ? { unit, count: intro.periodNumberOfUnits } : null;
}

export function toIntroOffer(intro: PurchasesIntroPrice | null | undefined): IntroOffer | null {
  if (!intro) return null;
  const period = periodFromIntro(intro);
  if (!period) return null;
  return { priceString: intro.priceString, price: intro.price, period, cycles: Math.max(1, intro.cycles) };
}

export function toPurchaseOffering(
  offering: PurchasesOffering,
  eligibility: { [productId: string]: IntroEligibility } = {},
): PurchaseOffering {
  const packages: PurchasePackage[] = offering.availablePackages.map((pkg) => {
    const product = pkg.product;
    const introOffer = toIntroOffer(product.introPrice);
    const status = eligibility[product.identifier]?.status;
    return {
      identifier: pkg.identifier,
      packageType: toPackageType(pkg.packageType),
      productIdentifier: product.identifier,
      title: product.title,
      priceString: product.priceString,
      isSubscription: product.productCategory === PRODUCT_CATEGORY.SUBSCRIPTION,
      billingPeriod: parseIsoPeriod(product.subscriptionPeriod),
      introOffer,
      introEligible:
        introOffer !== null && status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
    };
  });
  return { identifier: offering.identifier, packages, metadata: offering.metadata ?? {} };
}

function isPurchasesError(error: unknown): error is PurchasesError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

export function classifyFailure(error: unknown): PurchaseFailureReason {
  if (!isPurchasesError(error)) return 'unknown';
  switch (error.code) {
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return 'network';
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case PURCHASES_ERROR_CODE.CONFIGURATION_ERROR:
      return 'unavailable';
    default:
      return 'unknown';
  }
}

/**
 * Production purchase service. Wraps react-native-purchases (StoreKit under
 * the hood). Requires an EAS development or production build; it cannot run
 * in Expo Go or on web.
 */
export class RevenueCatPurchaseService implements PurchaseService {
  readonly name = 'RevenueCat';

  private readonly sdk: PurchasesSdk;
  private readonly apiKey: string;
  private readonly debugLogging: boolean;
  private readonly allowTestStoreKeys: boolean;
  private configured = false;
  /** Native packages of the last loaded offering, keyed by package identifier. */
  private nativePackages = new Map<string, PurchasesPackage>();

  constructor({ apiKey, sdk = Purchases, debugLogging = false, allowTestStoreKeys = __DEV__ }: Options) {
    this.apiKey = apiKey;
    this.sdk = sdk;
    this.debugLogging = debugLogging;
    this.allowTestStoreKeys = allowTestStoreKeys;
  }

  private ensureConfigured(): void {
    if (this.configured) return;
    if (!this.apiKey) {
      throw new Error('RevenueCat API key is missing. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY.');
    }
    if (isTestStoreKey(this.apiKey) && !this.allowTestStoreKeys) {
      throw new Error(
        'RevenueCat Test Store keys only work in development builds. Use the App Store public key (appl_…) for TestFlight and release builds.',
      );
    }
    this.sdk.configure({ apiKey: this.apiKey });
    void this.sdk.setLogLevel(this.debugLogging ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    this.configured = true;
  }

  async loadEntitlement(): Promise<boolean> {
    this.ensureConfigured();
    const info = await this.sdk.getCustomerInfo();
    return hasProEntitlement(info);
  }

  async loadOffering(): Promise<PurchaseOffering | null> {
    this.ensureConfigured();
    const offerings = await this.sdk.getOfferings();
    const offering = selectOffering(offerings);
    if (!offering) {
      this.nativePackages = new Map();
      return null;
    }
    this.nativePackages = new Map(offering.availablePackages.map((pkg) => [pkg.identifier, pkg]));

    // Intro eligibility is per user; when the check fails we show regular prices.
    let eligibility: { [productId: string]: IntroEligibility } = {};
    const withIntro = offering.availablePackages.filter((pkg) => pkg.product.introPrice);
    if (withIntro.length > 0) {
      try {
        eligibility = await this.sdk.checkTrialOrIntroductoryPriceEligibility(
          withIntro.map((pkg) => pkg.product.identifier),
        );
      } catch {
        eligibility = {};
      }
    }

    const normalized = toPurchaseOffering(offering, eligibility);
    return normalized.packages.length > 0 ? normalized : null;
  }

  async purchase(packageIdentifier: string): Promise<PurchaseOutcome> {
    this.ensureConfigured();
    try {
      let nativePackage = this.nativePackages.get(packageIdentifier);
      if (!nativePackage) {
        await this.loadOffering();
        nativePackage = this.nativePackages.get(packageIdentifier);
      }
      if (!nativePackage) {
        return { kind: 'failed', reason: 'unavailable' };
      }
      const result = await this.sdk.purchasePackage(nativePackage);
      if (hasProEntitlement(result.customerInfo)) {
        return { kind: 'unlocked' };
      }
      // The store accepted the purchase but the entitlement is not active yet.
      return { kind: 'pending' };
    } catch (error) {
      if (isPurchasesError(error)) {
        if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { kind: 'cancelled' };
        if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { kind: 'pending' };
      }
      return { kind: 'failed', reason: classifyFailure(error) };
    }
  }

  async restorePurchases(): Promise<RestoreOutcome> {
    this.ensureConfigured();
    try {
      const info = await this.sdk.restorePurchases();
      return hasProEntitlement(info) ? { kind: 'unlocked' } : { kind: 'nothingToRestore' };
    } catch (error) {
      return { kind: 'failed', reason: classifyFailure(error) };
    }
  }

  subscribe(listener: (isUnlocked: boolean) => void): () => void {
    this.ensureConfigured();
    const sdkListener: CustomerInfoUpdateListener = (info) => listener(hasProEntitlement(info));
    this.sdk.addCustomerInfoUpdateListener(sdkListener);
    return () => {
      this.sdk.removeCustomerInfoUpdateListener(sdkListener);
    };
  }
}
