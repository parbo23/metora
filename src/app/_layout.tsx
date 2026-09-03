import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { copy } from '@/copy/en';
import { colors, typography } from '@/theme';

/**
 * Root navigator. The tab group hides the stack header and draws its own
 * large titles; the single-photo flow uses native headers with a back chevron.
 * The paywall gate is added in Phase 2.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.navy900,
          headerTitleStyle: { ...typography.cardHeading, color: colors.textPrimary },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="photo/[id]" options={{ title: copy.metadata.title }} />
        <Stack.Screen name="photo/clean" options={{ title: copy.clean.title }} />
        <Stack.Screen
          name="photo/result"
          options={{ title: copy.result.title, headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
