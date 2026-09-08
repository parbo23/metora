import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import { createPurchaseService } from './createPurchaseService';
import {
  defaultPackageId,
  initialPurchaseState,
  purchaseReducer,
  selectedPackage,
  type PurchaseNotice,
} from './purchaseState';

import type { PurchaseOffering, PurchasePackage, PurchaseService } from '@/services/PurchaseService';
import { haptics } from '@/utils/haptics';

/**
 * Public shape consumed by screens. Covers the spec's PurchaseService
 * interface (isUnlocked, isLoading, productPrice, loadEntitlement,
 * purchaseLifetime, restorePurchases) and exposes the RevenueCat offering so
 * the paywall renders whatever packages are currently served.
 */
export interface PurchaseContextValue {
  isUnlocked: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  /** Current offering, or null while loading / unavailable. */
  offering: PurchaseOffering | null;
  /** Package the primary CTA will purchase. */
  selectedPackage: PurchasePackage | null;
  /** Localized price of the selected package. */
  productPrice?: string;
  notice: PurchaseNotice;
  loadEntitlement(): Promise<void>;
  loadOffering(): Promise<void>;
  selectPackage(packageId: string): void;
  /** Purchases the selected package (or the given one). */
  purchaseLifetime(packageId?: string): Promise<void>;
  restorePurchases(): Promise<void>;
  dismissNotice(): void;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

interface PurchaseProviderProps {
  children: ReactNode;
  /** Override for tests; production uses createPurchaseService(). */
  service?: PurchaseService;
}

export function PurchaseProvider({ children, service }: PurchaseProviderProps) {
  // Created once per provider instance; never re-created on re-render.
  const [purchases] = useState<PurchaseService>(() => service ?? createPurchaseService());

  const [state, dispatch] = useReducer(purchaseReducer, initialPurchaseState);

  const loadEntitlement = useCallback(async () => {
    try {
      const isUnlocked = await purchases.loadEntitlement();
      dispatch({ type: 'entitlementLoaded', isUnlocked });
    } catch {
      dispatch({ type: 'entitlementLoadFailed' });
    }
  }, [purchases]);

  const loadOffering = useCallback(async () => {
    try {
      const offering = await purchases.loadOffering();
      dispatch({ type: 'offeringLoaded', offering });
    } catch {
      dispatch({ type: 'offeringLoadFailed' });
    }
  }, [purchases]);

  useEffect(() => {
    void loadEntitlement();
    void loadOffering();

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = purchases.subscribe((isUnlocked) => dispatch({ type: 'entitlementChanged', isUnlocked }));
    } catch {
      // Subscribing needs a configured SDK; loadEntitlement already surfaced that failure.
    }
    return () => unsubscribe?.();
  }, [loadEntitlement, loadOffering, purchases]);

  const selectPackage = useCallback(
    (packageId: string) => dispatch({ type: 'packageSelected', packageId }),
    [],
  );

  const purchaseLifetime = useCallback(
    async (packageId?: string) => {
      dispatch({ type: 'purchaseStarted' });
      let target = packageId ?? state.selectedPackageId;
      if (!target) {
        // Offering not loaded yet (e.g. it failed earlier): try once more now.
        try {
          const offering = await purchases.loadOffering();
          dispatch({ type: 'offeringLoaded', offering });
          target = defaultPackageId(offering);
        } catch {
          dispatch({ type: 'offeringLoadFailed' });
        }
      }
      if (!target) {
        dispatch({ type: 'purchaseFinished', outcome: { kind: 'failed', reason: 'unavailable' } });
        return;
      }
      const outcome = await purchases.purchase(target);
      if (outcome.kind === 'unlocked') haptics.success();
      else if (outcome.kind === 'failed') haptics.error();
      dispatch({ type: 'purchaseFinished', outcome });
    },
    [purchases, state.selectedPackageId],
  );

  const restorePurchases = useCallback(async () => {
    dispatch({ type: 'restoreStarted' });
    const outcome = await purchases.restorePurchases();
    if (outcome.kind === 'unlocked') haptics.success();
    dispatch({ type: 'restoreFinished', outcome });
  }, [purchases]);

  const dismissNotice = useCallback(() => dispatch({ type: 'noticeDismissed' }), []);

  const value = useMemo<PurchaseContextValue>(() => {
    const pkg = selectedPackage(state);
    return {
      isUnlocked: state.isUnlocked,
      isLoading: state.isLoading,
      isPurchasing: state.isPurchasing,
      isRestoring: state.isRestoring,
      offering: state.offering,
      selectedPackage: pkg,
      productPrice: pkg?.priceString,
      notice: state.notice,
      loadEntitlement,
      loadOffering,
      selectPackage,
      purchaseLifetime,
      restorePurchases,
      dismissNotice,
    };
  }, [
    state,
    loadEntitlement,
    loadOffering,
    selectPackage,
    purchaseLifetime,
    restorePurchases,
    dismissNotice,
  ]);

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchases(): PurchaseContextValue {
  const context = useContext(PurchaseContext);
  if (!context) {
    throw new Error('usePurchases must be used inside PurchaseProvider');
  }
  return context;
}
