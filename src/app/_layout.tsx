import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PAYWALL_ENABLED } from '@/config/paywall';
import { copy } from '@/copy/en';
import { ExportGateProvider } from '@/features/purchase/ExportGateProvider';
import { PurchaseProvider } from '@/features/purchase/PurchaseProvider';
import { PhotoWorkflowProvider } from '@/features/workflow/PhotoWorkflowProvider';
import { colors, typography } from '@/theme';

/**
 * One stack: Home (pick a photo) → Preview (framed photo, save / share), with
 * a plain Settings screen. The paywall modal only exists when the paywall is
 * enabled in config/paywall.ts.
 */
export default function RootLayout() {
  return (
    <PurchaseProvider>
      <ExportGateProvider>
        <PhotoWorkflowProvider>
          <StatusBar style="dark" />
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
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="photo/preview" options={{ title: copy.preview.title }} />
            <Stack.Screen name="settings" options={{ title: copy.settings.title }} />
            <Stack.Protected guard={PAYWALL_ENABLED}>
              <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
            </Stack.Protected>
            <Stack.Screen name="+not-found" options={{ title: copy.brand }} />
          </Stack>
        </PhotoWorkflowProvider>
      </ExportGateProvider>
    </PurchaseProvider>
  );
}
