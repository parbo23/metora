import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingCompleted,
  writeOnboardingCompleted,
  type OnboardingStorage,
} from '../OnboardingProvider';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));

function memoryStorage(
  initial: Record<string, string> = {},
): OnboardingStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    removeItem: async (key) => void data.delete(key),
  };
}

describe('onboarding completion flag', () => {
  it('is false on first launch and true after completing', async () => {
    const storage = memoryStorage();
    await expect(readOnboardingCompleted(storage)).resolves.toBe(false);
    await writeOnboardingCompleted(true, storage);
    await expect(readOnboardingCompleted(storage)).resolves.toBe(true);
    expect(storage.data.get(ONBOARDING_STORAGE_KEY)).toBe('done');
  });

  it('can be reset (development) and tolerates storage errors', async () => {
    const storage = memoryStorage({ [ONBOARDING_STORAGE_KEY]: 'done' });
    await writeOnboardingCompleted(false, storage);
    await expect(readOnboardingCompleted(storage)).resolves.toBe(false);

    const broken: OnboardingStorage = {
      getItem: async () => {
        throw new Error('disk');
      },
      setItem: async () => {
        throw new Error('disk');
      },
      removeItem: async () => {
        throw new Error('disk');
      },
    };
    await expect(readOnboardingCompleted(broken)).resolves.toBe(false);
    await expect(writeOnboardingCompleted(true, broken)).resolves.toBeUndefined();
  });

  it('ignores foreign values', async () => {
    await expect(readOnboardingCompleted(memoryStorage({ [ONBOARDING_STORAGE_KEY]: 'yes' }))).resolves.toBe(
      false,
    );
  });
});
