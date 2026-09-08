import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { failedItems, summarize, summarizeSaves, type BatchItem, type BatchState } from './batchState';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { CleanOptionCard } from '@/components/CleanOptionCard';
import { Icon } from '@/components/Icon';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { copy } from '@/copy/en';
import type { CleanOutcome } from '@/services/PhotoCleaningService';
import { colors, radius, spacing, type IconName } from '@/theme';
import type { CleanMode } from '@/types/metadata';

const options: { mode: CleanMode; icon: IconName; title: string; description: string }[] = [
  { mode: 'location', icon: 'location', ...copy.clean.options.location },
  { mode: 'camera', icon: 'camera', ...copy.clean.options.camera },
  { mode: 'dateTime', icon: 'calendar', ...copy.clean.options.dateTime },
  { mode: 'all', icon: 'shield', ...copy.clean.options.all },
];

/** Thumbnail grid shared by the selection and result views. */
export function PhotoGrid({ items, showStatus }: { items: BatchItem[]; showStatus: boolean }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.photo.id} style={styles.gridItem}>
          <PhotoPreview
            source={{ uri: item.photo.uri }}
            aspectRatio={1}
            borderRadius={12}
            accessibilityLabel={`${item.photo.displayName}, ${statusLabel(item)}`}
          />
          {showStatus ? <StatusBadge item={item} /> : null}
        </View>
      ))}
    </View>
  );
}

function statusLabel(item: BatchItem): string {
  switch (item.status.kind) {
    case 'pending':
      return copy.batch.pendingStatus;
    case 'cleaning':
      return copy.processing.cleaning;
    case 'verifying':
      return copy.processing.verifying;
    case 'cleaned':
      return copy.batch.cleanedStatus;
    case 'failed':
      return failureTitle(item.status.outcome);
  }
}

function StatusBadge({ item }: { item: BatchItem }) {
  const kind = item.status.kind;
  if (kind === 'pending') return null;
  if (kind === 'cleaning' || kind === 'verifying') {
    return (
      <View style={[styles.badge, styles.badgeNeutral]}>
        <ActivityIndicator size="small" color={colors.navy900} />
      </View>
    );
  }
  const ok = kind === 'cleaned';
  return (
    <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeFail]}>
      <Icon name={ok ? 'check' : 'warning'} size={12} color={ok ? colors.textOnDark : colors.warningText} />
    </View>
  );
}

export function failureTitle(outcome: Exclude<CleanOutcome, { kind: 'cleaned' }>): string {
  switch (outcome.kind) {
    case 'verificationFailed':
      return copy.errors.verificationFailedTitle;
    case 'unsupported':
      return copy.errors.unsupportedTitle;
    case 'unreadable':
      return copy.errors.photoUnreadableTitle;
    default:
      return copy.errors.exportFailedTitle;
  }
}

export function ModeOptions({
  mode,
  onChange,
  disabled,
}: {
  mode: CleanMode;
  onChange: (mode: CleanMode) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.optionBlock}>
      <AppText variant="captionMedium" color="textSecondary" style={styles.optionLabel}>
        {copy.batch.cleaningOption.toUpperCase()}
      </AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option) => (
          <CleanOptionCard
            key={option.mode}
            icon={option.icon}
            heading={option.title}
            description={option.description}
            selected={mode === option.mode}
            onPress={() => {
              if (!disabled && option.mode !== mode) onChange(option.mode);
            }}
            badge={option.mode === 'all' ? copy.clean.recommended : undefined}
          />
        ))}
      </View>
    </View>
  );
}

/** "Cleaning 4 of 12" with a real progress bar (completed / total). */
export function ProgressCard({ state }: { state: BatchState }) {
  const summary = summarize(state);
  const verifying = state.items.some((i) => i.status.kind === 'verifying');
  const label = verifying
    ? copy.batch.verifyingProgress(summary.currentIndex, summary.total)
    : copy.batch.cleaningProgress(summary.currentIndex, summary.total);
  const fraction = summary.total === 0 ? 0 : summary.completed / summary.total;
  return (
    <Card
      style={styles.progressCard}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: summary.total, now: summary.completed }}
    >
      <View style={styles.progressRow}>
        <ActivityIndicator color={colors.navy900} />
        <AppText variant="bodyMedium">{label}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
      </View>
    </Card>
  );
}

