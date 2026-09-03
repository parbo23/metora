import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Icon, IconBadge } from './Icon';

import { colors, radius, spacing, type IconName } from '@/theme';

interface CleanOptionCardProps {
  icon: IconName;
  heading: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  /** Small pill shown for the recommended option. */
  badge?: string;
}

/**
 * Radio-style selection card from the Clean Up screen. Selected state uses a
 * teal border plus a filled check indicator so it never relies on color alone.
 */
export function CleanOptionCard({ icon, heading, description, selected, onPress, badge }: CleanOptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${heading}. ${description}`}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}>
      <IconBadge
        name={icon}
        backgroundColor={selected ? colors.tealSoft : colors.navySoft}
        color={selected ? colors.teal500 : colors.navy800}
      />
      <View style={styles.text}>
        <View style={styles.headingRow}>
          <AppText variant="cardHeading">{heading}</AppText>
          {badge ? (
            <View style={styles.badge}>
              <AppText variant="captionMedium" color="teal500">
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="secondary" color="textSecondary">
          {description}
        </AppText>
      </View>
      <View style={[styles.indicator, selected && styles.indicatorSelected]}>
        {selected ? <Icon name="check" size={13} color={colors.textOnDark} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.card,
    minHeight: 72,
  },
  selected: {
    borderColor: colors.teal500,
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: {
    backgroundColor: colors.teal500,
    borderColor: colors.teal500,
  },
});
