import { StyleSheet, View } from 'react-native';

import { fileTypesLabel, formatRecentDate, modeLabel, recordSubtitle } from './presentation';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { IconBadge } from '@/components/Icon';
import { colors, spacing } from '@/theme';
import type { RecentRecord } from '@/types/recent';

/**
 * Rows of the local activity log. Deliberately no thumbnails or file names:
 * the log only knows when, how many, which mode and the outcome.
 */
export function RecentList({ records, limit }: { records: RecentRecord[]; limit?: number }) {
  const shown = limit ? records.slice(0, limit) : records;
  return (
    <Card padded={false} style={styles.card}>
      {shown.map((record, index) => (
        <RecentRow key={record.id} record={record} divider={index > 0} />
      ))}
    </Card>
  );
}

function RecentRow({ record, divider }: { record: RecentRecord; divider: boolean }) {
  const ok = record.status === 'verifiedClean';
  const failed = record.status === 'failed';
  const title = modeLabel(record.mode);
  const subtitle = recordSubtitle(record);
  const when = formatRecentDate(record.createdAt);
  const types = fileTypesLabel(record);

  return (
    <View
      style={[styles.row, divider && styles.divider]}
      accessibilityRole="text"
      accessibilityLabel={`${title}, ${subtitle}, ${when}`}
    >
      <IconBadge
        name={ok ? 'checkCircle' : 'warning'}
        color={ok ? colors.green500 : colors.warningText}
        backgroundColor={ok ? colors.successBackground : colors.warningBackground}
      />
      <View style={styles.text}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {title}
        </AppText>
        <AppText
          variant="secondary"
          color={ok ? 'teal500' : failed ? 'warningText' : 'textSecondary'}
          numberOfLines={1}
        >
          {subtitle}
        </AppText>
      </View>
      <View style={styles.meta}>
        <AppText variant="caption" color="textSecondary" align="right">
          {when}
        </AppText>
        {types ? (
          <AppText variant="caption" color="textSecondary" align="right">
            {types}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
