import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopBar } from '@/components/TopBar';
import { ArchFrame } from '@/components/ArchFrame';
import { Chip } from '@/components/Chip';
import { fonts, fontSize, spacing } from '@/theme/tokens';
import {
  fetchArtworks,
  imageUrl,
  Artwork,
  PERIODS,
  filterByPeriod,
} from '@/services/artApi';

const { width: SCREEN_W } = Dimensions.get('window');
const COL_GAP = spacing.lg;
const SIDE_PAD = spacing.xl;
const CARD_W = (SCREEN_W - SIDE_PAD * 2 - COL_GAP) / 2;
const CARD_H = CARD_W * 1.4;

export default function Gallery() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodIdx, setPeriodIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const all: Artwork[] = [];
        // Fetch multiple pages for better variety
        for (const page of [1, 2, 3]) {
          const r = await fetchArtworks({ page, limit: 40 });
          all.push(...r.data);
        }
        setItems(all);
      } catch (e) {
        console.warn('gallery load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => filterByPeriod(items, PERIODS[periodIdx]), [items, periodIdx]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <TopBar left="HOME" right="ART" onLeftPress={() => router.replace('/')} />

      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.display }]}>
          GALLERY
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {PERIODS.map((p, i) => (
          <Chip key={p.label} label={p.label} active={i === periodIdx} onPress={() => setPeriodIdx(i)} />
        ))}
        <View style={{ flex: 1 }} />
        <Pressable style={{ paddingHorizontal: spacing.sm }} hitSlop={8}>
          <Feather name="sliders" size={18} color={colors.text} />
        </Pressable>
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: SIDE_PAD,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xxxl,
            gap: spacing.xxl,
          }}
          columnWrapperStyle={{ gap: COL_GAP, justifyContent: 'flex-start' }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.empty, { color: colors.textMuted, fontFamily: fonts.serifItalic }]}>
                No artworks for this period.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            // Stagger heights slightly for editorial feel
            const tall = index % 3 === 0;
            const h = tall ? CARD_H + 18 : CARD_H;
            return (
              <Pressable
                onPress={() => router.push(`/artwork/${item.id}`)}
                style={{ marginTop: index % 2 === 1 ? spacing.xl : 0 }}
              >
                <ArchFrame
                  source={imageUrl(item.image_id, 600)}
                  width={CARD_W}
                  height={h}
                  blurhash={item.thumbnail?.lqip ?? undefined}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.serifBold }]}
                >
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.cardDate, { color: colors.textMuted, fontFamily: fonts.body }]}
                >
                  {item.date_display}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleWrap: {
    paddingHorizontal: SIDE_PAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.display,
    letterSpacing: 8,
  },
  chipsRow: {
    paddingHorizontal: SIDE_PAD,
    gap: spacing.lg,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  empty: {
    fontSize: fontSize.lg,
  },
  cardTitle: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  cardDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
    letterSpacing: 1.5,
    paddingHorizontal: spacing.xs,
  },
});
