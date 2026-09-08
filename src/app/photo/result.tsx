import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { useSaveShare, type SaveState, type ShareState } from '@/features/cleaning/useSaveShare';
import { useExportGate } from '@/features/purchase/ExportGateProvider';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, radius, spacing } from '@/theme';
import type { CleanResult, ImageFileInfo, MetadataCategory } from '@/types/metadata';
import { describeFile } from '@/features/cleaning/fileDetails';
import type { WorkflowPhoto } from '@/types/workflow';

const CATEGORY_ORDER: MetadataCategory[] = [
  'location',
  'device',
  'camera',
  'captureTime',
  'software',
  'other',
];

/**
 * Done — phone 4 on the design board. Reached only with a verified CleanResult:
 * the "Original" column lists categories that were actually present and the
 * "Clean Copy" column claims only categories the verifier confirmed absent.
 * Save Copy adds the clean copy to Photos as a NEW asset (add-only permission);
 * Share opens the system share sheet. Done ends the workflow.
 */
export default function ResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPhoto, getCleanResult, clear } = usePhotoWorkflow();
  const photo = getPhoto(id);
  const result = getCleanResult(id);
  const { save, share, saveCopy, shareCopy, openAppSettings } = useSaveShare(result);
  // Saving and sharing are the only Pro-gated actions; everything before this screen is free.
  const { requirePro } = useExportGate();
  const saveWithPro = () => requirePro(() => saveCopy());
  const shareWithPro = () => requirePro(() => shareCopy());

  if (!photo || !result) {
    return (
      <Screen safeTop={false}>
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoMissingTitle}
          body={copy.errors.photoMissingBody}
        />
        <PrimaryButton title={copy.tabs.home} variant="secondary" onPress={() => router.navigate('/')} />
      </Screen>
    );
  }

  const finish = () => {
    clear();
    router.navigate('/');
  };

  return (
    <Screen
      safeTop={false}
      footer={
        <View style={styles.actions}>
          <SaveFeedback save={save} onOpenSettings={() => void openAppSettings()} />
          <ShareFeedback share={share} />
          {save.status === 'done' && save.outcome.kind === 'saved' ? (
            <PrimaryButton title={copy.result.done} onPress={finish} />
          ) : (
            <PrimaryButton
              title={save.status === 'saving' ? copy.result.saving : copy.result.saveCopy}
              onPress={saveWithPro}
              loading={save.status === 'saving'}
              disabled={save.status === 'saving' || share.status === 'sharing'}
            />
          )}
          <PrimaryButton
            title={copy.result.share}
            variant="secondary"
            icon="photos"
            onPress={shareWithPro}
            loading={share.status === 'sharing'}
            disabled={save.status === 'saving' || share.status === 'sharing'}
          />
          {save.status === 'done' && save.outcome.kind === 'saved' ? null : (
            <PrimaryButton title={copy.result.done} variant="text" onPress={finish} />
          )}
        </View>
      }
    >
      <Card size="large" style={styles.success} accessibilityRole="summary">
        <View style={styles.checkCircle}>
          <Icon name="check" size={34} color={colors.green500} />
        </View>
        <AppText variant="screenTitle" align="center">
          {result.alreadyClean ? copy.result.alreadyCleanHeading : copy.result.heading}
        </AppText>
        <AppText variant="secondary" color="textSecondary" align="center">
          {result.alreadyClean ? copy.result.alreadyCleanBody : copy.result.body}
        </AppText>
      </Card>

      <Comparison photo={photo} result={result} />

      <FileDetails result={result} />
    </Screen>
  );
}

function SaveFeedback({ save, onOpenSettings }: { save: SaveState; onOpenSettings: () => void }) {
  if (save.status !== 'done') return null;
  switch (save.outcome.kind) {
    case 'saved':
      return (
        <PrivacyCard
          variant="success"
          icon="checkCircle"
          title={copy.result.savedTitle}
          body={copy.result.savedBody}
        />
      );
    case 'denied':
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
    case 'unavailable':
      return (
        <PrivacyCard
          variant="neutral"
          title={copy.result.saveUnavailableTitle}
          body={copy.result.saveUnavailableBody}
        />
      );
    case 'failed':
    default:
      return (
        <PrivacyCard
          variant="warning"
          title={copy.result.saveFailedTitle}
          body={copy.result.saveFailedBody}
        />
      );
  }
}

function ShareFeedback({ share }: { share: ShareState }) {
  if (share.status !== 'done' || share.outcome.kind === 'shared') return null;
  if (share.outcome.kind === 'unavailable') {
    return (
      <PrivacyCard
        variant="neutral"
        title={copy.result.shareUnavailableTitle}
        body={copy.result.shareUnavailableBody}
      />
    );
  }
  return (
    <PrivacyCard variant="warning" title={copy.result.shareFailedTitle} body={copy.result.shareFailedBody} />
  );
}

