import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  Dimensions, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { ArchFrame } from '@/components/ArchFrame';
import { Chip } from '@/components/Chip';
import { fonts, fontSize, spacing } from '@/theme/tokens';
import {
  fetchArtworks, fetchFilters, Artwork, FilterOption, PERIODS, STYLES,
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
  const [periods, setPeriods] = useState<readonly FilterOption[]>(PERIODS);
  const [styles_, setStyles] = useState<readonly FilterOption[]>(STYLES);
  const [period, setPeriod] = useState('all');
  const [style, setStyle] = useState('all');

  useEffect(() => {
    fetchFilters()
      .then((f) => {
        setPeriods(f.periods);
        setStyles(f.styles);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchArtworks({ period, style, limit: 24 })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [period, style]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.display }]}>
          GALLERY
        </Text>
      </View>

      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
          BY PERIOD
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {periods.map((p) => (
            <Chip key={p.key} label={p.label} active={p.key === period} onPress={() => setPeriod(p.key)} />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
          BY MOVEMENT
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {styles_.map((s) => (
            <Chip key={s.key} label={s.label} active={s.key === style} onPress={() => setStyle(s.key)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: SIDE_PAD,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xxxl,
            gap: spacing.xxl,
          }}
          columnWrapperStyle={{ gap: COL_GAP }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.empty, { color: colors.textMuted, fontFamily: fonts.serifItalic }]}>
                No paintings for this combination.{'\n'}Try a different filter.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => router.push(`/artwork/${item.id}`)}
              style={{ marginTop: index % 2 === 1 ? spacing.xl : 0 }}
            >
              <ArchFrame
                source={item.thumbnail}
                width={CARD_W}
                height={CARD_H}
                blurhash={item.lqip ?? undefined}
              />
              <Text
                numberOfLines={2}
                style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.serifBold }]}
              >
                {item.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.cardDate, { color: colors.textMuted, fontFamily: fonts.body }]}
              >
                {item.date}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleWrap: {
    paddingHorizontal: SIDE_PAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  title: { fontSize: 32, letterSpacing: 8 },
  filterSection: { paddingHorizontal: SIDE_PAD, paddingBottom: spacing.xs },
  filterLabel: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  chipsRow: { gap: spacing.lg, alignItems: 'center', paddingVertical: 4 },
  divider: { height: 1, marginHorizontal: SIDE_PAD, marginVertical: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  empty: { fontSize: fontSize.lg, textAlign: 'center', lineHeight: fontSize.lg * 1.4 },
  cardTitle: { fontSize: fontSize.base, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  cardDate: { fontSize: fontSize.xs, marginTop: 2, letterSpacing: 1.5, paddingHorizontal: spacing.xs },
});
