import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { spacing } from '@/theme';

interface PaywallActionsProps {
  primaryCta: string;
  restoreCta: string;
  termsCta: string;
  privacyCta: string;
  isPurchasing: boolean;
  isRestoring: boolean;
  /** Disabled until an offering with a purchasable package has loaded. */
  canPurchase: boolean;
  onPurchase: () => void;
  onRestore: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}

/** Pinned footer: primary CTA, Restore, and the Terms · Privacy links. */
export function PaywallActions({
  primaryCta,
  restoreCta,
  termsCta,
  privacyCta,
  isPurchasing,
  isRestoring,
  canPurchase,
  onPurchase,
  onRestore,
  onTerms,
  onPrivacy,
}: PaywallActionsProps) {
  const busy = isPurchasing || isRestoring;
  return (
    <View style={styles.footer}>
      <PrimaryButton
        title={primaryCta}
        onPress={onPurchase}
        loading={isPurchasing}
        disabled={busy || !canPurchase}
      />
      <View style={styles.links}>
        <LinkButton title={restoreCta} onPress={onRestore} disabled={busy} loading={isRestoring} />
        <AppText variant="caption" color="textSecondary">
          ·
        </AppText>
        <LinkButton title={termsCta} onPress={onTerms} disabled={busy} />
        <AppText variant="caption" color="textSecondary">
          ·
        </AppText>
        <LinkButton title={privacyCta} onPress={onPrivacy} disabled={busy} />
      </View>
    </View>
  );
}

function LinkButton({
  title,
  onPress,
  disabled,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  disabled: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, busy: loading }}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <AppText variant="secondaryMedium" color="navy900">
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
