import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Logo } from '@/components/Logo';
import { ArchFrame } from '@/components/ArchFrame';
import { PillButton } from '@/components/PillButton';
import { fonts, fontSize, spacing } from '@/theme/tokens';
import { fetchFeatured, Artwork } from '@/services/artApi';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_W = Math.min(SCREEN_W * 0.6, 260);
const HERO_H = HERO_W * 1.35;

export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const [art, setArt] = useState<Artwork | null>(null);

  useEffect(() => {
    fetchFeatured().then(setArt).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="map-pin" size={14} color={colors.text} />
            <Text style={[styles.topRowText, { color: colors.text, fontFamily: fonts.bodyMedium }]}>
              Art Piece Museum
            </Text>
          </View>
        </View>

        <View style={styles.heroWrap}>
          <Logo size={64} showTagline />

          <Pressable
            onPress={() => art && router.push(`/artwork/${art.id}`)}
            style={{ marginTop: spacing.xl }}
          >
            <ArchFrame
              source={art?.image ?? null}
              width={HERO_W}
              height={HERO_H}
              blurhash={art?.lqip ?? undefined}
            />
          </Pressable>

          <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
            <Text style={[styles.brand, { color: colors.text, fontFamily: fonts.display }]}>
              PALETTE
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts.serifItalic }]}
            >
              Virtual museum for world art{'\n'}and the stories behind it
            </Text>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <PillButton label="Visit Gallery" icon="arrow-right" onPress={() => router.push('/gallery')} />
          </View>

          {art && (
            <View style={styles.captionWrap}>
              <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
              <Text style={[styles.captionEyebrow, { color: colors.textMuted, fontFamily: fonts.body }]}>
                FEATURED · {art.date || ''}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.captionTitle, { color: colors.text, fontFamily: fonts.serifBold }]}
              >
                {art.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.captionArtist, { color: colors.textSecondary, fontFamily: fonts.serifItalic }]}
              >
                {art.artist}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topRowText: {
    fontSize: fontSize.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroWrap: { alignItems: 'center', paddingTop: spacing.lg },
  brand: { fontSize: 48, letterSpacing: 4, textAlign: 'center' },
  subtitle: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: fontSize.lg * 1.3,
  },
  captionWrap: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  divider: { width: 40, height: 1, marginBottom: spacing.lg },
  captionEyebrow: { fontSize: fontSize.xs, letterSpacing: 3, marginBottom: spacing.sm },
  captionTitle: { fontSize: fontSize.xl, textAlign: 'center' },
  captionArtist: { fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.xs },
});
