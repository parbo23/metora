import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Persistent "onboarding completed" flag. Stored as a plain marker in
 * AsyncStorage; nothing else about the user is recorded. In development the
 * flag can be reset from Settings to replay the flow.
 */
export const ONBOARDING_STORAGE_KEY = 'metora.onboarding.v1';
const DONE = 'done';

export interface OnboardingStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export async function readOnboardingCompleted(storage: OnboardingStorage = AsyncStorage): Promise<boolean> {
  try {
    return (await storage.getItem(ONBOARDING_STORAGE_KEY)) === DONE;
  } catch {
    return false;
  }
}

export async function writeOnboardingCompleted(
  completed: boolean,
  storage: OnboardingStorage = AsyncStorage,
): Promise<void> {
  try {
    if (completed) await storage.setItem(ONBOARDING_STORAGE_KEY, DONE);
    else await storage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Best effort: a storage error only means onboarding shows again next launch.
  }
}

export interface OnboardingContextValue {
  /** False until the stored flag has been read. */
  isLoaded: boolean;
  completed: boolean;
  complete(): Promise<void>;
  /** Development only: show onboarding again on the next launch. */
  reset(): Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
  storage = AsyncStorage,
}: {
  children: ReactNode;
  storage?: OnboardingStorage;
}) {
  const [isLoaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readOnboardingCompleted(storage).then((value) => {
      if (!cancelled) {
        setCompleted(value);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const complete = useCallback(async () => {
    setCompleted(true);
    await writeOnboardingCompleted(true, storage);
  }, [storage]);

  const reset = useCallback(async () => {
    setCompleted(false);
    await writeOnboardingCompleted(false, storage);
  }, [storage]);

  const value = useMemo(
    () => ({ isLoaded, completed, complete, reset }),
    [isLoaded, completed, complete, reset],
  );
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return context;
}
