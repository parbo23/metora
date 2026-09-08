import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { groupLabel, sortedRawEntries } from './presentation';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon, IconBadge } from '@/components/Icon';
import { copy } from '@/copy/en';
import { colors, spacing } from '@/theme';
import type { RawMetadataEntry } from '@/types/metadata';

/**
 * "View All Metadata" disclosure for power users. Collapsed by default;
 * expands to the technical tag list grouped by container.
 */
export function RawMetadataList({ entries }: { entries: RawMetadataEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = sortedRawEntries(entries);

  return (
    <Card padded={false} style={styles.card}>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${copy.metadata.viewAll}, ${entries.length} ${entries.length === 1 ? 'field' : 'fields'}`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <IconBadge name="list" />
        <AppText variant="bodyMedium" style={styles.title}>
          {copy.metadata.viewAll}
        </AppText>
        <AppText variant="secondary" color="textSecondary">
          {entries.length}
        </AppText>
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} color={colors.textSecondary} />
      </Pressable>

      {expanded ? (
        <View style={styles.list}>
          {sorted.map((entry, index) => {
            const showGroup = index === 0 || sorted[index - 1].group !== entry.group;
            return (
              <View key={`${entry.group}:${entry.name}:${index}`}>
                {showGroup ? (
                  <AppText variant="captionMedium" color="textSecondary" style={styles.group}>
                    {groupLabel(entry.group).toUpperCase()}
                  </AppText>
                ) : null}
                <View style={styles.row} accessibilityLabel={`${entry.name}, ${entry.description}`}>
                  <AppText variant="secondaryMedium" style={styles.name} numberOfLines={1}>
                    {entry.name}
                  </AppText>
                  <AppText variant="secondary" color="textSecondary" style={styles.value} numberOfLines={3}>
                    {entry.description}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  title: {
    flex: 1,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  group: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  name: {
    flexBasis: '42%',
    flexShrink: 0,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
});
