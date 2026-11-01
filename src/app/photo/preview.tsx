import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { useFrameRender } from '@/features/frame/useFrameRender';
import { frameText, type FrameText } from '@/features/shotinfo/format';
import { useShotInfo } from '@/features/shotinfo/useShotInfo';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, radius, spacing } from '@/theme';
import type { WorkflowPhoto } from '@/types/workflow';

/**
 * Preview: the framed photo exactly as it will be exported. The camera info
 * is read from the working copy's original bytes first; the frame is then
 * rendered at full resolution and shown downscaled.
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
  const { session } = usePhotoWorkflow();
  const info = useShotInfo(photo.uri);
  const text = useMemo(() => (info.status === 'ready' ? frameText(info.info) : null), [info]);
  const render = useFrameRender(photo, session, text);

  if (info.status === 'unreadable') {
    return (
      <Screen safeTop={false}>
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoUnreadableTitle}
          body={copy.errors.photoUnreadableBody}
        />
      </Screen>
    );
  }

  const busyLabel =
    info.status === 'loading' ? copy.preview.reading : render.status === 'rendering' ? copy.preview.rendering : null;

  return (
    <Screen safeTop={false}>
      {render.status === 'ready' ? (
        <View style={styles.frameWrap} accessibilityLabel={copy.preview.framedPhoto}>
          <Image
            source={{ uri: render.frame.uri }}
            contentFit="contain"
            style={[styles.frame, { aspectRatio: render.frame.width / render.frame.height }]}
            accessible
            accessibilityLabel={copy.preview.framedPhoto}
          />
        </View>
      ) : (
        <PhotoPreview
          source={{ uri: photo.uri }}
          aspectRatio={Math.min(Math.max(photo.width && photo.height ? photo.width / photo.height : 4 / 3, 3 / 4), 16 / 9)}
          accessibilityLabel={photo.displayName}
        />
      )}

      {busyLabel ? (
        <Card style={styles.busy} accessibilityRole="progressbar" accessibilityLabel={busyLabel}>
          <ActivityIndicator color={colors.navy900} />
          <AppText variant="secondary" color="textSecondary">
            {busyLabel}
          </AppText>
        </Card>
      ) : null}

      {text && !text.hasCameraInfo ? (
        <AppText variant="caption" color="textSecondary" align="center">
          {copy.frame.noCameraInfo}
        </AppText>
      ) : null}

      {render.status === 'failed' ? (
        <PrivacyCard variant="warning" title={copy.preview.renderFailedTitle} body={copy.preview.renderFailedBody} />
      ) : null}

      {render.status === 'unavailable' && text ? <FrameLines text={text} /> : null}
    </Screen>
  );
}

/** Web preview only: the lines the frame prints, since the renderer is native. */
function FrameLines({ text }: { text: FrameText }) {
  return (
    <Card style={styles.lines} accessibilityRole="summary">
      <View style={styles.left}>
        {text.title ? <AppText variant="cardHeading">{text.title}</AppText> : null}
        {text.settings ? (
          <AppText variant="secondary" color="textSecondary">
            {text.settings}
          </AppText>
        ) : null}
      </View>
      {text.date ? (
        <AppText variant="secondary" color="textSecondary">
          {text.date}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  frameWrap: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.navySoft,
  },
  frame: {
    width: '100%',
  },
  busy: {
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
