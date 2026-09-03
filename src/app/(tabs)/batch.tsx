import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { Icon } from '@/components/Icon';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { mockRecentItems } from '@/features/metadata/mock';
import { colors, spacing } from '@/theme';

/**
 * Batch — phone 5 on the design board, simplified per the spec.
 * Phase 1 shows the empty state with static recent exports; selection and
 * processing arrive in Phase 7.
 */
export default function BatchScreen() {
  const router = useRouter();

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <AppText variant="hero" color="navy900">
          {copy.batch.title}
        </AppText>
      </View>

      <EmptyStateCard
        title={copy.batch.emptyTitle}
        description={copy.batch.emptyBody}
        actionTitle={copy.batch.choosePhotos}
        onAction={() => {}}
      />

      <PrivacyCard variant="neutral" title={copy.batch.onDeviceTitle} body={copy.batch.onDeviceBody} />

      <View style={styles.sectionHeader}>
        <AppText variant="sectionTitle">{copy.batch.recentExports}</AppText>
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
              <AppText variant="secondary" color="teal500">
                {item.status}
              </AppText>
            </View>
            <AppText variant="caption" color="textSecondary" align="right">
              {item.when}
            </AppText>
            <Icon name="chevronRight" size={14} color={colors.textSecondary} />
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.batch.seeAll}
          onPress={() => router.navigate('/recent')}
          style={({ pressed }) => [styles.row, styles.rowDivider, styles.seeAll, pressed && styles.pressed]}>
          <AppText variant="secondaryMedium" color="navy800" style={styles.rowText}>
            {copy.batch.seeAll}
          </AppText>
          <Icon name="chevronRight" size={14} color={colors.navy800} />
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    marginBottom: -spacing.sm,
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
  thumb: {
    width: 48,
  },
  seeAll: {
    minHeight: 52,
  },
  pressed: {
    backgroundColor: colors.background,
  },
});
