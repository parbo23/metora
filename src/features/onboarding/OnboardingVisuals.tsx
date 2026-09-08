import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon, IconBadge } from '@/components/Icon';
import { copy } from '@/copy/en';
import { colors, radius, shadows, spacing, type IconName } from '@/theme';

const photo = require('@/assets/images/mock-photo.jpg');

/**
 * Decorative illustrations for the four onboarding pages, built from the same
 * cards, badges and pills used in the app so the flow reads as Metora.
 * All visuals are hidden from assistive tech; the page copy carries the meaning.
 */
export function OnboardingVisual({ page }: { page: 0 | 1 | 2 | 3 }) {
  switch (page) {
    case 0:
      return <ProblemVisual />;
    case 1:
      return <SolutionVisual />;
    case 2:
      return <ResultVisual />;
    default:
      return <TrustVisual />;
  }
}

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no' as const };

/** A photo with the hidden data it carries floating next to it. */
function ProblemVisual() {
  const tags: { icon: IconName; label: string }[] = [
    { icon: 'location', label: copy.onboarding.visual.location },
    { icon: 'device', label: copy.onboarding.visual.device },
    { icon: 'calendar', label: copy.onboarding.visual.time },
  ];
  return (
    <View style={styles.stage} {...hidden}>
      <View style={styles.photoCard}>
        <Image source={photo} contentFit="cover" style={styles.photo} />
      </View>
      <View style={styles.tagColumn}>
        {tags.map((tag) => (
          <View key={tag.label} style={styles.tag}>
            <Icon name={tag.icon} size={14} color={colors.warningText} />
            <AppText variant="captionMedium" style={styles.tagText}>
              {tag.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The multi-select cleanup choices, all ticked. */
function SolutionVisual() {
  const rows: { icon: IconName; label: string }[] = [
    { icon: 'location', label: copy.clean.options.location.title },
    { icon: 'camera', label: copy.clean.options.camera.title },
    { icon: 'calendar', label: copy.clean.options.dateTime.title },
  ];
  return (
    <View style={styles.list} {...hidden}>
      {rows.map((row) => (
        <View key={row.label} style={styles.optionRow}>
          <IconBadge
            name={row.icon}
            backgroundColor={colors.tealSoft}
            color={colors.teal500}
            badgeSize={32}
            size={16}
          />
          <AppText variant="secondaryMedium" style={styles.optionLabel}>
            {row.label}
          </AppText>
          <View style={styles.check}>
            <Icon name="check" size={12} color={colors.textOnDark} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Original (kept) → clean copy (new). */
function ResultVisual() {
  return (
    <View style={styles.compare} {...hidden}>
      <Card style={styles.column} padded={false}>
        <AppText variant="captionMedium" color="textSecondary">
          {copy.result.original}
        </AppText>
        <Image source={photo} contentFit="cover" style={styles.thumb} />
        <AppText variant="caption" color="textSecondary">
          {copy.onboarding.visual.untouched}
        </AppText>
      </Card>
      <Icon name="arrowRight" size={16} color={colors.textSecondary} />
      <Card style={[styles.column, styles.cleanColumn]} padded={false}>
        <AppText variant="captionMedium" color="teal500">
          {copy.result.cleanCopy}
        </AppText>
        <Image source={photo} contentFit="cover" style={styles.thumb} />
        <View style={styles.cleanLine}>
          <Icon name="checkCircle" size={12} color={colors.green500} />
          <AppText variant="caption">{copy.result.cleanRows.location}</AppText>
        </View>
      </Card>
    </View>
  );
}

/** Shield with the four trust points listed as rows. */
function TrustVisual() {
  return (
    <View style={styles.trust} {...hidden}>
      <View style={styles.shield}>
        <Icon name="shield" size={40} color={colors.teal500} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  photoCard: {
    width: 170,
    height: 128,
    padding: 6,
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    ...shadows.raised,
  },
  photo: {
    flex: 1,
    borderRadius: radius.small,
  },
  tagColumn: {
    gap: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningBackground,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  tagText: {
    color: colors.warningText,
  },
  list: {
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.teal500,
  },
  optionLabel: {
    flex: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.teal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  column: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cleanColumn: {
    borderColor: colors.tealSoft,
  },
  thumb: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.small,
  },
  cleanLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trust: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
