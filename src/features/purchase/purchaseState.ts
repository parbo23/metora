import type {
  PurchaseFailureReason,
  PurchaseOffering,
  PurchaseOutcome,
  PurchasePackage,
  RestoreOutcome,
} from '@/services/PurchaseService';

/**
 * Pure state machine for the paywall / entitlement UI. Kept free of React so
 * the branching (cancelled, pending, failed, restore, offering) is
 * unit-testable.
 */
export type PurchaseNotice =
  | { kind: 'none' }
  | { kind: 'offeringUnavailable' }
  | { kind: 'purchaseFailed'; reason: PurchaseFailureReason }
  | { kind: 'purchasePending' }
  | { kind: 'restoreFailed'; reason: PurchaseFailureReason }
  | { kind: 'nothingToRestore' }
  | { kind: 'restored' };

export interface PurchaseState {
  /** True until the first entitlement check has finished. */
  isLoading: boolean;
  isUnlocked: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  /** The offering RevenueCat serves; null while loading or when unavailable. */
  offering: PurchaseOffering | null;
  /** Package the user will buy when tapping the primary CTA. */
  selectedPackageId: string | null;
  notice: PurchaseNotice;
}

export type PurchaseAction =
  | { type: 'entitlementLoaded'; isUnlocked: boolean }
  | { type: 'entitlementLoadFailed' }
  | { type: 'entitlementChanged'; isUnlocked: boolean }
  | { type: 'offeringLoaded'; offering: PurchaseOffering | null }
  | { type: 'offeringLoadFailed' }
  | { type: 'packageSelected'; packageId: string }
  | { type: 'purchaseStarted' }
  | { type: 'purchaseFinished'; outcome: PurchaseOutcome }
  | { type: 'restoreStarted' }
  | { type: 'restoreFinished'; outcome: RestoreOutcome }
  | { type: 'noticeDismissed' };

export const initialPurchaseState: PurchaseState = {
  isLoading: true,
  isUnlocked: false,
  isPurchasing: false,
  isRestoring: false,
  offering: null,
  selectedPackageId: null,
  notice: { kind: 'none' },
};

/** Default selection: the weekly Pro plan, then a lifetime package, otherwise the first package. */
export function defaultPackageId(offering: PurchaseOffering | null): string | null {
  if (!offering || offering.packages.length === 0) return null;
  const preferred =
    offering.packages.find((pkg) => pkg.packageType === 'weekly') ??
    offering.packages.find((pkg) => pkg.packageType === 'lifetime');
  return (preferred ?? offering.packages[0]).identifier;
}

export function selectedPackage(state: PurchaseState): PurchasePackage | null {
  if (!state.offering || !state.selectedPackageId) return null;
  return state.offering.packages.find((pkg) => pkg.identifier === state.selectedPackageId) ?? null;
}

export function purchaseReducer(state: PurchaseState, action: PurchaseAction): PurchaseState {
  switch (action.type) {
    case 'entitlementLoaded':
      return { ...state, isLoading: false, isUnlocked: action.isUnlocked };
    case 'entitlementLoadFailed':
      // Stay locked. The paywall can still try to purchase or restore.
      return { ...state, isLoading: false, isUnlocked: false };
    case 'entitlementChanged':
      return { ...state, isUnlocked: action.isUnlocked };
    case 'offeringLoaded': {
      if (!action.offering || action.offering.packages.length === 0) {
        return { ...state, offering: null, selectedPackageId: null, notice: { kind: 'offeringUnavailable' } };
      }
      const keepSelection = action.offering.packages.some(
        (pkg) => pkg.identifier === state.selectedPackageId,
      );
      return {
        ...state,
        offering: action.offering,
        selectedPackageId: keepSelection ? state.selectedPackageId : defaultPackageId(action.offering),
        notice: state.notice.kind === 'offeringUnavailable' ? { kind: 'none' } : state.notice,
      };
    }
    case 'offeringLoadFailed':
      return { ...state, offering: null, selectedPackageId: null, notice: { kind: 'offeringUnavailable' } };
    case 'packageSelected':
      if (!state.offering?.packages.some((pkg) => pkg.identifier === action.packageId)) return state;
      return { ...state, selectedPackageId: action.packageId };
    case 'purchaseStarted':
      return { ...state, isPurchasing: true, notice: { kind: 'none' } };
    case 'purchaseFinished':
      return { ...state, isPurchasing: false, ...applyPurchaseOutcome(action.outcome) };
    case 'restoreStarted':
      return { ...state, isRestoring: true, notice: { kind: 'none' } };
    case 'restoreFinished':
      return { ...state, isRestoring: false, ...applyRestoreOutcome(action.outcome) };
    case 'noticeDismissed':
      return { ...state, notice: { kind: 'none' } };
    default:
      return state;
  }
}

function applyPurchaseOutcome(outcome: PurchaseOutcome): Partial<PurchaseState> {
  switch (outcome.kind) {
    case 'unlocked':
      return { isUnlocked: true, notice: { kind: 'none' } };
    case 'cancelled':
      // A dismissed payment sheet is not an error. Show nothing.
      return { notice: { kind: 'none' } };
    case 'pending':
      return { notice: { kind: 'purchasePending' } };
    case 'failed':
      return { notice: { kind: 'purchaseFailed', reason: outcome.reason } };
  }
}

function applyRestoreOutcome(outcome: RestoreOutcome): Partial<PurchaseState> {
  switch (outcome.kind) {
    case 'unlocked':
      return { isUnlocked: true, notice: { kind: 'restored' } };
    case 'nothingToRestore':
      return { notice: { kind: 'nothingToRestore' } };
    case 'failed':
      return { notice: { kind: 'restoreFailed', reason: outcome.reason } };
  }
}
