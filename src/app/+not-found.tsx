import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';

/** Shown for unknown routes (e.g. a stale deep link). */
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <PrivacyCard variant="neutral" title={copy.notFound.title} body={copy.notFound.body} />
      <PrimaryButton title={copy.tabs.home} onPress={() => router.replace('/')} />
    </Screen>
  );
}