/** "12 photos cleaned / 12 verified / 0 failed". */
export function SummaryCard({ state }: { state: BatchState }) {
  const summary = summarize(state);
  const allOk = summary.failed === 0;
  return (
    <Card size="large" style={styles.summary} accessibilityRole="summary">
      <View style={[styles.summaryIcon, allOk ? styles.summaryIconOk : styles.summaryIconWarn]}>
        <Icon
          name={allOk ? 'check' : 'warning'}
          size={30}
          color={allOk ? colors.green500 : colors.warningText}
        />
      </View>
      <AppText variant="screenTitle" align="center">
        {copy.batch.summaryCleaned(summary.cleaned)}
      </AppText>
      <View style={styles.summaryLines}>
        <AppText variant="secondary" color="textSecondary">
          {copy.batch.summaryVerified(summary.cleaned)}
        </AppText>
        <AppText variant="secondary" color={summary.failed > 0 ? 'warningText' : 'textSecondary'}>
          {copy.batch.summaryFailed(summary.failed)}
        </AppText>
      </View>
    </Card>
  );
}

export function FailedList({ state }: { state: BatchState }) {
  const failed = failedItems(state);
  if (failed.length === 0) return null;
  return (
    <View style={styles.failedBlock}>
      <PrivacyCard variant="warning" title={copy.batch.someFailedTitle} body={copy.batch.someFailedBody} />
      <Card padded={false}>
        {failed.map((item, index) => (
          <View
            key={item.photo.id}
            style={[styles.row, index > 0 && styles.rowDivider]}
            accessibilityLabel={`${item.photo.displayName}, ${failureTitle(item.status.outcome)}`}
          >
            <PhotoPreview
              source={{ uri: item.photo.uri }}
              aspectRatio={1}
              borderRadius={10}
              style={styles.thumb}
              accessibilityLabel={item.photo.displayName}
            />
            <View style={styles.rowText}>
              <AppText variant="bodyMedium" numberOfLines={1}>
                {item.photo.displayName}
              </AppText>
              <AppText variant="secondary" color="warningText" numberOfLines={2}>
                {failureTitle(item.status.outcome)}
              </AppText>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

export function SaveAllFeedback({
  state,
  onOpenSettings,
}: {
  state: BatchState;
  onOpenSettings: () => void;
}) {
  if (state.savePhase !== 'done') return null;
  const saves = summarizeSaves(state);
  const cleaned = summarize(state).cleaned;
  if (saves.unavailable > 0 && saves.saved === 0) {
    return (
      <PrivacyCard
        variant="neutral"
        title={copy.result.saveUnavailableTitle}
        body={copy.result.saveUnavailableBody}
      />
    );
  }
  if (saves.denied > 0 && saves.saved === 0) {
    return (
      <View style={styles.feedback}>
        <PrivacyCard
          variant="warning"
          icon="lock"
          title={copy.result.saveDeniedTitle}
          body={copy.result.saveDeniedBody}
        />
        <PrimaryButton title={copy.result.openSettings} variant="secondary" onPress={onOpenSettings} />
      </View>
    );
  }
  const complete = saves.saved === cleaned;
  return (
    <PrivacyCard
      variant={complete ? 'success' : 'warning'}
      icon={complete ? 'checkCircle' : 'warning'}
      title={copy.batch.savedAll(saves.saved, cleaned)}
      body={complete ? copy.batch.savedAllBody : copy.batch.savePartialBody}
    />
  );
}

const GRID_GAP = spacing.sm;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    flexBasis: '31%',
    flexGrow: 1,
    maxWidth: '32%',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeOk: {
    backgroundColor: colors.green500,
  },
  badgeFail: {
    backgroundColor: colors.warningBackground,
  },
  badgeNeutral: {
    backgroundColor: colors.card,
  },
  optionBlock: {
    gap: spacing.sm,
  },
  optionLabel: {
    paddingHorizontal: spacing.xs,
    letterSpacing: 0.6,
  },
  options: {
    gap: spacing.md,
  },
  progressCard: {
    gap: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.navySoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.teal500,
    borderRadius: radius.pill,
  },
  summary: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summaryIconOk: {
    backgroundColor: colors.successBackground,
  },
  summaryIconWarn: {
    backgroundColor: colors.warningBackground,
  },
  summaryLines: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  failedBlock: {
    gap: spacing.md,
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
  feedback: {
    gap: spacing.md,
  },
});
