import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Dimensions, Linking, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/services/auth';
import { ArchFrame } from '@/components/ArchFrame';
import { PillButton } from '@/components/PillButton';
import { fonts, fontSize, spacing, radius } from '@/theme/tokens';
import {
  fetchArtwork, addFavorite, removeFavorite, fetchFavoriteIds,
  fetchComments, postComment, Artwork, Comment,
} from '@/services/artApi';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_W = SCREEN_W - spacing.xxl * 2;
const HERO_H = HERO_W * 1.3;

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (diff < day) return 'TODAY';
  const days = Math.floor(diff / day);
  if (days < 30) return `${days}D AGO`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}MO AGO`;
  return `${Math.floor(months / 12)}Y AGO`;
}

export default function ArtworkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [art, setArt] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [yours, setYours] = useState<Comment | null>(null);
  const [others, setOthers] = useState<Comment[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [a, ids, c] = await Promise.all([
          fetchArtwork(id),
          fetchFavoriteIds().catch(() => ({ ids: [] as number[] })),
          fetchComments(id).catch(() => ({ yours: null, others: [] as Comment[] })),
        ]);
        setArt(a);
        setIsFav(ids.ids.includes(Number(id)));
        setYours(c.yours);
        setOthers(c.others);
        if (c.yours) setDraft(c.yours.text);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  const onToggleFav = useCallback(async () => {
    if (!art) return;
    try {
      if (isFav) {
        await removeFavorite(art.id);
        setIsFav(false);
      } else {
        await addFavorite(art.id);
        setIsFav(true);
      }
      refreshUser();
    } catch {}
  }, [art, isFav, refreshUser]);

  const onSubmitComment = useCallback(async () => {
    if (!art || !draft.trim()) return;
    setPosting(true);
    try {
      const saved = await postComment(art.id, draft.trim());
      setYours(saved);
      setEditing(false);
    } catch {} finally { setPosting(false); }
  }, [art, draft]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
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

  const century = art.dateStart != null ? `${Math.floor(art.dateStart / 100) + 1}00s` : null;
  const description = art.description || `${art.title} by ${art.artistFull}. ${art.medium || ''}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.huge }}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            {century && (
              <Text style={[styles.period, { color: colors.text, fontFamily: fonts.bodyMedium }]}>
                {century}
              </Text>
            )}
            <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text, fontFamily: fonts.serifBold }]}>
              {art.title}
            </Text>
          </View>
          <Pressable onPress={() => Linking.openURL(art.aicUrl)} hitSlop={12}>
            <Feather name="external-link" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <View>
            <ArchFrame
              source={art.imageLarge || art.image}
              width={HERO_W}
              height={HERO_H}
              blurhash={art.lqip ?? undefined}
            />
            <Pressable
              onPress={onToggleFav}
              style={({ pressed }) => [
                styles.heart,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.borderStrong,
                  shadowColor: colors.shadow,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <AntDesign name={isFav ? 'heart' : 'hearto'} size={22} color={isFav ? colors.heart : colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.metaWrap}>
          {([
            ['When', art.date],
            ['Artist', art.artist],
            ['Place', art.place],
            ['Medium', art.medium],
            ['Period', art.style || art.classification],
            ['Status', art.onView ? `On view · ${art.gallery || 'AIC'}` : 'In archive'],
          ] as const).filter(([, v]) => v).map(([label, value]) => (
            <View key={label} style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
                {label}
              </Text>
              <Text style={[styles.metaValue, { color: colors.text, fontFamily: fonts.serif }]} numberOfLines={2}>
                {value}
              </Text>
            </View>
          ))}
        </View>

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

        {/* INTERPRETATIONS */}
        <View style={styles.interpWrap}>
          <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />

          {yours && !editing ? (
            <View style={[styles.yoursCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderStrong }]}>
              <Text style={[styles.yoursLabel, { color: colors.accent, fontFamily: fonts.bodySemi }]}>
                YOUR INTERPRETATION
              </Text>
              <Text style={[styles.yoursText, { color: colors.text, fontFamily: fonts.serif }]}>
                {yours.text}
              </Text>
              <View style={styles.yoursMeta}>
                <Text style={[styles.yoursTime, { color: colors.textMuted, fontFamily: fonts.body }]}>
                  {relTime(yours.createdAt)}
                </Text>
                <Pressable onPress={() => { setEditing(true); setDraft(yours.text); }}>
                  <Text style={[styles.editLink, { color: colors.accent, fontFamily: fonts.bodySemi }]}>
                    EDIT
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : user ? (
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: fonts.bodyMedium }]}>
                {yours ? 'EDIT YOUR INTERPRETATION' : 'SHARE YOUR INTERPRETATION'}
              </Text>
              <TextInput
                multiline
                value={draft}
                onChangeText={setDraft}
                maxLength={800}
                placeholder="What does this painting mean to you?"
                placeholderTextColor={colors.textMuted}
                style={[styles.formInput, { color: colors.text, fontFamily: fonts.serif }]}
              />
              <View style={styles.formActions}>
                <Text style={[styles.counter, { color: colors.textMuted, fontFamily: fonts.body }]}>
                  {draft.length} / 800
                </Text>
                <Pressable
                  onPress={onSubmitComment}
                  disabled={!draft.trim() || posting}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    { backgroundColor: colors.accent, opacity: !draft.trim() || posting || pressed ? 0.5 : 1 },
                  ]}
                >
                  {posting ? (
                    <ActivityIndicator color={colors.textInverse} size="small" />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.textInverse, fontFamily: fonts.bodyMedium }]}>
                      SAVE
                    </Text>
                  )}
                </Pressable>
              </View>
              {yours && editing && (
                <Pressable
                  onPress={() => { setEditing(false); setDraft(yours.text); }}
                  style={{ marginTop: spacing.sm, alignSelf: 'center' }}
                >
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.5 }}>
                    CANCEL
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          <Text style={[styles.othersTitle, { color: colors.text, fontFamily: fonts.displayItalic }]}>
            Other visitors
          </Text>
          <Text style={[styles.othersSub, { color: colors.textMuted, fontFamily: fonts.serifItalic }]}>
            What this painting has meant to people who stopped here.
          </Text>

          {others.length === 0 ? (
            <Text style={[styles.othersEmpty, { color: colors.textMuted, fontFamily: fonts.serifItalic }]}>
              Be the first to share what this painting means.
            </Text>
          ) : (
            others.map((c) => (
              <View key={c.id} style={[styles.commentCard, { borderBottomColor: colors.border }]}>
                <View style={styles.commentHead}>
                  <View style={[styles.commentAvatar, { backgroundColor: colors.surfaceTint, borderColor: colors.border }]}>
                    <Text style={{ color: colors.accent, fontFamily: fonts.display, fontSize: 13 }}>
                      {(c.displayName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.commentName, { color: colors.text, fontFamily: fonts.serifBold }]}>
                    {c.displayName}
                  </Text>
                  <Text style={[styles.commentTime, { color: colors.textMuted, fontFamily: fonts.body }]}>
                    {relTime(c.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.commentText, { color: colors.textSecondary, fontFamily: fonts.serif }]}>
                  {c.text}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ paddingHorizontal: spacing.xxl, marginTop: spacing.xl }}>
          <PillButton
            label="View at the Museum"
            icon="arrow-up-right"
            style={{ alignSelf: 'stretch', alignItems: 'center' }}
            onPress={() => Linking.openURL(art.aicUrl)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  headerCenter: {
    flex: 1, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: spacing.md,
  },
  period: { fontSize: fontSize.sm, letterSpacing: 2, textDecorationLine: 'underline' },
  headerTitle: { fontSize: fontSize.lg, maxWidth: '60%' },
  heart: {
    position: 'absolute', bottom: -18, right: -8,
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
  },
  metaWrap: { paddingHorizontal: spacing.xxl, marginTop: spacing.xxl, gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start' },
  metaLabel: {
    width: 80, fontSize: fontSize.sm, letterSpacing: 1,
    textTransform: 'uppercase', paddingTop: 2,
  },
  metaValue: { flex: 1, fontSize: fontSize.md, lineHeight: fontSize.md * 1.35 },
  descWrap: { paddingHorizontal: spacing.xxl, marginTop: spacing.xxl },
  divider: { width: 32, height: 1, marginBottom: spacing.md },
  eyebrow: { fontSize: fontSize.xs, letterSpacing: 3, marginBottom: spacing.md },
  description: { fontSize: fontSize.md + 1, lineHeight: (fontSize.md + 1) * 1.6 },
  readMore: { marginTop: spacing.md, fontSize: fontSize.xs, letterSpacing: 2.5 },

  interpWrap: { paddingHorizontal: spacing.xxl, marginTop: spacing.xxl },
  yoursCard: {
    borderRadius: 18, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg,
  },
  yoursLabel: { fontSize: 10, letterSpacing: 3, marginBottom: spacing.sm },
  yoursText: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  yoursMeta: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: spacing.md,
  },
  yoursTime: { fontSize: 10, letterSpacing: 1.5 },
  editLink: { fontSize: 10, letterSpacing: 1.5 },
  formCard: {
    borderRadius: 18, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg,
  },
  formLabel: { fontSize: 10, letterSpacing: 3, marginBottom: spacing.sm },
  formInput: {
    fontSize: fontSize.md, minHeight: 80,
    textAlignVertical: 'top', lineHeight: fontSize.md * 1.5,
  },
  formActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: spacing.sm,
  },
  counter: { fontSize: 10, letterSpacing: 1 },
  saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  saveBtnText: { fontSize: 10, letterSpacing: 2 },
  othersTitle: { fontSize: 18, marginTop: spacing.lg, marginBottom: spacing.xs },
  othersSub: { fontSize: fontSize.base, marginBottom: spacing.md },
  othersEmpty: { fontSize: fontSize.md, marginTop: spacing.md },
  commentCard: { paddingVertical: spacing.md, borderBottomWidth: 1 },
  commentHead: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.xs,
  },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  commentName: { fontSize: fontSize.base, flex: 1 },
  commentTime: { fontSize: 10, letterSpacing: 1 },
  commentText: {
    fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, paddingLeft: 36,
  },
});
