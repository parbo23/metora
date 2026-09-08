import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { copy } from '@/copy/en';
import { colors, icons } from '@/theme';

/** Native bottom tabs (iOS / Android). The web preview uses _layout.web.tsx. */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={colors.navy900}
      backgroundColor={colors.card}
      iconColor={{ default: colors.textSecondary, selected: colors.navy900 }}
      labelStyle={{ color: colors.textSecondary, selected: { color: colors.navy900 } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{copy.tabs.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={icons.home.ios} md={icons.home.material} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="batch">
        <NativeTabs.Trigger.Label>{copy.tabs.batch}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={icons.batch.ios} md={icons.batch.material} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="recent">
        <NativeTabs.Trigger.Label>{copy.tabs.recent}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={icons.recent.ios} md={icons.recent.material} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{copy.tabs.settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={icons.settings.ios} md={icons.settings.material} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
