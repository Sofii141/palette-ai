import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fonts, fontSize, radius, spacing } from '@/theme/tokens';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
}

export function PillButton({ label, onPress, variant = 'primary', icon, style }: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';

  const bg = isPrimary ? colors.accent : 'transparent';
  const fg = isPrimary ? colors.textInverse : colors.text;
  const border = isPrimary ? colors.accent : colors.borderStrong;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text style={[styles.label, { color: fg, fontFamily: fonts.bodyMedium }]}>{label}</Text>
        {icon && <Feather name={icon} size={14} color={fg} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
});
