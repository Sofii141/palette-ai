import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  Dimensions, ScrollView, RefreshControl,
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
const PAGE_SIZE = 20;

export default function Gallery() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [periods, setPeriods] = useState<readonly FilterOption[]>(PERIODS);
  const [styles_, setStyles] = useState<readonly FilterOption[]>(STYLES);
  const [period, setPeriod] = useState('all');
  const [style, setStyle] = useState('all');

  // Guard against stale responses when filters change mid-fetch.
  const reqIdRef = useRef(0);

  useEffect(() => {
    fetchFilters()
      .then((f) => {
        setPeriods(f.periods);
        setStyles(f.styles);
      })
      .catch(() => {});
  }, []);

  // Reset and reload whenever filters change.
  useEffect(() => {
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchArtworks({ period, style, page: 1, limit: PAGE_SIZE })
      .then((r) => {
        if (myReq !== reqIdRef.current) return;
        setItems(r.data);
        setHasMore(r.data.length >= PAGE_SIZE);
      })
      .catch(() => {
        if (myReq !== reqIdRef.current) return;
        setItems([]);
        setHasMore(false);
      })
      .finally(() => {
        if (myReq !== reqIdRef.current) return;
        setLoading(false);
      });
  }, [period, style]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const myReq = reqIdRef.current;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const r = await fetchArtworks({ period, style, page: next, limit: PAGE_SIZE });
      if (myReq !== reqIdRef.current) return;
      if (r.data.length === 0) {
        setHasMore(false);
      } else {
        // Dedupe defensively — backend interleaves AIC+Met, occasional repeats happen.
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...r.data.filter((x) => !seen.has(x.id))];
        });
        setPage(next);
        if (r.data.length < PAGE_SIZE) setHasMore(false);
      }
    } catch {
      // Silently stop trying — user can pull-to-refresh to retry.
      setHasMore(false);
    } finally {
      if (myReq === reqIdRef.current) setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, page, period, style]);

  const onRefresh = useCallback(async () => {
    const myReq = ++reqIdRef.current;
    setRefreshing(true);
    try {
      const r = await fetchArtworks({ period, style, page: 1, limit: PAGE_SIZE });
      if (myReq !== reqIdRef.current) return;
      setItems(r.data);
      setPage(1);
      setHasMore(r.data.length >= PAGE_SIZE);
    } catch {} finally {
      if (myReq === reqIdRef.current) setRefreshing(false);
    }
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : !hasMore && items.length > 0 ? (
              <View style={styles.footerEnd}>
                <View style={[styles.endDivider, { backgroundColor: colors.borderStrong }]} />
                <Text style={[styles.endText, { color: colors.textMuted, fontFamily: fonts.serifItalic }]}>
                  End of the gallery
                </Text>
              </View>
            ) : null
          }
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
  footerLoader: {
    width: '100%',
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  footerEnd: {
    width: '100%',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  endDivider: { width: 32, height: 1, marginBottom: spacing.md },
  endText: { fontSize: fontSize.sm, letterSpacing: 1 },
});
