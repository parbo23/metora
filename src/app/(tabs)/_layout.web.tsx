import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { copy } from '@/copy/en';
import { colors, spacing, type IconName } from '@/theme';

/**
 * Web-only tab bar used for Windows previews. It mimics the iOS bottom bar
 * from the board; on device the native tabs in _layout.tsx are used instead.
 */
export default function TabsLayoutWeb() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={styles.bar}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="home" label={copy.tabs.home} />
          </TabTrigger>
          <TabTrigger name="batch" href="/batch" asChild>
            <TabButton icon="batch" label={copy.tabs.batch} />
          </TabTrigger>
          <TabTrigger name="recent" href="/recent" asChild>
            <TabButton icon="recent" label={copy.tabs.recent} />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon="settings" label={copy.tabs.settings} />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  icon: IconName;
  label: string;
}

function TabButton({ icon, label, isFocused, ...props }: TabButtonProps) {
  const tint = isFocused ? colors.navy900 : colors.textSecondary;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={styles.tab}
    >
      <Icon name={icon} size={22} color={tint} />
      <AppText variant="caption" style={{ color: tint }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 72,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
