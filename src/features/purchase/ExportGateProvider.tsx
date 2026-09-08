import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { usePurchases } from './PurchaseProvider';

/**
 * The single place where Pro is enforced. Inspecting metadata, choosing what
 * to remove and creating the clean copy are free; saving, sharing or otherwise
 * exporting a clean result requires Metora Pro.
 *
 * `requirePro(action)` runs the action immediately when Pro is active.
 * Otherwise it remembers the action, opens the paywall modal, and — once the
 * paywall reports a successful purchase or restore — resumes that exact action
 * so the user does not have to tap again. Closing the paywall drops it.
 */
export type ExportAction = () => void | Promise<void>;

export interface ExportGateContextValue {
  /** True while an export is waiting behind the paywall. */
  hasPendingAction: boolean;
  requirePro(action: ExportAction): void;
  /** Called by the paywall after unlock: closes it and runs the pending action. */
  resumePendingAction(): Promise<void>;
  /** Called when the paywall is dismissed without unlocking. */
  cancelPendingAction(): void;
}

const ExportGateContext = createContext<ExportGateContextValue | null>(null);

export function ExportGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isUnlocked } = usePurchases();
  const pending = useRef<ExportAction | null>(null);
  const [hasPendingAction, setHasPending] = useState(false);

  const requirePro = useCallback(
    (action: ExportAction) => {
      if (isUnlocked) {
        void action();
        return;
      }
      pending.current = action;
      setHasPending(true);
      router.push('/paywall');
    },
    [isUnlocked, router],
  );

  const resumePendingAction = useCallback(async () => {
    const action = pending.current;
    pending.current = null;
    setHasPending(false);
    if (action) await action();
  }, []);

  const cancelPendingAction = useCallback(() => {
    pending.current = null;
    setHasPending(false);
  }, []);

  const value = useMemo(
    () => ({ hasPendingAction, requirePro, resumePendingAction, cancelPendingAction }),
    [hasPendingAction, requirePro, resumePendingAction, cancelPendingAction],
  );
  return <ExportGateContext.Provider value={value}>{children}</ExportGateContext.Provider>;
}

export function useExportGate(): ExportGateContextValue {
  const context = useContext(ExportGateContext);
  if (!context) throw new Error('useExportGate must be used inside ExportGateProvider');
  return context;
}
