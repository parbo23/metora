/**
 * Purchase / entitlement layer. RevenueCat (backed by the App Store) is the
 * authority for whether Metora Pro is active. Nothing in the app grants access
 * from a locally stored flag.
 *
 * RevenueCat Offerings are the source of truth for what is sold. The UI never
 * hardcodes a product or a price: it renders the packages of the current
 * offering with the store's localized strings, including introductory offers.
 */
export const PRO_ENTITLEMENT_ID = 'metora_pro';
export const DEFAULT_OFFERING_ID = 'default';
/** Expected App Store product ids; used for documentation and validation only. */
export const WEEKLY_PRODUCT_ID = 'metora_pro_weekly';
export const LIFETIME_PRODUCT_ID = 'metora_lifetime';

export type PurchasePackageType =
  | 'weekly'
  | 'monthly'
  | 'twoMonth'
  | 'threeMonth'
  | 'sixMonth'
  | 'annual'
  | 'lifetime'
  | 'custom'
  | 'unknown';

export type PeriodUnit = 'day' | 'week' | 'month' | 'year';

export interface BillingPeriod {
  unit: PeriodUnit;
  count: number;
}

/** Introductory offer as configured in App Store Connect and reported by the store. */
export interface IntroOffer {
  /** Localized, e.g. "$0.49". */
  priceString: string;
  price: number;
  /** Length of one intro period, e.g. 1 week or 7 days. */
  period: BillingPeriod;
  /** Number of intro periods (1 for a pay-up-front offer). */
  cycles: number;
}

/** A purchasable package of the current offering, normalized for the UI. */
export interface PurchasePackage {
  /** RevenueCat package identifier, e.g. "$rc_weekly". */
  identifier: string;
  packageType: PurchasePackageType;
  /** App Store product id, e.g. "metora_pro_weekly". */
  productIdentifier: string;
  /** Store product title (localized by App Store Connect). */
  title: string;
  /** Localized regular price string exactly as the store returns it, e.g. "$4.99". */
  priceString: string;
  isSubscription: boolean;
  /** Regular billing period for subscriptions; null for one-time purchases. */
  billingPeriod: BillingPeriod | null;
  /** Introductory offer attached to the product, if any. */
  introOffer: IntroOffer | null;
  /**
   * True only when the store confirmed this user is eligible for the intro
   * offer. Unknown or ineligible both render the regular price, so the
   * paywall never promises a price the store will not charge.
   */
  introEligible: boolean;
}

/** The offering RevenueCat currently serves to this user. */
export interface PurchaseOffering {
  identifier: string;
  packages: PurchasePackage[];
  /** Free-form metadata configured in the RevenueCat dashboard (paywall copy overrides). */
  metadata: Record<string, unknown>;
}

export type PurchaseOutcome =
  | { kind: 'unlocked' }
  | { kind: 'cancelled' }
  | { kind: 'pending' }
  | { kind: 'failed'; reason: PurchaseFailureReason };

export type RestoreOutcome =
  { kind: 'unlocked' } | { kind: 'nothingToRestore' } | { kind: 'failed'; reason: PurchaseFailureReason };

export type PurchaseFailureReason = 'unavailable' | 'network' | 'unknown';

export interface PurchaseService {
  readonly name: string;
  /** Asks the store / RevenueCat whether the Pro entitlement is active. */
  loadEntitlement(): Promise<boolean>;
  /** Loads the current offering with its purchasable packages and intro eligibility. */
  loadOffering(): Promise<PurchaseOffering | null>;
  purchase(packageIdentifier: string): Promise<PurchaseOutcome>;
  restorePurchases(): Promise<RestoreOutcome>;
  subscribe(listener: (isUnlocked: boolean) => void): () => void;
}
