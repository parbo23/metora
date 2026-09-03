import { Platform, type ViewStyle } from 'react-native';

/**
 * Subtle elevation used only on larger cards. List rows get no shadow.
 * On web the boxShadow form is required; native uses shadow* / elevation.
 */
function makeShadow(opacity: number, blur: number, offsetY: number, elevation: number): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${offsetY}px ${blur}px rgba(7, 27, 60, ${opacity})` } as ViewStyle;
  }
  return {
    shadowColor: '#071B3C',
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    shadowOffset: { width: 0, height: offsetY },
    elevation,
  };
}

export const shadows = {
  card: makeShadow(0.06, 16, 4, 2),
  raised: makeShadow(0.1, 24, 8, 4),
} as const;
