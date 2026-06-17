import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, StatusBar,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '../config/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const PODIUM_EMOJI = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(API.ENDPOINTS.LEADERBOARD);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error cargando ranking:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const renderPodium = () => {
    if (users.length < 1) return null;
    const top3 = users.slice(0, 3);

    return (
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.podiumSection}>
        <Text style={styles.podiumTitle}>Top Mentores UPT</Text>
        <View style={styles.podiumRow}>
          {[1, 0, 2].map((idx) => {
            const u = top3[idx];
            if (!u) return <View key={idx} style={styles.podiumSlot} />;
            const isFirst = idx === 0;
            return (
              <View key={u.id} style={[styles.podiumSlot, isFirst && styles.podiumSlotFirst]}>
                <View style={[
                  styles.podiumAvatarRing,
                  { borderColor: PODIUM_COLORS[idx] },
                  isFirst && styles.podiumAvatarRingFirst,
                ]}>
                  {u.photo_url ? (
                    <Image source={{ uri: u.photo_url }} style={[
                      styles.podiumAvatar,
                      isFirst && styles.podiumAvatarFirst,
                    ]} />
                  ) : (
                    <View style={[
                      styles.podiumAvatarPlaceholder,
                      isFirst && styles.podiumAvatarFirst,
                    ]}>
                      <Text style={styles.podiumAvatarText}>
                        {u.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.podiumEmoji}>{PODIUM_EMOJI[idx]}</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {u.display_name?.split(' ')[0] || 'Anónimo'}
                </Text>
                <Text style={styles.podiumXp}>{u.xp_points} XP</Text>
                <View style={[styles.podiumBadge, { backgroundColor: PODIUM_COLORS[idx] + '20' }]}>
                  <Text style={[styles.podiumBadgeText, { color: PODIUM_COLORS[idx] }]}>
                    #{idx + 1}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }) => {
    const rank = index + 1;
    if (rank <= 3) return null;

    return (
      <Animated.View entering={FadeInDown.delay(100 + index * 50).duration(400)}>
        <View style={styles.rankCard}>
          <View style={styles.rankNumberWrap}>
            <Text style={styles.rankNumber}>{rank}</Text>
          </View>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.rankAvatar} />
          ) : (
            <View style={styles.rankAvatarPlaceholder}>
              <Text style={styles.rankAvatarText}>
                {item.display_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.rankInfo}>
            <Text style={styles.rankName} numberOfLines={1}>{item.display_name}</Text>
            <View style={styles.rankMetaRow}>
              <Text style={styles.rankLevel}>{item.level || 'Novato'}</Text>
              {item.career && item.career !== 'Sin especificar' && (
                <Text style={styles.rankCareer}>· {item.career}</Text>
              )}
            </View>
          </View>
          <View style={styles.rankStats}>
            <Text style={styles.rankXp}>{item.xp_points}</Text>
            <Text style={styles.rankXpLabel}>XP</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerWrap]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Ionicons name="trophy" size={22} color={COLORS.accent} />
          <Text style={styles.headerTitle}>Ranking</Text>
        </View>
        <Text style={styles.headerSub}>Los mejores mentores de la comunidad UPT</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderPodium}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="trophy-outline" size={40} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyText}>Sin mentores aún</Text>
            <Text style={styles.emptySub}>
              Sé el primero en ayudar a otros y aparece aquí.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerWrap: { justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textLight,
  },
  headerSub: {
    fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.6)',
  },
  listContent: { paddingBottom: 100 },
  podiumSection: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  podiumTitle: {
    fontSize: FONTS.sizes.sm, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)', textAlign: 'center',
    marginBottom: SPACING.lg, textTransform: 'uppercase', letterSpacing: 1,
  },
  podiumRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'flex-end', gap: SPACING.sm,
  },
  podiumSlot: {
    alignItems: 'center', width: 100,
  },
  podiumSlotFirst: {
    marginBottom: SPACING.md,
  },
  podiumAvatarRing: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  podiumAvatarRingFirst: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4,
  },
  podiumAvatar: { width: 52, height: 52, borderRadius: 26 },
  podiumAvatarFirst: { width: 66, height: 66, borderRadius: 33 },
  podiumAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center',
  },
  podiumAvatarText: {
    fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textLight,
  },
  podiumEmoji: { fontSize: 20, marginBottom: 2 },
  podiumName: {
    fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textLight,
    textAlign: 'center',
  },
  podiumXp: {
    fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.6)',
    fontWeight: '600', marginTop: 2,
  },
  podiumBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full,
    marginTop: 4,
  },
  podiumBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '800' },
  rankCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    padding: SPACING.md, borderRadius: RADIUS.sm, ...SHADOWS.soft,
  },
  rankNumberWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.borderLight, justifyContent: 'center',
    alignItems: 'center', marginRight: SPACING.sm,
  },
  rankNumber: {
    fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.textSecondary,
  },
  rankAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: SPACING.md },
  rankAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primarySoft, justifyContent: 'center',
    alignItems: 'center', marginRight: SPACING.md,
  },
  rankAvatarText: {
    fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary,
  },
  rankInfo: { flex: 1 },
  rankName: {
    fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary,
  },
  rankMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rankLevel: {
    fontSize: FONTS.sizes.xs, color: COLORS.accent, fontWeight: '600',
  },
  rankCareer: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginLeft: 4,
  },
  rankStats: { alignItems: 'center' },
  rankXp: {
    fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary,
  },
  rankXpLabel: {
    fontSize: 10, fontWeight: '600', color: COLORS.textMuted,
  },
  emptyWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl,
  },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.borderLight, justifyContent: 'center',
    alignItems: 'center', marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
});
