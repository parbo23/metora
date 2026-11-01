import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

import { colors, radius, shadows, spacing } from '@/theme';

interface EmptyStateCardProps {
  title?: string;
  description?: string;
  actionTitle: string;
  onAction: () => void;
  actionLoading?: boolean;
  /** Accessibility label for the example image. */
  exampleLabel: string;
}

const exampleFrame = require('@/assets/images/example-frame.jpg');
/** Pixel size of assets/images/example-frame.jpg (900 wide photo + its bar). */
const EXAMPLE_ASPECT = 900 / 765;

/**
 * Home's single empty state: an example framed photo, the headline, and the
 * primary action.
 */
export function EmptyStateCard({
  title,
  description,
  actionTitle,
  onAction,
  actionLoading,
  exampleLabel,
}: EmptyStateCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.exampleWrap}>
        <Image
          source={exampleFrame}
          contentFit="contain"
          style={[styles.example, { aspectRatio: EXAMPLE_ASPECT }]}
          accessible
          accessibilityLabel={exampleLabel}
        />
      </View>
      {title || description ? (
        <View style={styles.copy}>
          {title ? (
            <AppText variant="sectionTitle" align="center">
              {title}
            </AppText>
          ) : null}
          {description ? (
            <AppText variant="secondary" color="textSecondary" align="center">
              {description}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <PrimaryButton title={actionTitle} onPress={onAction} loading={actionLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.large,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.divider,
    padding: spacing.xl,
    gap: spacing.xl,
    alignItems: 'stretch',
  },
  exampleWrap: {
    borderRadius: radius.medium,
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...shadows.raised,
  },
  example: {
    width: '100%',
  },
  copy: {
    gap: spacing.xs,
    alignItems: 'center',
  },
});
