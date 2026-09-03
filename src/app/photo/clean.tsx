import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CleanOptionCard } from '@/components/CleanOptionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PrivacyCard } from '@/components/PrivacyCard';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy/en';
import { defaultCleanMode, mockPhoto } from '@/features/metadata/mock';
import { spacing, type IconName } from '@/theme';
import type { CleanMode } from '@/types/metadata';

const options: { mode: CleanMode; icon: IconName; title: string; description: string }[] = [
  { mode: 'location', icon: 'location', ...copy.clean.options.location },
  { mode: 'camera', icon: 'camera', ...copy.clean.options.camera },
  { mode: 'dateTime', icon: 'calendar', ...copy.clean.options.dateTime },
  { mode: 'all', icon: 'shield', ...copy.clean.options.all },
];

/**
 * Clean Up — phone 3 on the design board. Selection is local UI state;
 * the cleaning pipeline is implemented in Phase 5.
 */
export default function CleanScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<CleanMode>(defaultCleanMode);

  return (
    <Screen
      safeTop={false}
      footer={
        <PrimaryButton
          title={copy.clean.createCleanCopy}
          onPress={() => router.push({ pathname: '/photo/result', params: { id: mockPhoto.id, mode } })}
        />
      }>
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option) => (
          <CleanOptionCard
            key={option.mode}
            icon={option.icon}
            heading={option.title}
            description={option.description}
            selected={mode === option.mode}
            onPress={() => setMode(option.mode)}
            badge={option.mode === 'all' ? copy.clean.recommended : undefined}
          />
        ))}
      </View>

      <PrivacyCard variant="success" title={copy.clean.trustTitle} body={copy.clean.trustBody} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
  },
});
