import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { fonts, fontSize } from '@/theme/tokens';

interface Props {
  size?: number;
  showTagline?: boolean;
}

/**
 * Circular "stamp" style logo, like vintage museum seal.
 */
export function Logo({ size = 64, showTagline = true }: Props) {
  const { colors } = useTheme();
  const stroke = colors.text;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={30} stroke={stroke} strokeWidth={1.2} fill="none" />
          <Circle cx={32} cy={32} r={26} stroke={stroke} strokeWidth={0.6} fill="none" />
          {/* Simple palette mark */}
          <Path
            d="M32 18 C24 18, 18 24, 18 32 C18 36, 21 38, 24 38 C26 38, 27 39, 27 41 C27 44, 30 46, 32 46 C40 46, 46 40, 46 32 C46 24, 40 18, 32 18 Z"
            fill="none"
            stroke={stroke}
            strokeWidth={1.2}
          />
          <Circle cx={26} cy={28} r={1.4} fill={stroke} />
          <Circle cx={32} cy={25} r={1.4} fill={stroke} />
          <Circle cx={38} cy={28} r={1.4} fill={stroke} />
          <Circle cx={40} cy={34} r={1.4} fill={stroke} />
        </Svg>
      </View>
      <Text style={[styles.brand, { color: colors.text, fontFamily: fonts.display }]}>PALETTE</Text>
      {showTagline && (
        <Text style={[styles.tagline, { color: colors.textMuted, fontFamily: fonts.body }]}>
          Art · Stories · Museum
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  brand: {
    fontSize: fontSize.md,
    letterSpacing: 6,
    marginTop: 2,
  },
  tagline: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
