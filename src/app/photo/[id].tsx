import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { MetadataRow } from '@/components/MetadataRow';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { RawMetadataList } from '@/features/metadata/RawMetadataList';
import { metadataRows } from '@/features/metadata/presentation';
import { useMetadata } from '@/features/metadata/useMetadata';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, spacing } from '@/theme';
import type { WorkflowPhoto } from '@/types/workflow';

/**
 * Metadata — phone 2 on the design board, now with real data read on-device
 * by the metadata service. The privacy warning appears only when sensitive
 * categories are actually present in the file.
 */
export default function MetadataScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPhoto } = usePhotoWorkflow();
  const photo = getPhoto(id);

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

  return <MetadataContent photo={photo} />;
}

function MetadataContent({ photo }: { photo: WorkflowPhoto }) {
  const router = useRouter();
  const state = useMetadata(photo.uri);
  const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;

  return (
    <Screen
      safeTop={false}
      footer={
        <PrimaryButton
          title={copy.metadata.removeMetadata}
          disabled={state.status !== 'ready'}
          onPress={() => router.push({ pathname: '/photo/clean', params: { id: photo.id } })}
        />
      }
    >
      <PhotoPreview
        source={{ uri: photo.uri }}
        aspectRatio={Math.min(Math.max(aspectRatio, 3 / 4), 16 / 9)}
        accessibilityLabel={photo.displayName}
      />

      {state.status === 'loading' ? (
        <Card style={styles.loading} accessibilityLabel={copy.metadata.reading}>
          <ActivityIndicator color={colors.navy900} />
          <AppText variant="secondary" color="textSecondary">
            {copy.metadata.reading}
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

      {state.status === 'ready' ? (
        <>
          <Card padded={false} style={styles.list}>
            {metadataRows(state.snapshot, photo).map((row, index) => (
              <MetadataRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                value={row.value}
                divider={index > 0}
              />
            ))}
          </Card>

          {state.snapshot.sensitiveCategories.length > 0 ? (
            <PrivacyCard
              variant="warning"
              title={copy.metadata.warningTitle}
              body={copy.metadata.warningBody}
            />
          ) : null}

          {!state.snapshot.hasMetadata ? (
            <PrivacyCard
              variant="success"
              icon="checkCircle"
              title={copy.errors.noMetadataTitle}
              body={copy.errors.noMetadataBody}
            />
          ) : null}

          {state.snapshot.raw.length > 0 ? <RawMetadataList entries={state.snapshot.raw} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
  },
});
