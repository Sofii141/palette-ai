import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { ArchFrame } from '@/components/ArchFrame';
import { PillButton } from '@/components/PillButton';
import { fonts, fontSize, spacing } from '@/theme/tokens';
import { fetchArtwork, imageUrl, Artwork, stripHtml } from '@/services/artApi';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_W = SCREEN_W - spacing.xxl * 2;
const HERO_H = HERO_W * 1.3;

export default function ArtworkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [art, setArt] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const a = await fetchArtwork(id!);
        setArt(a);
      } catch (e) {
        console.warn('artwork load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!art) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.serifItalic }}>
            Could not load this artwork.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const period =
    art.date_start != null
      ? `${Math.floor(art.date_start / 100) + 1}${ordinal(Math.floor(art.date_start / 100) + 1)}`
      : null;

  const description = stripHtml(art.description ?? art.short_description ?? '') ||
    `${art.title} by ${art.artist_display}. ${art.medium_display ?? ''}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.huge }}>
        {/* Top bar */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            {period && (
              <Text style={[styles.period, { color: colors.text, fontFamily: fonts.bodyMedium }]}>
                {period}
              </Text>
            )}
            <Text
              numberOfLines={1}
              style={[styles.headerTitle, { color: colors.text, fontFamily: fonts.serifBold }]}
            >
              {trim(art.title, 24)}
            </Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(`https://www.artic.edu/artworks/${art.id}`)}
            hitSlop={12}
          >
            <Feather name="external-link" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Hero image */}
        <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <ArchFrame
            source={imageUrl(art.image_id, 1000)}
            width={HERO_W}
            height={HERO_H}
            blurhash={art.thumbnail?.lqip ?? undefined}
          />
        </View>

        {/* Metadata grid */}
        <View style={styles.metaWrap}>
          <MetaRow colors={colors} label="When" value={art.date_display ?? '—'} />
          <MetaRow colors={colors} label="Artist" value={art.artist_title ?? art.artist_display ?? '—'} />
          <MetaRow colors={colors} label="Place" value={art.place_of_origin ?? '—'} />
          <MetaRow colors={colors} label="Medium" value={art.medium_display ?? '—'} />
          <MetaRow colors={colors} label="Period" value={art.style_title ?? art.classification_title ?? '—'} />
          <MetaRow
            colors={colors}
            label="Status"
            value={art.is_on_view ? `On view · ${art.gallery_title ?? 'AIC'}` : 'In archive'}
          />
        </View>

        {/* Description */}
        <View style={styles.descWrap}>
          <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
          <Text style={[styles.eyebrow, { color: colors.textMuted, fontFamily: fonts.body }]}>
            THE STORY
          </Text>
          <Text
            style={[styles.description, { color: colors.textSecondary, fontFamily: fonts.serif }]}
            numberOfLines={expanded ? undefined : 8}
          >
            {description}
          </Text>
          {description.length > 320 && (
            <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
              <Text style={[styles.readMore, { color: colors.text, fontFamily: fonts.bodySemi }]}>
                {expanded ? 'READ LESS' : 'READ MORE'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: spacing.xxl, marginTop: spacing.xl }}>
          <PillButton
            label="View at the Museum"
            icon="arrow-up-right"
            style={{ alignSelf: 'stretch', alignItems: 'center' }}
            onPress={() => Linking.openURL(`https://www.artic.edu/artworks/${art.id}`)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({
  colors,
  label,
  value,
}: {
  colors: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
        {label}:
      </Text>
      <Text
        style={[styles.metaValue, { color: colors.text, fontFamily: fonts.serif }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function trim(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  period: {
    fontSize: fontSize.sm,
    letterSpacing: 2,
    textDecorationLine: 'underline',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    maxWidth: '70%',
  },
  metaWrap: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaLabel: {
    width: 90,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingTop: 2,
  },
  metaValue: {
    flex: 1,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.35,
  },
  descWrap: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
  },
  divider: {
    width: 32,
    height: 1,
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md + 1,
    lineHeight: (fontSize.md + 1) * 1.6,
  },
  readMore: {
    marginTop: spacing.md,
    fontSize: fontSize.xs,
    letterSpacing: 2.5,
  },
});
