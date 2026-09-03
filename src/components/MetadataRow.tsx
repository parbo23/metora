import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { Icon, IconBadge } from './Icon';

import { colors, spacing, type IconName } from '@/theme';

interface MetadataRowProps {
  icon: IconName;
  title: string;
  value?: string;
  showChevron?: boolean;
  onPress?: () => void;
  /** Draw a divider above the row (used inside grouped cards). */
  divider?: boolean;
}

/**
 * One human-readable metadata line: icon, title, value, optional chevron.
 * Read by VoiceOver as a single element, e.g. "Location, Amsterdam Netherlands".
 */
export function MetadataRow({
  icon,
  title,
  value,
  showChevron = false,
  onPress,
  divider = false,
}: MetadataRowProps) {
  const label = value ? `${title}, ${value}` : title;
  const interactive = Boolean(onPress);

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : 'text'}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && interactive && styles.pressed,
      ]}>
      <IconBadge name={icon} />
      <AppText
        variant="bodyMedium"
        style={value ? styles.title : styles.titleOnly}
        numberOfLines={1}>
        {title}
      </AppText>
      {value ? (
        <AppText
          variant="secondary"
          color="textSecondary"
          align="right"
          style={styles.value}
          numberOfLines={2}>
          {value}
        </AppText>
      ) : null}
      {showChevron ? <Icon name="chevronRight" size={14} color={colors.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  title: {
    flexShrink: 0,
  },
  titleOnly: {
    flex: 1,
  },
  value: {
    flex: 1,
  },
});
