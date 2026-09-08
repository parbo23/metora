import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { IconBadge } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { RecentList } from '@/features/recent/RecentList';
import { useRecentHistory } from '@/features/recent/RecentHistoryProvider';
import { colors, spacing } from '@/theme';

/**
 * Recent — a local activity log, not a photo archive. Newest first. Clear
 * History asks for confirmation inline, then deletes the log immediately.
 */
export default function RecentScreen() {
  const { records, isLoaded, clearHistory } = useRecentHistory();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  const onClear = async () => {
    setConfirming(false);
    await clearHistory();
    setCleared(true);
  };

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <AppText variant="hero" color="navy900">
          {copy.recent.title}
        </AppText>
        {records.length > 0 && !confirming ? (
          <PrimaryButton
            variant="text"
            title={copy.recent.clearHistory}
            onPress={() => {
              setCleared(false);
              setConfirming(true);
            }}
          />
        ) : null}
      </View>

      <PrivacyCard
        variant="neutral"
        icon="privacy"
        title={copy.recent.privacyTitle}
        body={copy.recent.privacyBody}
      />

      {confirming ? (
        <Card style={styles.confirm} accessibilityRole="alert">
          <AppText variant="cardHeading">{copy.recent.confirmTitle}</AppText>
          <AppText variant="secondary" color="textSecondary">
            {copy.recent.confirmBody}
          </AppText>
          <View style={styles.confirmActions}>
            <View style={styles.confirmButton}>
              <PrimaryButton
                title={copy.recent.cancel}
                variant="secondary"
                onPress={() => setConfirming(false)}
              />
            </View>
            <View style={styles.confirmButton}>
              <PrimaryButton title={copy.recent.confirmClear} onPress={() => void onClear()} />
            </View>
          </View>
        </Card>
      ) : null}

      {cleared && records.length === 0 ? (
        <PrivacyCard variant="success" icon="checkCircle" title={copy.recent.cleared} />
      ) : null}

      {isLoaded && records.length === 0 ? (
        <Card style={styles.empty} accessibilityRole="summary">
          <IconBadge name="recent" badgeSize={48} size={22} />
          <AppText variant="cardHeading" align="center">
            {copy.recent.emptyTitle}
          </AppText>
          <AppText variant="secondary" color="textSecondary" align="center">
            {copy.recent.emptyBody}
          </AppText>
        </Card>
      ) : null}

      {records.length > 0 ? <RecentList records={records} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  confirm: {
    gap: spacing.sm,
    borderColor: colors.warningBackground,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  confirmButton: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
});
