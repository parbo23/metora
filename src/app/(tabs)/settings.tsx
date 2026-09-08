import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { MetadataRow } from '@/components/MetadataRow';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { links } from '@/config/links';
import { isQaPaywallBypassEnabled } from '@/config/qa';
import { copy } from '@/copy/en';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { usePurchases } from '@/features/purchase/PurchaseProvider';
import { spacing } from '@/theme';

/**
 * Settings — deliberately minimal: purchase status + restore, the privacy
 * explanation, and about (version, privacy policy, terms). No toggles.
 */
export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? undefined;
  const router = useRouter();
  const { isUnlocked, isRestoring, notice, restorePurchases } = usePurchases();
  const { reset: resetOnboarding } = useOnboarding();
  const restoreNotice = restoreFeedback(notice.kind);
  const [linkError, setLinkError] = useState(false);
  const qaBypass = isQaPaywallBypassEnabled();
  // Development and QA TestFlight builds only: lets testers open the paywall for
  // screenshots without changing entitlement state or the QA bypass.
  const showQaTools = __DEV__ || qaBypass;

  const openLink = async (url: string) => {
    setLinkError(false);
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      setLinkError(true);
    }
  };

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <AppText variant="hero" color="navy900">
          {copy.settings.title}
        </AppText>
      </View>

      {qaBypass ? (
        <PrivacyCard variant="warning" title={copy.settings.qaBuildTitle} body={copy.settings.qaBuildBody} />
      ) : null}

      <Section title={copy.settings.privacy}>
        <View style={styles.privacyWrap}>
          <PrivacyCard
            variant="success"
            icon="privacy"
            title={copy.settings.privacyTitle}
            body={copy.settings.privacyBody}
          />
        </View>
      </Section>

      <Section title={copy.settings.purchase}>
        <MetadataRow
          icon={isUnlocked ? 'checkCircle' : 'shield'}
          title={
            qaBypass ? copy.settings.qaPro : isUnlocked ? copy.settings.proActive : copy.settings.proInactive
          }
          value={!isUnlocked && !qaBypass ? copy.settings.proInactiveHint : undefined}
        />
        {!isUnlocked ? (
          <MetadataRow
            icon="lock"
            title={copy.settings.unlockPro}
            showChevron
            divider
            onPress={() => router.push('/paywall')}
          />
        ) : null}
        <MetadataRow
          icon="restore"
          title={copy.settings.restorePurchase}
          value={isRestoring ? copy.settings.restoring : undefined}
          showChevron={!isRestoring}
          divider
          onPress={isRestoring ? undefined : () => void restorePurchases()}
        />
        {restoreNotice ? (
          <View style={styles.privacyWrap}>
            <PrivacyCard
              variant={restoreNotice.variant}
              icon="restore"
              title={restoreNotice.title}
              body={restoreNotice.body}
            />
          </View>
        ) : null}
      </Section>

      <Section title={copy.settings.about}>
        <MetadataRow
          icon="version"
          title={copy.settings.version}
          value={build ? `${version} (${build})` : version}
        />
        <MetadataRow
          icon="document"
          title={copy.settings.privacyPolicy}
          showChevron
          divider
          onPress={() => void openLink(links.privacyPolicy)}
        />
        <MetadataRow
          icon="document"
          title={copy.settings.terms}
          showChevron
          divider
          onPress={() => void openLink(links.terms)}
        />
        {showQaTools ? (
          <MetadataRow
            icon="shield"
            title={copy.settings.previewPaywall}
            showChevron
            divider
            onPress={() => router.push({ pathname: '/paywall', params: { preview: '1' } })}
          />
        ) : null}
        {__DEV__ ? (
          <MetadataRow
            icon="restore"
            title={copy.settings.resetOnboarding}
            showChevron
            divider
            onPress={() => void resetOnboarding()}
          />
        ) : null}
        {linkError ? (
          <View style={styles.privacyWrap}>
            <PrivacyCard
              variant="warning"
              title={copy.settings.linkUnavailableTitle}
              body={copy.settings.linkUnavailableBody}
            />
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

function restoreFeedback(kind: ReturnType<typeof usePurchases>['notice']['kind']) {
  switch (kind) {
    case 'restored':
      return {
        variant: 'success' as const,
        title: copy.paywall.restoredTitle,
        body: copy.paywall.restoredBody,
      };
    case 'nothingToRestore':
      return {
        variant: 'neutral' as const,
        title: copy.paywall.nothingToRestoreTitle,
        body: copy.paywall.nothingToRestoreBody,
      };
    case 'restoreFailed':
      return {
        variant: 'warning' as const,
        title: copy.paywall.restoreFailedTitle,
        body: copy.paywall.restoreFailedBody,
      };
    default:
      return null;
  }
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
