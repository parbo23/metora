import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { copy } from '@/copy/en';
import { OnboardingVisual } from '@/features/onboarding/OnboardingVisuals';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { colors, radius, screenPadding, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

const PAGE_COUNT = 4;

/**
 * First-launch onboarding: four short pages (problem, solution, result, trust)
 * with page indicators, Skip on the first three and a final "Get Started".
 * Completing or skipping stores the flag and enters the normal app.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { complete } = useOnboarding();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    haptics.success();
    await complete();
    router.replace('/');
  };

  const next = () => {
    if (page >= PAGE_COUNT - 1) {
      void finish();
      return;
    }
    haptics.selection();
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== page) setPage(Math.max(0, Math.min(PAGE_COUNT - 1, index)));
  };

  const isLast = page === PAGE_COUNT - 1;
  const pages = copy.onboarding.pages;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        {!isLast ? (
          <Pressable
            onPress={() => void finish()}
            accessibilityRole="button"
            accessibilityLabel={copy.onboarding.skip}
            hitSlop={12}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <AppText variant="secondaryMedium" color="textSecondary">
              {copy.onboarding.skip}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
        contentContainerStyle={{ width: width * PAGE_COUNT }}
      >
        {pages.map((content, index) => (
          <View key={content.title} style={[styles.page, { width }]}>
            <View style={styles.visual}>
              <OnboardingVisual page={index as 0 | 1 | 2 | 3} />
            </View>
            <View style={styles.copy}>
              <AppText variant="screenTitle" align="center">
                {content.title}
              </AppText>
              {index === PAGE_COUNT - 1 ? (
                <View style={styles.points} accessibilityRole="list">
                  {copy.onboarding.trustPoints.map((point) => (
                    <View
                      key={point}
                      style={styles.point}
                      accessibilityRole="text"
                      accessibilityLabel={point}
                    >
                      <Icon name="checkCircle" size={18} color={colors.teal500} />
                      <AppText variant="body">{point}</AppText>
                    </View>
                  ))}
                </View>
              ) : (
                <AppText variant="body" color="textSecondary" align="center">
                  {content.body}
                </AppText>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityLabel={copy.onboarding.pageOf(page + 1, PAGE_COUNT)}
        >
          {pages.map((content, index) => (
            <View key={content.title} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton
          title={isLast ? copy.onboarding.getStarted : copy.onboarding.continue}
          onPress={next}
          loading={finishing}
          disabled={finishing}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
  },
  skip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: screenPadding,
    justifyContent: 'center',
    gap: spacing.xxxl,
  },
  visual: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  points: {
    gap: spacing.md,
    alignSelf: 'center',
    paddingTop: spacing.sm,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.navy900,
  },
});
