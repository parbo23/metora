import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { Toast } from '@/components/Toast';
import { copy } from '@/copy/en';
import { useSaveShare, type SaveState, type ShareState } from '@/features/export/useSaveShare';
import { useFrameRender } from '@/features/frame/useFrameRender';
import { useExportGate } from '@/features/purchase/ExportGateProvider';
import { frameText, type FrameText } from '@/features/shotinfo/format';
import { useShotInfo } from '@/features/shotinfo/useShotInfo';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, radius, spacing } from '@/theme';
import type { WorkflowPhoto } from '@/types/workflow';

/**
 * Preview: the framed photo exactly as it will be exported, with Save to
 * Photos and Share. The camera info is read from the working copy's original
 * bytes first; the frame is then rendered at full resolution and shown
 * downscaled.
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
  const router = useRouter();
  const { session, clear } = usePhotoWorkflow();
  const info = useShotInfo(photo.uri);
  const text = useMemo(() => (info.status === 'ready' ? frameText(info.info) : null), [info]);
  const render = useFrameRender(photo, session, text);
  const exportFile = useMemo(
    () => (render.status === 'ready' ? { uri: render.frame.uri, format: render.frame.format } : null),
    [render],
  );
  const { save, share, saveCopy, shareCopy, openAppSettings } = useSaveShare(exportFile);
  const { requirePro } = useExportGate();
  const [savedNonce, setSavedNonce] = useState(0);

  const onSave = () =>
    requirePro(async () => {
      await saveCopy();
      setSavedNonce((n) => n + 1);
    });
  const onShare = () => requirePro(() => shareCopy());
  const finish = () => {
    clear();
    router.navigate('/');
  };

  if (info.status === 'unreadable') {
    return (
      <Screen safeTop={false}>
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoUnreadableTitle}
          body={copy.errors.photoUnreadableBody}
        />
        <PrimaryButton title={copy.export.done} variant="secondary" onPress={finish} />
      </Screen>
    );
  }

  const busyLabel =
    info.status === 'loading' ? copy.preview.reading : render.status === 'rendering' ? copy.preview.rendering : null;
  const ready = render.status === 'ready';
  const busy = save.status === 'saving' || share.status === 'sharing';
  const saved = save.status === 'done' && save.outcome.kind === 'saved';

  return (
    <Screen
      safeTop={false}
      footer={
        <View style={styles.actions}>
          <Toast message={saved ? copy.export.savedTitle : null} nonce={savedNonce} />
          <SaveFeedback save={save} onOpenSettings={() => void openAppSettings()} />
          <ShareFeedback share={share} />
          {ready ? (
            <>
              <PrimaryButton
                title={save.status === 'saving' ? copy.export.saving : copy.export.saveToPhotos}
                onPress={onSave}
                loading={save.status === 'saving'}
                disabled={busy}
              />
              <PrimaryButton
                title={copy.export.share}
                variant="secondary"
                icon="photos"
                onPress={onShare}
                loading={share.status === 'sharing'}
                disabled={busy}
              />
            </>
          ) : null}
          <PrimaryButton title={copy.export.done} variant="text" onPress={finish} disabled={busy} />
        </View>
      }
    >
      {ready ? (
        <View style={styles.frameWrap}>
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

function SaveFeedback({ save, onOpenSettings }: { save: SaveState; onOpenSettings: () => void }) {
  if (save.status !== 'done') return null;
  switch (save.outcome.kind) {
    case 'saved':
      // The toast above covers success.
      return null;
    case 'denied':
      return (
        <View style={styles.feedback}>
          <PrivacyCard
            variant="warning"
            icon="lock"
            title={copy.export.saveDeniedTitle}
            body={copy.export.saveDeniedBody}
          />
          <PrimaryButton title={copy.export.openSettings} variant="secondary" onPress={onOpenSettings} />
        </View>
      );
    case 'unavailable':
      return (
        <PrivacyCard
          variant="neutral"
          title={copy.export.saveUnavailableTitle}
          body={copy.export.saveUnavailableBody}
        />
      );
    case 'failed':
    default:
      return (
        <PrivacyCard variant="warning" title={copy.export.saveFailedTitle} body={copy.export.saveFailedBody} />
      );
  }
}

function ShareFeedback({ share }: { share: ShareState }) {
  if (share.status !== 'done' || share.outcome.kind === 'shared') return null;
  if (share.outcome.kind === 'unavailable') {
    return (
      <PrivacyCard
        variant="neutral"
        title={copy.export.shareUnavailableTitle}
        body={copy.export.shareUnavailableBody}
      />
    );
  }
  return <PrivacyCard variant="warning" title={copy.export.shareFailedTitle} body={copy.export.shareFailedBody} />;
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
  actions: {
    gap: spacing.md,
  },
  feedback: {
    gap: spacing.md,
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
