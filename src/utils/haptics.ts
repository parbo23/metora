import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Restrained haptics per the spec: success on a verified clean and a saved
 * copy, an error tap on an important failure, a light tick when choosing a
 * cleaning option. No-ops on web. Failures are swallowed: haptics must never
 * break a flow.
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function fire(action: () => Promise<void>): void {
  if (!enabled) return;
  action().catch(() => {});
}

export const haptics = {
  success(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  error(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  selection(): void {
    fire(() => Haptics.selectionAsync());
  },
};