function Comparison({ photo, result }: { photo: WorkflowPhoto; result: CleanResult }) {
  const present = CATEGORY_ORDER.filter((c) => result.originalCategories.includes(c));
  const removed = CATEGORY_ORDER.filter((c) => result.removedCategories.includes(c));
  const kept = CATEGORY_ORDER.filter((c) => result.keptCategories.includes(c));

  return (
    <View style={styles.compare}>
      <Card style={styles.column} padded={false}>
        <AppText variant="captionMedium" color="textSecondary" style={styles.columnTitle}>
          {copy.result.original}
        </AppText>
        <PhotoPreview
          source={{ uri: photo.uri }}
          aspectRatio={4 / 3}
          borderRadius={radius.small}
          style={styles.thumb}
          accessibilityLabel={photo.displayName}
        />
        <View style={styles.rows}>
          {present.length === 0 ? (
            <AppText variant="caption" color="textSecondary">
              {copy.errors.noMetadataTitle}
            </AppText>
          ) : (
            present.map((category) => (
              <View
                key={category}
                style={styles.rowLine}
                accessibilityLabel={`${copy.result.originalRows[category]}, ${copy.result.present}`}
              >
                <Icon name={iconFor(category)} size={12} color={colors.textSecondary} />
                <AppText variant="caption" color="textSecondary" style={styles.rowLabel} numberOfLines={1}>
                  {copy.result.originalRows[category]}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {copy.result.present}
                </AppText>
              </View>
            ))
          )}
        </View>
      </Card>

      <View style={styles.arrow} accessibilityElementsHidden importantForAccessibility="no">
        <Icon name="arrowRight" size={16} color={colors.textSecondary} />
      </View>

      <Card style={[styles.column, styles.cleanColumn]} padded={false}>
        <AppText variant="captionMedium" color="teal500" style={styles.columnTitle}>
          {copy.result.cleanCopy}
        </AppText>
        <PhotoPreview
          source={{ uri: result.outputUri }}
          aspectRatio={4 / 3}
          borderRadius={radius.small}
          style={styles.thumb}
          accessibilityLabel={result.outputDisplayName}
        />
        <View style={styles.rows}>
          {removed.map((category) => (
            <View key={category} style={styles.rowLine} accessibilityLabel={copy.result.cleanRows[category]}>
              <Icon name="checkCircle" size={12} color={colors.green500} />
              <AppText variant="caption" style={styles.rowLabel} numberOfLines={1}>
                {copy.result.cleanRows[category]}
              </AppText>
            </View>
          ))}
          {kept.map((category) => (
            <View
              key={category}
              style={styles.rowLine}
              accessibilityLabel={`${copy.result.originalRows[category]}, ${copy.result.kept}`}
            >
              <Icon name={iconFor(category)} size={12} color={colors.textSecondary} />
              <AppText variant="caption" color="textSecondary" style={styles.rowLabel} numberOfLines={1}>
                {copy.result.originalRows[category]}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {copy.result.kept}
              </AppText>
            </View>
          ))}
          {removed.length === 0 && kept.length === 0 ? (
            <View style={styles.rowLine}>
              <Icon name="checkCircle" size={12} color={colors.green500} />
              <AppText variant="caption" style={styles.rowLabel}>
                {copy.errors.noMetadataBody}
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

/**
 * Diagnostics read from the actual bytes: what the pipeline received and what
 * it wrote. Lets a tester spot a format or size change at a glance.
 */
function FileDetails({ result }: { result: CleanResult }) {
  return (
    <Card padded={false} style={styles.details}>
      <AppText variant="captionMedium" color="textSecondary" style={styles.detailsTitle}>
        {copy.result.fileDetails.toUpperCase()}
      </AppText>
      <FileDetailRow label={copy.result.fileOriginal} info={result.originalInfo} />
      <FileDetailRow label={copy.result.fileCleanCopy} info={result.outputInfo} divider />
    </Card>
  );
}

function FileDetailRow({
  label,
  info,
  divider = false,
}: {
  label: string;
  info: ImageFileInfo;
  divider?: boolean;
}) {
  const value = describeFile(info);
  return (
    <View
      style={[styles.detailRow, divider && styles.detailDivider]}
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${value}`}
    >
      <AppText variant="secondaryMedium">{label}</AppText>
      <AppText variant="secondary" color="textSecondary" align="right" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

function iconFor(category: MetadataCategory) {
  switch (category) {
    case 'location':
      return 'location' as const;
    case 'captureTime':
      return 'calendar' as const;
    case 'device':
      return 'device' as const;
    case 'camera':
      return 'camera' as const;
    case 'software':
      return 'software' as const;
    default:
      return 'list' as const;
  }
}

const styles = StyleSheet.create({
  details: {
    overflow: 'hidden',
  },
  detailsTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    letterSpacing: 0.6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  detailDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  detailValue: {
    flex: 1,
  },
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
  feedback: {
    gap: spacing.md,
  },
});
