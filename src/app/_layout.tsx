import '@/global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { copy } from '@/copy/en';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { ExportGateProvider } from '@/features/purchase/ExportGateProvider';
import { PurchaseProvider } from '@/features/purchase/PurchaseProvider';
import { RecentHistoryProvider } from '@/features/recent/RecentHistoryProvider';
import { PhotoWorkflowProvider } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, typography } from '@/theme';

// Keep the native splash visible until we know whether onboarding was completed,
// so a first-time user never sees Home flash before onboarding.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <PurchaseProvider>
        <ExportGateProvider>
          <PhotoWorkflowProvider>
            <RecentHistoryProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </RecentHistoryProvider>
          </PhotoWorkflowProvider>
        </ExportGateProvider>
      </PurchaseProvider>
    </OnboardingProvider>
  );
}

/**
 * Onboarding runs once, before the app. The app itself is open to everyone:
 * Metora Pro is enforced only when exporting a clean copy (ExportGateProvider),
 * and the paywall is a dismissible modal.
 */
function RootNavigator() {
  const { isLoaded, completed } = useOnboarding();

  useEffect(() => {
    if (isLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <View style={styles.loading} accessibilityLabel="Loading">
        <ActivityIndicator color={colors.navy900} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.navy900,
        headerTitleStyle: { ...typography.cardHeading, color: colors.textPrimary },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!completed}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>

      <Stack.Protected guard={completed}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="photo/[id]" options={{ title: copy.metadata.title }} />
        <Stack.Screen name="photo/clean" options={{ title: copy.clean.title }} />
        <Stack.Screen
          name="photo/result"
          options={{ title: copy.result.title, headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack.Protected>

      {/* Must stay last: when a route is unavailable, Expo Router falls back to the
          first available screen in this list, which has to be onboarding or Home. */}
      <Stack.Screen name="+not-found" options={{ title: copy.brand }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
