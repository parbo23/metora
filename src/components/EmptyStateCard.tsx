import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';

import { colors, radius, shadows, spacing } from '@/theme';

interface EmptyStateCardProps {
  title?: string;
  description?: string;
  actionTitle: string;
  onAction: () => void;
  actionLoading?: boolean;
}

/**
 * Dashed picker card from the board's Home and Batch screens: layered photo
 * illustration with a plus button, optional copy, and the primary action.
 */
export function EmptyStateCard({
  title,
  description,
  actionTitle,
  onAction,
  actionLoading,
}: EmptyStateCardProps) {
  return (
    <View style={styles.card}>
      <PhotoStackIllustration />
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

const placeholder = require('@/assets/images/mock-photo.jpg');

function PhotoStackIllustration() {
  return (
    <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.photoCard, styles.photoBack]}>
        <Image source={placeholder} contentFit="cover" style={styles.photo} />
      </View>
      <View style={[styles.photoCard, styles.photoFront]}>
        <Image source={placeholder} contentFit="cover" style={styles.photo} />
      </View>
      <View style={styles.plus}>
        <Icon name="plus" size={26} color={colors.textOnDark} />
      </View>
    </View>
  );
}

const CARD_W = 150;
const CARD_H = 112;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.large,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.divider,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
    alignItems: 'stretch',
  },
  copy: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  illustration: {
    height: CARD_H + 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  photoCard: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    padding: 6,
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    ...shadows.raised,
  },
  photoBack: {
    top: 0,
    transform: [{ rotate: '-7deg' }, { translateX: -14 }],
    opacity: 0.9,
  },
  photoFront: {
    top: 10,
    transform: [{ rotate: '4deg' }, { translateX: 14 }],
  },
  photo: {
    flex: 1,
    borderRadius: radius.small,
  },
  plus: {
    position: 'absolute',
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },
});
