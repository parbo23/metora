import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { mockRecentItems } from '@/features/metadata/mock';
import { colors, spacing } from '@/theme';

/** Recent — lightweight local log. Phase 1 renders static rows only. */
export default function RecentScreen() {
  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <AppText variant="hero" color="navy900">
          {copy.recent.title}
        </AppText>
        <PrimaryButton variant="text" title={copy.recent.clearHistory} onPress={() => {}} />
      </View>

      <Card padded={false}>
        {mockRecentItems.map((item, index) => (
          <View
            key={item.id}
            style={[styles.row, index > 0 && styles.rowDivider]}
            accessibilityRole="text"
            accessibilityLabel={`${item.fileName}, ${item.status}, ${item.when}`}>
            <PhotoPreview
              source={item.source}
              aspectRatio={1}
              borderRadius={10}
              style={styles.thumb}
              accessibilityLabel={item.fileName}
            />
            <View style={styles.rowText}>
              <AppText variant="bodyMedium" numberOfLines={1}>
                {item.fileName}
              </AppText>
              <View style={styles.statusRow}>
                <Icon name="checkCircle" size={14} color={colors.green500} />
                <AppText variant="secondary" color="textSecondary">
                  {item.status}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color="textSecondary" align="right">
              {item.when}
            </AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  thumb: {
    width: 48,
  },
});
