import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo app config. Replaces app.json so the EAS project id can come from the
 * environment instead of being committed.
 *
 * "Shot On" is the display name; the slug, scheme and bundle identifier keep
 * their original Metora values on purpose: the bundle id is the App Store
 * listing and the slug is the EAS project.
 *
 * Build numbers are managed by EAS (appVersionSource: remote in eas.json).
 * The (currently disabled) paywall expects these RevenueCat / App Store
 * Connect identifiers: product `metora_lifetime`, entitlement `metora_pro`,
 * offering `default`.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Shot On',
  slug: 'metora',
  version: '2.0.0',
  orientation: 'portrait',
  // App Store icon: 1024x1024 RGB, square corners, no alpha (assets/icon.png).
  icon: './assets/icon.png',
  scheme: 'metora',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.metora.app',
    // iPhone only: builds with TARGETED_DEVICE_FAMILY = "1". The layouts are
    // designed for one-handed phone use, so iPad is out of scope for now.
    supportsTablet: false,
    icon: './assets/icon.png',
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
        // Add-only: Shot On writes new photos and never reads the library
        // (the picker runs out of process and hands over only the chosen photo).
        savePhotosPermission: 'Shot On saves your framed photos to your library.',
        photosPermission: 'Shot On needs access to your photos so you can add a camera-info frame.',
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
