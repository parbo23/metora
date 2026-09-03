import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, icons, radius, type IconName } from '@/theme';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** SF Symbol on iOS, Material Symbol elsewhere, sized and tinted from tokens. */
export function Icon({ name, size = 20, color = colors.textPrimary, style }: IconProps) {
  const def = icons[name];
  return (
    <SymbolView
      name={{ ios: def.ios, android: def.material, web: def.material }}
      size={size}
      tintColor={color}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

interface IconBadgeProps extends IconProps {
  /** Diameter of the circular background. */
  badgeSize?: number;
  backgroundColor?: string;
}

/** Icon inside a soft circular badge, as used in metadata and option rows. */
export function IconBadge({
  badgeSize = 36,
  backgroundColor = colors.navySoft,
  size = 18,
  color = colors.navy800,
  style,
  ...rest
}: IconBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { width: badgeSize, height: badgeSize, borderRadius: radius.pill, backgroundColor },
        style,
      ]}>
      <Icon {...rest} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
