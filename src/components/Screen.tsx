import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, screenPadding, spacing } from '@/theme';

/** Height reserved for the tab bar so scroll content never hides behind it. */
export const TAB_BAR_INSET = Platform.select({ ios: 50, android: 80, web: 72, default: 0 });

interface ScreenProps {
  children: ReactNode;
  /** Adds top safe-area padding. Turn off when a native header is shown. */
  safeTop?: boolean;
  /** Reserve space for the bottom tab bar. */
  withTabBar?: boolean;
  /** Pinned content rendered below the scroll view, e.g. a primary button. */
  footer?: ReactNode;
  contentStyle?: ViewStyle;
}

/**
 * Standard screen scaffold: background color, safe areas, horizontal padding
 * and an optional pinned footer for the main call to action.
 */
export function Screen({ children, safeTop = true, withTabBar = false, footer, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = (withTabBar ? TAB_BAR_INSET : 0) + spacing.xxl;

  return (
    <SafeAreaView edges={safeTop ? ['top', 'left', 'right'] : ['left', 'right']} style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }, contentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + (withTabBar ? TAB_BAR_INSET : 0) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
});
