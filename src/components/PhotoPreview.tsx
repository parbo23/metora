import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';
import { useReduceMotion } from '@/utils/useReduceMotion';

interface PhotoPreviewProps {
  source: ImageSourcePropType | ImageSource;
  /** Width / height. Defaults to the board's 4:3 preview. */
  aspectRatio?: number;
  /** Corner radius; smaller values suit thumbnails. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Rounded photo preview that fills its frame with a center crop and never
 * distorts the image.
 */
export function PhotoPreview({
  source,
  aspectRatio = 4 / 3,
  borderRadius = radius.card,
  style,
  accessibilityLabel = 'Selected photo',
}: PhotoPreviewProps) {
  const reduceMotion = useReduceMotion();
  return (
    <View style={[styles.frame, { aspectRatio, borderRadius }, style]}>
      <Image
        source={source as ImageSource}
        contentFit="cover"
        transition={reduceMotion ? 0 : 150}
        style={styles.image}
        accessible
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.navySoft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
