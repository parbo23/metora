import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { Icon } from '@/components/Icon';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, spacing } from '@/theme';

/**
 * Home: the single empty state. Picking a photo brings it into the workflow;
 * the preview screen that follows is added in the next phase.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { choosePhoto, isPicking, error } = usePhotoWorkflow();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titles}>
          <AppText variant="hero" color="navy900">
            {copy.brand}
          </AppText>
          <AppText variant="secondary" color="textSecondary">
            {copy.home.subtitle}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.settings.title}
          hitSlop={8}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <Icon name="settings" size={22} color={colors.navy900} />
        </Pressable>
      </View>

      <EmptyStateCard
        title={copy.home.emptyTitle}
        actionTitle={isPicking ? copy.home.loadingPhoto : copy.home.choosePhoto}
        onAction={() => void choosePhoto()}
        actionLoading={isPicking}
      />

      {error === 'unreadable' ? (
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoUnreadableTitle}
          body={copy.errors.photoUnreadableBody}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  titles: {
    flex: 1,
    gap: spacing.xs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
