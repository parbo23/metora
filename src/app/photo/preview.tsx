import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { frameText } from '@/features/shotinfo/format';
import { useShotInfo } from '@/features/shotinfo/useShotInfo';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, spacing } from '@/theme';
import type { WorkflowPhoto } from '@/types/workflow';

/**
 * Preview: the picked photo and the lines the frame will print. The camera
 * info is read from the working copy's original bytes.
 */
export default function PreviewScreen() {
  const router = useRouter();
  const { photo } = usePhotoWorkflow();

  if (!photo) {
    return (
      <Screen safeTop={false}>
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoMissingTitle}
          body={copy.errors.photoMissingBody}
        />
        <PrimaryButton title={copy.notFound.home} variant="secondary" onPress={() => router.navigate('/')} />
      </Screen>
    );
  }

  return <PreviewContent photo={photo} />;
}

function PreviewContent({ photo }: { photo: WorkflowPhoto }) {
  const state = useShotInfo(photo.uri);
  const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;

  return (
    <Screen safeTop={false}>
      <PhotoPreview
        source={{ uri: photo.uri }}
        aspectRatio={Math.min(Math.max(aspectRatio, 3 / 4), 16 / 9)}
        accessibilityLabel={photo.displayName}
      />

      {state.status === 'loading' ? (
        <Card style={styles.loading} accessibilityLabel={copy.preview.reading}>
          <ActivityIndicator color={colors.navy900} />
          <AppText variant="secondary" color="textSecondary">
            {copy.preview.reading}
          </AppText>
        </Card>
      ) : null}

      {state.status === 'unreadable' ? (
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoUnreadableTitle}
          body={copy.errors.photoUnreadableBody}
        />
      ) : null}

      {state.status === 'ready' ? <FrameLines {...frameText(state.info)} /> : null}
    </Screen>
  );
}

function FrameLines({
  title,
  settings,
  date,
  hasCameraInfo,
}: ReturnType<typeof frameText>) {
  return (
    <Card style={styles.lines} accessibilityRole="summary">
      <View style={styles.left}>
        {title ? <AppText variant="cardHeading">{title}</AppText> : null}
        {settings ? (
          <AppText variant="secondary" color="textSecondary">
            {settings}
          </AppText>
        ) : null}
        {!hasCameraInfo ? (
          <AppText variant="caption" color="textSecondary">
            {copy.frame.noCameraInfo}
          </AppText>
        ) : null}
      </View>
      {date ? (
        <AppText variant="secondary" color="textSecondary">
          {date}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
  },
  lines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: {
    flex: 1,
    gap: spacing.xs,
  },
});
