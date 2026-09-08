import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { IconBadge } from '@/components/Icon';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { usePhotoWorkflow } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, spacing, type IconName } from '@/theme';

const featureIcons: { icon: IconName; color: string; background: string }[] = [
  { icon: 'search', color: colors.teal500, background: colors.tealSoft },
  { icon: 'batch', color: colors.navy800, background: colors.navySoft },
  { icon: 'lock', color: colors.green500, background: colors.successBackground },
];

/**
 * Home — phone 1 on the design board.
 * One selected photo → Metadata detail. Several → Batch.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { choosePhotos, isPicking, error } = usePhotoWorkflow();

  const onChoosePhotos = async () => {
    const route = await choosePhotos({ allowsMultiple: true });
    if (route?.kind === 'single') {
      router.push({ pathname: '/photo/[id]', params: { id: route.photoId } });
    } else if (route?.kind === 'batch') {
      router.navigate('/batch');
    }
  };

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <AppText variant="hero" color="navy900">
          {copy.brand}
        </AppText>
        <AppText variant="secondary" color="textSecondary">
          {copy.home.subtitle}
        </AppText>
      </View>

      <EmptyStateCard
        actionTitle={isPicking ? copy.home.loadingPhotos : copy.home.choosePhotos}
        onAction={() => void onChoosePhotos()}
        actionLoading={isPicking}
      />

      {error === 'unreadable' ? (
        <PrivacyCard
          variant="warning"
          title={copy.errors.photoUnreadableTitle}
          body={copy.errors.photoUnreadableBody}
        />
      ) : null}

      <View style={styles.features}>
        {copy.home.features.map((feature, index) => {
          const look = featureIcons[index];
          return (
            <Card
              key={feature.title}
              style={styles.featureCard}
              accessibilityRole="summary"
              accessibilityLabel={`${feature.title}. ${feature.description}`}
            >
              <IconBadge
                name={look.icon}
                color={look.color}
                backgroundColor={look.background}
                badgeSize={40}
                size={20}
              />
              <AppText variant="secondaryMedium">{feature.title}</AppText>
              <AppText variant="caption" color="textSecondary">
                {feature.description}
              </AppText>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  features: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureCard: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 132,
  },
});
