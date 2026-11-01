import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';

import { colors, radius, shadows, spacing } from '@/theme';

interface ToastProps {
  /** The message to show; changing it (or the `nonce`) shows the toast again. */
  message: string | null;
  /** Bump to re-show the same message. */
  nonce?: number;
  durationMs?: number;
}

/**
 * Short success toast pinned above the footer. Purely presentational: it
 * shows for `durationMs` whenever `message` or `nonce` changes, then hides.
 */
export function Toast({ message, nonce = 0, durationMs = 2500 }: ToastProps) {
  // A (message, nonce) pair is visible until its timer marks it hidden.
  const key = message ? `${nonce}:${message}` : null;
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(() => setHiddenKey(key), durationMs);
    return () => clearTimeout(timer);
  }, [key, durationMs]);

  if (!message || !key || hiddenKey === key) return null;

  return (
    <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="checkCircle" size={18} color={colors.green500} />
      <AppText variant="secondaryMedium" color="textOnDark">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.navy900,
    ...shadows.raised,
  },
});
