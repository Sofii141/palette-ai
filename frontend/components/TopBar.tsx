import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { Logo } from './Logo';
import { fonts, fontSize, spacing } from '@/theme/tokens';

interface Props {
  left?: string;
  right?: string;
  showBack?: boolean;
  onLeftPress?: () => void;
  onRightPress?: () => void;
}

export function TopBar({ left = 'HOME', right = 'ART', showBack, onLeftPress, onRightPress }: Props) {
  const { colors, mode, toggleMode } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
      ) : (
        <Pressable onPress={onLeftPress} hitSlop={12}>
          <Text style={[styles.link, { color: colors.text, fontFamily: fonts.bodyMedium }]}>{left}</Text>
        </Pressable>
      )}

      <Logo size={42} showTagline={false} />

      <View style={styles.rightGroup}>
        <Pressable onPress={toggleMode} hitSlop={12}>
          <Feather name={mode === 'light' ? 'moon' : 'sun'} size={18} color={colors.text} />
        </Pressable>
        <Pressable onPress={onRightPress} hitSlop={12}>
          <Text style={[styles.link, { color: colors.text, fontFamily: fonts.bodyMedium }]}>{right}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  link: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
});
