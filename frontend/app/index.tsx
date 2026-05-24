import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fonts, fontSize, spacing } from '@/theme/tokens';
import { ArchFrame } from '@/components/ArchFrame';
import { PillButton } from '@/components/PillButton';
import { WatermarkText } from '@/components/WatermarkText';
import { Logo } from '@/components/Logo';
import { fetchArtworks, imageUrl, Artwork } from '@/services/artApi';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_W = Math.min(SCREEN_W * 0.7, 300);
const HERO_H = HERO_W * 1.35;

export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const [featured, setFeatured] = useState<Artwork | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchArtworks({ limit: 12 });
        // Pick a portrait-like or interesting featured piece
        const pick = res.data.find((a) => a.image_id) ?? null;
        setFeatured(pick);
      } catch (e) {
        console.warn('hero load failed', e);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {/* Top brand row */}
        <View style={styles.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="map-pin" size={14} color={colors.text} />
            <Text style={[styles.topRowText, { color: colors.text, fontFamily: fonts.bodyMedium }]}>
              Art Piece Museum
            </Text>
          </View>
          <Feather name="menu" size={20} color={colors.text} />
        </View>

        {/* Hero area */}
        <View style={styles.heroWrap}>
          <WatermarkText text="PALETTE" side="left" />
          <Logo size={70} showTagline={true} />

          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <ArchFrame
              source={imageUrl(featured?.image_id ?? null, 800)}
              width={HERO_W}
              height={HERO_H}
              blurhash={featured?.thumbnail?.lqip ?? undefined}
            />
          </View>

          <View style={{ marginTop: spacing.xxl, alignItems: 'center', paddingHorizontal: spacing.xl }}>
            <Text style={[styles.brandHero, { color: colors.text, fontFamily: fonts.display }]}>
              PALETTE
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontFamily: fonts.serifItalic },
              ]}
            >
              Virtual museum for world art{`\n`}and the stories behind it
            </Text>
          </View>

          <View style={{ alignSelf: 'center', marginTop: spacing.xl }}>
            <PillButton label="Visit Gallery" icon="arrow-right" onPress={() => router.push('/gallery')} />
          </View>
        </View>

        {/* Featured caption */}
        {featured && (
          <View style={styles.captionWrap}>
            <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
            <Text style={[styles.captionEyebrow, { color: colors.textMuted, fontFamily: fonts.body }]}>
              FEATURED · {featured.date_display ?? '—'}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.captionTitle, { color: colors.text, fontFamily: fonts.serifBold }]}
            >
              {featured.title}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.captionArtist, { color: colors.textSecondary, fontFamily: fonts.serifItalic }]}
            >
              {featured.artist_title ?? featured.artist_display}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topRowText: {
    fontSize: fontSize.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroWrap: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    position: 'relative',
  },
  brandHero: {
    fontSize: fontSize.giant,
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: fontSize.lg * 1.3,
  },
  captionWrap: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxxl,
    alignItems: 'center',
  },
  divider: {
    width: 40,
    height: 1,
    marginBottom: spacing.lg,
  },
  captionEyebrow: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  captionTitle: {
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  captionArtist: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
