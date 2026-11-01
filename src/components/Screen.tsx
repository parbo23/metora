import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, screenPadding, spacing } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Adds top safe-area padding. Turn off when a native header is shown. */
  safeTop?: boolean;
  /** Pinned content rendered below the scroll view, e.g. a primary button. */
  footer?: ReactNode;
  contentStyle?: ViewStyle;
}

/**
 * Standard screen scaffold: background color, safe areas, horizontal padding
 * and an optional pinned footer for the main call to action.
 */
export function Screen({ children, safeTop = true, footer, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={safeTop ? ['top', 'left', 'right'] : ['left', 'right']} style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{footer}</View>
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
});
