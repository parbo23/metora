import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo app config. Replaces app.json so the EAS project id can come from the
 * environment instead of being committed.
 *
 * Build numbers are managed by EAS (appVersionSource: remote in eas.json).
 * Bundle identifier and RevenueCat / App Store Connect product must match:
 *   product id     metora_lifetime
 *   entitlement    metora_pro
 *   offering       default
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Metora',
  slug: 'metora',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'metora',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.metora.app',
    supportsTablet: false,
    icon: './assets/images/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.metora.app',
    adaptiveIcon: {
      backgroundColor: '#071B3C',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-media-library',
      {
        // Add-only: Metora writes new photos and never reads the library.
        savePhotosPermission:
          'Metora adds the clean copy to your photo library as a new photo. Your original photo is never changed.',
        photosPermission:
          'Metora only adds clean copies to your photo library. It does not browse or read your photos.',
        isAccessMediaLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        // The iOS picker runs out of process, so this prompt is rarely shown,
        // but the purpose string must exist and stay honest.
        // The system picker runs out of process; the library purpose string is
        // owned by expo-media-library above (add-only save).
        photosPermission: false,
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F9FC',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  owner: 'parbo23',
  extra: {
    eas: {
      // Created by `eas build:configure` for @parbo23/metora. Not a secret.
      projectId: 'f14b0715-8226-4d21-8b28-b4a9f1b49705',
    },
  },
});
