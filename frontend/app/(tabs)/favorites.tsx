import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { ArchFrame } from '@/components/ArchFrame';
import { fonts, fontSize, spacing } from '@/theme/tokens';
import { fetchFavorites, fetchComments, Artwork } from '@/services/artApi';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_PAD = spacing.xl;
const COL_GAP = spacing.lg;
const CARD_W = (SCREEN_W - SIDE_PAD * 2 - COL_GAP) / 2;
const CARD_H = CARD_W * 1.4;

export default function Favorites() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  // Reload every time this tab gets focus (so newly added favs show)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const r = await fetchFavorites();
          if (!alive) return;
          setItems(r.data);
          // Fetch each user's note in parallel
          const noteEntries = await Promise.all(
            r.data.map(async (a) => {
              try {
                const c = await fetchComments(a.id);
                return [a.id, c.yours?.text || ''] as const;
              } catch {
                return [a.id, ''] as const;
              }
            })
          );
          if (!alive) return;
          setNotes(Object.fromEntries(noteEntries));
        } catch {
          setItems([]);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.display }]}>
          FAVORITES
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts.serifItalic }]}
        >
          Paintings you have saved
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { borderColor: colors.borderStrong }]}>
            <AntDesign name="hearto" size={28} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: fonts.serifItalic }]}>
            Your collection is empty.{'\n'}Tap the heart on any painting{'\n'}to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: SIDE_PAD,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxxl,
            gap: spacing.xxl,
          }}
          columnWrapperStyle={{ gap: COL_GAP }}
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
              {notes[item.id] ? (
                <Text
                  numberOfLines={2}
                  style={[
                    styles.cardNote,
                    { color: colors.textMuted, fontFamily: fonts.serifItalic },
                  ]}
                >
                  &ldquo;{notes[item.id]}&rdquo;
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  title: { fontSize: 32, letterSpacing: 8 },
  subtitle: { fontSize: fontSize.md, marginTop: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.huge,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: fontSize.lg * 1.4,
  },
  cardTitle: { fontSize: fontSize.base, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  cardDate: { fontSize: fontSize.xs, marginTop: 2, letterSpacing: 1.5, paddingHorizontal: spacing.xs },
  cardNote: {
    fontSize: fontSize.xs + 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    lineHeight: (fontSize.xs + 1) * 1.4,
  },
});
