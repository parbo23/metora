import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { CleanOptionCard } from '@/components/CleanOptionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { requestFromSelection } from '@/features/cleaning/cleanModes';
import {
  DEFAULT_SELECTION,
  isAllSelected,
  isSelected,
  selectAll,
  toggleOption,
  type CleanSelection,
} from '@/features/cleaning/cleanSelection';
import { useCleanPhoto, type CleanPhase } from '@/features/cleaning/useCleanPhoto';
import { useRecentHistory } from '@/features/recent/RecentHistoryProvider';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, spacing, type IconName } from '@/theme';
import type { CleanOption } from '@/types/metadata';
import { haptics } from '@/utils/haptics';

const options: { option: CleanOption; icon: IconName; title: string; description: string }[] = [
  { option: 'location', icon: 'location', ...copy.clean.options.location },
  { option: 'camera', icon: 'camera', ...copy.clean.options.camera },
  { option: 'dateTime', icon: 'calendar', ...copy.clean.options.dateTime },
];

/**
 * Clean Up — phone 3 on the design board.
 *
 * "Remove all metadata" is the recommended preset (everything removable); the
 * three category cards are multi-select and can be combined freely. The
 * selection becomes a CleanRequest; "Create Clean Copy" runs the pipeline
 * (rewrite → write new file → re-read and verify) and only then navigates to
 * Done. Failures are shown here, with processing failures worded differently
 * from verification failures.
 */
export default function CleanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPhoto, session, setCleanResult } = usePhotoWorkflow();
  const photo = getPhoto(id);
  const [selection, setSelection] = useState<CleanSelection>(DEFAULT_SELECTION);
  const { phase, run, reset } = useCleanPhoto();
  const { record } = useRecentHistory();

  const request = useMemo(() => requestFromSelection(selection), [selection]);
  const allSelected = isAllSelected(selection);
  const busy = phase.status === 'cleaning' || phase.status === 'verifying';

  const updateSelection = (next: CleanSelection) => {
    if (busy) return;
    haptics.selection();
    setSelection(next);
    if (phase.status === 'failed') reset();
  };

  const createCleanCopy = async () => {
    if (!photo || !session || !request) return;
    const outcome = await run(photo, request, session);
    if (!outcome) return;
    // The activity log records only the outcome, mode, count and file type.
    void record({
      mode: request.mode,
      cleanedCount: outcome.kind === 'cleaned' ? 1 : 0,
      failedCount: outcome.kind === 'cleaned' ? 0 : 1,
      fileTypes: outcome.kind === 'cleaned' ? [outcome.result.outputFormat] : [],
    });
    if (outcome.kind === 'cleaned') {
      setCleanResult(photo.id, outcome.result);
      router.push({ pathname: '/photo/result', params: { id: photo.id } });
    }
  };

  if (!photo) {
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

  return (
    <Screen
      safeTop={false}
      footer={
        <View style={styles.footer}>
          {busy ? <ProcessingCard phase={phase} /> : null}
          {phase.status === 'failed' ? (
            <FailureCard phase={phase} onRetry={() => void createCleanCopy()} />
          ) : null}
          <PrimaryButton
            title={copy.clean.createCleanCopy}
            onPress={() => void createCleanCopy()}
            loading={busy}
            disabled={busy || request === null}
          />
        </View>
      }
    >
      <View style={styles.options}>
        <CleanOptionCard
          icon="shield"
          heading={copy.clean.options.all.title}
          description={copy.clean.options.all.description}
          selected={allSelected}
          indicator="checkbox"
          onPress={() => {
            if (!allSelected) updateSelection(selectAll());
          }}
          badge={copy.clean.recommended}
        />

        <AppText variant="captionMedium" color="textSecondary" style={styles.orLabel}>
          {copy.clean.orChoose.toUpperCase()}
        </AppText>

        {options.map((item) => (
          <CleanOptionCard
            key={item.option}
            icon={item.icon}
            heading={item.title}
            description={item.description}
            selected={isSelected(selection, item.option)}
            indicator="checkbox"
            onPress={() => updateSelection(toggleOption(selection, item.option))}
          />
        ))}
      </View>

      <PrivacyCard variant="success" title={copy.clean.trustTitle} body={copy.clean.trustBody} />
    </Screen>
  );
}

function ProcessingCard({ phase }: { phase: CleanPhase }) {
  const label = phase.status === 'verifying' ? copy.processing.verifying : copy.processing.cleaning;
  return (
    <Card style={styles.processing} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.navy900} />
      <AppText variant="secondaryMedium">{label}</AppText>
    </Card>
  );
}

function FailureCard({
  phase,
  onRetry,
}: {
  phase: Extract<CleanPhase, { status: 'failed' }>;
  onRetry: () => void;
}) {
  const { outcome } = phase;
  let title: string;
  let body: string;
  let retryable = true;
  switch (outcome.kind) {
    case 'verificationFailed':
      title = copy.errors.verificationFailedTitle;
      body = copy.errors.verificationFailedBody;
      break;
    case 'unsupported':
      title = copy.errors.unsupportedTitle;
      body = copy.errors.unsupportedBody;
      retryable = false;
      break;
    case 'unreadable':
      title = copy.errors.photoUnreadableTitle;
      body = copy.errors.photoUnreadableBody;
      retryable = false;
      break;
    case 'processingFailed':
    default:
      title = copy.errors.exportFailedTitle;
      body = copy.errors.exportFailedBody;
  }
  return (
    <View style={styles.failure}>
      <PrivacyCard variant="warning" title={title} body={body} />
      {retryable ? (
        <PrimaryButton title={copy.errors.tryAgain} variant="secondary" onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  },
  orLabel: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    letterSpacing: 0.6,
  },
  footer: {
    gap: spacing.md,
  },
  processing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
  },
  failure: {
    gap: spacing.md,
  },
});
