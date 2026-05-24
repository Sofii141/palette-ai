import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/tokens';

interface Props {
  text: string;
  side?: 'left' | 'right';
}

/**
 * Big faded vertical-ish watermark text used as decorative element.
 */
export function WatermarkText({ text, side = 'left' }: Props) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, side === 'left' ? styles.left : styles.right]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          { color: colors.text, fontFamily: fonts.displayItalic, opacity: 0.07 },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '40%',
  },
  left: { left: -24 },
  right: { right: -24 },
  text: {
    fontSize: 180,
    letterSpacing: 12,
  },
});
