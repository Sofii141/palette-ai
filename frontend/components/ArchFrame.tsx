import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  source: string | null;
  width: number;
  height: number;
  style?: ViewStyle;
  /** "arch" = rounded top + bottom (oval-ish), "topArch" = rounded top only */
  variant?: 'arch' | 'topArch';
  blurhash?: string;
}

/**
 * Image inside an elegant arched frame — the signature shape of the app.
 * The radius is computed from width so it always looks like an oval-top.
 */
export function ArchFrame({ source, width, height, style, variant = 'arch', blurhash }: Props) {
  const { colors } = useTheme();
  const radiusTop = width / 2;
  const radiusBottom = variant === 'arch' ? width / 2 : 12;

  return (
    <View
      style={[
        styles.shadow,
        {
          width,
          height,
          borderTopLeftRadius: radiusTop,
          borderTopRightRadius: radiusTop,
          borderBottomLeftRadius: radiusBottom,
          borderBottomRightRadius: radiusBottom,
          shadowColor: colors.shadow,
          backgroundColor: colors.surfaceTint,
        },
        style,
      ]}
    >
      <View
        style={{
          width,
          height,
          borderTopLeftRadius: radiusTop,
          borderTopRightRadius: radiusTop,
          borderBottomLeftRadius: radiusBottom,
          borderBottomRightRadius: radiusBottom,
          overflow: 'hidden',
          backgroundColor: colors.surfaceTint,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {source ? (
          <Image
            source={{ uri: source }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={400}
            placeholder={blurhash ? { blurhash } : undefined}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.surfaceTint }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
});
