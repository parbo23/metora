import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/Card';
import { MetadataRow } from '@/components/MetadataRow';
import { PhotoPreview } from '@/components/PhotoPreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { mockMetadataRows, mockPhoto } from '@/features/metadata/mock';
import { spacing } from '@/theme';

/**
 * Metadata — phone 2 on the design board.
 * Phase 1 renders static mock rows; real ExifReader data arrives in Phase 4.
 */
export default function MetadataScreen() {
  const router = useRouter();

  return (
    <Screen
      safeTop={false}
      footer={
        <PrimaryButton
          title={copy.metadata.removeMetadata}
          onPress={() => router.push({ pathname: '/photo/clean', params: { id: mockPhoto.id } })}
        />
      }>
      <PhotoPreview source={mockPhoto.source} accessibilityLabel={mockPhoto.fileName} />

      <Card padded={false} style={styles.list}>
        {mockMetadataRows.map((row, index) => (
          <MetadataRow
            key={row.key}
            icon={row.icon}
            title={row.title}
            value={row.value}
            showChevron
            divider={index > 0}
          />
        ))}
        <MetadataRow icon="list" title={copy.metadata.viewAll} showChevron divider onPress={() => {}} />
      </Card>

      <PrivacyCard
        variant="warning"
        title={copy.metadata.warningTitle}
        body={copy.metadata.warningBody}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
});
