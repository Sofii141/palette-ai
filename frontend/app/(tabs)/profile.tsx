import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/services/auth';
import { PillButton } from '@/components/PillButton';
import { fonts, fontSize, spacing, radius } from '@/theme/tokens';

export default function Profile() {
  const { colors, toggleMode } = useTheme();
  const { user, logout, refreshUser } = useAuth();

  useFocusEffect(useCallback(() => { refreshUser(); }, [refreshUser]));

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.wrap}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.surfaceTint, borderColor: colors.borderStrong },
          ]}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: 42, color: colors.accent }}>
            {(user.displayName || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.name, { color: colors.text, fontFamily: fonts.display }]}>
          {user.displayName}
        </Text>
        <Text style={[styles.since, { color: colors.textMuted, fontFamily: fonts.serifItalic }]}>
          Member since {user.memberSince}
        </Text>

        <View style={[styles.statsRow, { borderColor: colors.borderStrong }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts.display }]}>
              {user.favoritesCount ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: fonts.bodyMedium }]}>
              FAVORITES
            </Text>
          </View>
          <View style={[styles.stat, styles.statMiddle, { borderColor: colors.borderStrong }]}>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts.displayItalic }]}>
              15
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: fonts.bodyMedium }]}>
              MOVEMENTS
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts.displayItalic }]}>
              ~5k
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: fonts.bodyMedium }]}>
              PAINTINGS
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={toggleMode}
            style={({ pressed }) => [
              styles.ghostBtn,
              { borderColor: colors.borderStrong, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.ghostText, { color: colors.text, fontFamily: fonts.bodyMedium }]}>
              TOGGLE LIGHT / DARK
            </Text>
          </Pressable>

          <PillButton
            label="Sign Out"
            icon="log-out"
            style={{ alignSelf: 'stretch', alignItems: 'center' }}
            onPress={logout}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 28, letterSpacing: 2, marginTop: spacing.lg },
  since: { fontSize: fontSize.md, marginTop: spacing.xs },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  stat: { flex: 1, alignItems: 'center' },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1 },
  statValue: { fontSize: 28 },
  statLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    marginTop: spacing.xs,
  },
  actions: {
    width: '100%',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  ghostBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  ghostText: { fontSize: 11, letterSpacing: 2.5 },
});
