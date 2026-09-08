import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import {
  FailedList,
  ModeOptions,
  PhotoGrid,
  ProgressCard,
  SaveAllFeedback,
  SummaryCard,
} from '@/features/batch/BatchViews';
import { summarizeSaves } from '@/features/batch/batchState';
import { useBatch } from '@/features/batch/useBatch';
import { RecentList } from '@/features/recent/RecentList';
import { useExportGate } from '@/features/purchase/ExportGateProvider';
import { useRecentHistory } from '@/features/recent/RecentHistoryProvider';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { openAppSettings } from '@/services/PhotoSaveService';
import { colors, spacing } from '@/theme';
import type { WorkSession, WorkflowPhoto } from '@/types/workflow';

/**
 * Batch — phone 5 on the design board, simplified per the spec.
 * Empty state → pick photos → choose a mode → sequential clean with real
 * progress → summary with per-photo failures, Retry Failed and Save All.
 */
export default function BatchScreen() {
  const { photos, kind, isPicking, error, skippedCount, session, choosePhotos, clear } = usePhotoWorkflow();
  const hasSelection = kind === 'batch' && photos.length > 0;

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <AppText variant="hero" color="navy900">
          {copy.batch.title}
        </AppText>
      </View>

      {hasSelection ? (
        <BatchFlow photos={photos} session={session} skippedCount={skippedCount} onFinish={clear} />
      ) : (
        <EmptyStateView
          isPicking={isPicking}
          error={error}
          onChoose={() => void choosePhotos({ allowsMultiple: true })}
        />
      )}
    </Screen>
  );
}

function BatchFlow({
  photos,
  session,
  skippedCount,
  onFinish,
}: {
  photos: WorkflowPhoto[];
  session: WorkSession | null;
  skippedCount: number;
  onFinish: () => void;
}) {
  const { state, summary, setMode, clean, retryFailed, saveAllCopies } = useBatch(photos, session);
  // Saving the batch to Photos is the only Pro-gated step; selecting and cleaning stay free.
  const { requirePro } = useExportGate();
  const saves = summarizeSaves(state);

  if (state.phase === 'selecting') {
    return (
      <>
        <View style={styles.selectionHeader}>
          <AppText variant="sectionTitle">{copy.batch.selected(photos.length)}</AppText>
          <PrimaryButton variant="text" title={copy.batch.clearSelection} onPress={onFinish} />
        </View>
        <PhotoGrid items={state.items} showStatus={false} />
        {skippedCount > 0 ? <PrivacyCard variant="warning" title={copy.batch.skipped(skippedCount)} /> : null}
        <ModeOptions mode={state.mode} onChange={setMode} disabled={false} />
        <PrivacyCard variant="success" title={copy.clean.trustTitle} body={copy.clean.trustBody} />
        <PrimaryButton
          title={copy.batch.cleanPhotos(photos.length)}
          onPress={() => void clean()}
          disabled={!session}
        />
      </>
    );
  }

  if (state.phase === 'processing') {
    return (
      <>
        <ProgressCard state={state} />
        <PhotoGrid items={state.items} showStatus />
      </>
    );
  }

  const saving = state.savePhase === 'saving';
  const allSaved = state.savePhase === 'done' && saves.saved === summary.cleaned && summary.cleaned > 0;

  return (
    <>
      <SummaryCard state={state} />
      <PhotoGrid items={state.items} showStatus />
      <FailedList state={state} />
      <SaveAllFeedback state={state} onOpenSettings={() => void openAppSettings()} />

      <View style={styles.actions}>
        {summary.failed > 0 ? (
          <PrimaryButton
            title={copy.batch.retryFailed}
            variant="secondary"
            onPress={() => void retryFailed()}
          />
        ) : null}
        {summary.cleaned > 0 && !allSaved ? (
          <PrimaryButton
            title={saving ? copy.batch.savingAll : copy.batch.saveAll}
            onPress={() => requirePro(() => saveAllCopies())}
            loading={saving}
            disabled={saving}
          />
        ) : null}
        <PrimaryButton
          title={copy.result.done}
          variant={allSaved ? 'primary' : 'text'}
          onPress={onFinish}
          disabled={saving}
        />
      </View>
    </>
  );
}

function EmptyStateView({
  isPicking,
  error,
  onChoose,
}: {
  isPicking: boolean;
  error: 'unreadable' | null;
  onChoose: () => void;
}) {
  return (
    <>
      <EmptyStateCard
        title={copy.batch.emptyTitle}
        description={copy.batch.emptyBody}
        actionTitle={isPicking ? copy.home.loadingPhotos : copy.batch.choosePhotos}
        onAction={onChoose}
        actionLoading={isPicking}
      />

      {error === 'unreadable' ? (
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoUnreadableTitle}
          body={copy.errors.photoUnreadableBody}
        />
      ) : null}

      <PrivacyCard variant="neutral" title={copy.batch.onDeviceTitle} body={copy.batch.onDeviceBody} />

      <RecentPreview />
    </>
  );
}

/** Latest activity-log entries (no thumbnails or file names), with a link to Recent. */
function RecentPreview() {
  const router = useRouter();
  const { records } = useRecentHistory();
  if (records.length === 0) return null;
  return (
    <>
      <View style={styles.sectionHeader}>
        <AppText variant="sectionTitle">{copy.batch.recentActivity}</AppText>
      </View>
      <RecentList records={records} limit={3} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.batch.seeAll}
        onPress={() => router.navigate('/recent')}
        style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
      >
        <AppText variant="secondaryMedium" color="navy800">
          {copy.batch.seeAll}
        </AppText>
        <Icon name="chevronRight" size={14} color={colors.navy800} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    gap: spacing.md,
  },
  sectionHeader: {
    marginBottom: -spacing.sm,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
});
