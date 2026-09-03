import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { mockPhoto } from '@/features/metadata/mock';
import { colors, radius, spacing } from '@/theme';

const originalRows = [
  copy.result.originalRows.location,
  copy.result.originalRows.camera,
  copy.result.originalRows.captureTime,
];

const cleanRows = [
  copy.result.cleanRows.gps,
  copy.result.cleanRows.device,
  copy.result.cleanRows.camera,
  copy.result.cleanRows.capture,
];

/**
 * Done — phone 4 on the design board. Static in Phase 1; in Phase 5 every
 * "clean copy" line is only shown once post-export verification confirms it.
 */
export default function ResultScreen() {
  const router = useRouter();

  return (
    <Screen
      safeTop={false}
      footer={
        <View style={styles.actions}>
          <PrimaryButton title={copy.result.saveCopy} onPress={() => router.navigate('/')} />
          <PrimaryButton title={copy.result.share} variant="secondary" icon="photos" onPress={() => {}} />
        </View>
      }>
      <Card size="large" style={styles.success} accessibilityRole="summary">
        <View style={styles.checkCircle}>
          <Icon name="check" size={34} color={colors.green500} />
        </View>
        <AppText variant="screenTitle" align="center">
          {copy.result.heading}
        </AppText>
        <AppText variant="secondary" color="textSecondary" align="center">
          {copy.result.body}
        </AppText>
      </Card>

      <View style={styles.compare}>
        <Card style={styles.column} padded={false}>
          <AppText variant="captionMedium" color="textSecondary" style={styles.columnTitle}>
            {copy.result.original}
          </AppText>
          <PhotoPreview source={mockPhoto.source} aspectRatio={4 / 3} borderRadius={radius.small} style={styles.thumb} />
          <View style={styles.rows}>
            {originalRows.map((label) => (
              <View key={label} style={styles.rowLine} accessibilityLabel={`${label}, ${copy.result.present}`}>
                <Icon name="location" size={12} color={colors.textSecondary} />
                <AppText variant="caption" color="textSecondary" style={styles.rowLabel} numberOfLines={1}>
                  {label}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {copy.result.present}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.arrow} accessibilityElementsHidden importantForAccessibility="no">
          <Icon name="arrowRight" size={16} color={colors.textSecondary} />
        </View>

        <Card style={[styles.column, styles.cleanColumn]} padded={false}>
          <AppText variant="captionMedium" color="teal500" style={styles.columnTitle}>
            {copy.result.cleanCopy}
          </AppText>
          <PhotoPreview source={mockPhoto.source} aspectRatio={4 / 3} borderRadius={radius.small} style={styles.thumb} />
          <View style={styles.rows}>
            {cleanRows.map((label) => (
              <View key={label} style={styles.rowLine} accessibilityLabel={label}>
                <Icon name="checkCircle" size={12} color={colors.green500} />
                <AppText variant="caption" style={styles.rowLabel} numberOfLines={1}>
                  {label}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  compare: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cleanColumn: {
    borderColor: colors.tealSoft,
  },
  columnTitle: {
    letterSpacing: 0.4,
  },
  thumb: {
    width: '100%',
  },
  rows: {
    gap: spacing.xs,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowLabel: {
    flex: 1,
  },
  arrow: {
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.md,
  },
});
