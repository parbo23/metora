import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { MetadataRow } from '@/components/MetadataRow';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { spacing } from '@/theme';

/**
 * Settings — minimal. Phase 1 is static; purchase state (Phase 2) and links
 * (Phase 8) are wired later.
 */
export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <AppText variant="hero" color="navy900">
          {copy.settings.title}
        </AppText>
      </View>

      <Section title={copy.settings.purchase}>
        <MetadataRow icon="checkCircle" title={copy.settings.lifetimeActive} />
        <MetadataRow icon="restore" title={copy.settings.restorePurchase} showChevron divider onPress={() => {}} />
      </Section>

      <Section title={copy.settings.cleaning}>
        <MetadataRow
          icon="shield"
          title={copy.settings.defaultCleanMode}
          value={copy.settings.defaultCleanModeValue}
        />
        <MetadataRow icon="lock" title={copy.settings.keepOriginal} value={copy.settings.keepOriginalValue} divider />
      </Section>

      <Section title={copy.settings.privacy}>
        <View style={styles.privacyWrap}>
          <PrivacyCard variant="success" icon="privacy" title={copy.settings.privacyTitle} body={copy.settings.privacyBody} />
        </View>
      </Section>

      <Section title={copy.settings.about}>
        <MetadataRow icon="version" title={copy.settings.version} value={version} />
        <MetadataRow icon="document" title={copy.settings.privacyPolicy} showChevron divider onPress={() => {}} />
        <MetadataRow icon="document" title={copy.settings.terms} showChevron divider onPress={() => {}} />
        <MetadataRow icon="mail" title={copy.settings.contactSupport} showChevron divider onPress={() => {}} />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="captionMedium" color="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      <Card padded={false} style={styles.sectionCard}>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.xs,
    letterSpacing: 0.6,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  privacyWrap: {
    padding: spacing.sm,
  },
});
