import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchFeed, fetchSubjects, deleteDoubt, toggleLikeDoubt } from '../services/doubtsApi';
import { wsService } from '../services/websocket';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.authorRow}>
        <View style={[styles.skeletonCircle, styles.skeleton]} />
        <View style={styles.authorInfo}>
          <View style={[styles.skeletonBar, styles.skeleton, { width: 120 }]} />
          <View style={[styles.skeletonBar, styles.skeleton, { width: 80, marginTop: 6 }]} />
        </View>
      </View>
    </View>
    <View style={styles.cardBody}>
      <View style={[styles.skeletonBar, styles.skeleton, { width: '90%', height: 16, marginBottom: 10 }]} />
      <View style={[styles.skeletonBar, styles.skeleton, { width: '65%', height: 14 }]} />
    </View>
  </View>
);

const DoubtCard = memo(({ item, getTimeAgo, index, onPress, onLongPress, isOwn, userId, userCareer, onLike }) => {
  const isLiked = (item.liked_by || []).includes(userId);
  const isRecommended = !!userCareer && !!item.subject_name &&
    item.subject_name.toLowerCase().includes(userCareer.toLowerCase().split(' ').pop());

  return (
    <Animated.View entering={FadeInUp.delay(index * 70).duration(350)} layout={Layout.springify()}>
      <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.88}>
        {/* Author */}
        <View style={styles.cardHeader}>
          <View style={styles.authorRow}>
            {item.author_photo ? (
              <Image source={{ uri: item.author_photo }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarFallback}>
                <Text style={styles.authorInitial}>
                  {item.author_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.authorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{item.author_name}</Text>
                {item.author_level && item.author_level !== 'Novato' && (
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>{item.author_level}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timeAgo}>
                {getTimeAgo(item.created_at)}
                {item.subject_name ? ` · ${item.subject_name}` : ''}
              </Text>
            </View>
            <View style={styles.rightBadges}>
              {isRecommended && (
                <View style={styles.recommendedBadge}>
                  <Ionicons name="star" size={10} color="#f59e0b" style={{ marginRight: 3 }} />
                  <Text style={styles.recommendedBadgeText}>Para ti</Text>
                </View>
              )}
              {isOwn && (
                <View style={styles.ownBadge}>
                  <Text style={styles.ownBadgeText}>Tú</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
          ) : null}
        </View>

        {/* Image */}
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
        )}

        {/* Social actions */}
        <View style={styles.socialBar}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => onLike(item.id)}
            activeOpacity={0.6}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#E04040' : COLORS.textSecondary}
            />
            {(item.likes_count || 0) > 0 && (
              <Text style={[styles.socialCount, isLiked && { color: '#E04040' }]}>
                {item.likes_count}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn} onPress={onPress} activeOpacity={0.6}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
            {(item.comments_count || 0) > 0 && (
              <Text style={styles.socialCount}>{item.comments_count}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.socialSpacer} />

          <View style={[styles.statusPill, item.status === 'open' ? styles.statusOpen : styles.statusResolved]}>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'open' ? COLORS.success : COLORS.textMuted }]} />
            <Text style={styles.statusText}>{item.status === 'open' ? 'Abierta' : 'Resuelta'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function FeedScreen() {
  const { user, onUserActivity } = useAuth();
  const insets = useSafeAreaInsets();
  const [doubts, setDoubts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [feedData, subjectsData] = await Promise.all([
        fetchFeed(selectedSubject, user?.id),
        fetchSubjects(),
      ]);
      setDoubts(feedData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSubject, user?.id]);

  useEffect(() => {
    loadData();

    const handleNewDoubt = (newDoubt) => {
      if (selectedSubject && newDoubt.subject_id !== selectedSubject) return;
      setDoubts(prev => {
        if (prev.find(d => d.id === newDoubt.id)) return prev;
        return [newDoubt, ...prev];
      });
    };
    const handleDoubtResolved = ({ doubt_id }) => {
      setDoubts(prev => prev.filter(d => d.id !== doubt_id));
    };

    wsService.on('new_doubt', handleNewDoubt);
    wsService.on('doubt_resolved', handleDoubtResolved);

    return () => {
      wsService.off('new_doubt', handleNewDoubt);
      wsService.off('doubt_resolved', handleDoubtResolved);
    };
  }, [loadData, selectedSubject]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getTimeAgo = useCallback((dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }, []);

  const navigation = useNavigation();

  const handleDeleteDoubt = useCallback(async (doubtId) => {
    Alert.alert('Eliminar duda', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await deleteDoubt(doubtId, user.id);
            setDoubts(prev => prev.filter(d => d.id !== doubtId));
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }, [user]);

  const handleLike = useCallback(async (doubtId) => {
    if (!user?.id) return;
    setDoubts(prev => prev.map(d => {
      if (d.id !== doubtId) return d;
      const liked = (d.liked_by || []).includes(user.id);
      return {
        ...d,
        liked_by: liked
          ? (d.liked_by || []).filter(id => id !== user.id)
          : [...(d.liked_by || []), user.id],
        likes_count: liked ? (d.likes_count || 1) - 1 : (d.likes_count || 0) + 1,
      };
    }));
    try {
      await toggleLikeDoubt(doubtId, user.id);
    } catch (err) {
      loadData();
    }
  }, [user, loadData]);

  const renderDoubt = useCallback(({ item, index }) => (
    <DoubtCard
      item={item}
      getTimeAgo={getTimeAgo}
      index={index}
      isOwn={item.author_id === user?.id}
      userId={user?.id}
      userCareer={user?.career}
      onPress={() => navigation.navigate('DoubtDetail', { doubt: item })}
      onLongPress={() => {
        if (item.author_id === user?.id || user?.role === 'admin') {
          handleDeleteDoubt(item.id);
        }
      }}
      onLike={handleLike}
    />
  ), [getTimeAgo, navigation, user, handleDeleteDoubt, handleLike]);

  return (
    <View style={styles.container} onTouchStart={onUserActivity}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoBg}>
            <Ionicons name="school" size={18} color={COLORS.textLight} />
          </View>
          <Text style={styles.headerTitle}>RCE UPT</Text>
        </View>
      </View>

      {/* Sub header */}
      <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.subHeader}>
        <Text style={styles.subHeaderTitle}>Feed</Text>
        <Text style={styles.subHeaderSub}>
          {user?.career && user.career !== 'Sin especificar'
            ? `Mostrando primero dudas de ${user.career}`
            : 'Dudas de la comunidad'}
        </Text>
      </Animated.View>

      {/* Subject filters */}
      <View style={styles.filterWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: 'Todos' }, ...subjects]}
          keyExtractor={(item) => (item.id === null ? 'all' : item.id.toString())}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const isActive = selectedSubject === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedSubject(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Feed */}
      {loading ? (
        <View style={styles.listContent}>{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</View>
      ) : (
        <FlatList
          data={doubts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDoubt}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={11}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="chatbubbles-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyText}>No hay dudas pendientes</Text>
              <Text style={styles.emptySub}>Sé el primero en publicar una duda o cambia de tema.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 16, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerLogoBg: {
    width: 32, height: 32, borderRadius: RADIUS.xs, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textLight, letterSpacing: 0.5 },
  // Sub header
  subHeader: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xs },
  subHeaderTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  subHeaderSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  // Filters
  filterWrapper: { marginBottom: SPACING.xs },
  filterRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.textLight },
  // List
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  // Card
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    marginBottom: SPACING.md, overflow: 'hidden', ...SHADOWS.soft,
  },
  cardHeader: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 44, height: 44, borderRadius: RADIUS.full },
  authorAvatarFallback: {
    width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  authorInfo: { flex: 1, marginLeft: SPACING.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  levelBadge: { backgroundColor: COLORS.accentSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  levelBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.accentDark },
  timeAgo: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  // Right badge container
  rightBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownBadge: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  ownBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  recommendedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  recommendedBadgeText: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  cardBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardDescription: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  cardImage: { width: '100%', height: 220, backgroundColor: COLORS.borderLight },
  // Social bar
  socialBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderTopWidth: 0.5, borderTopColor: COLORS.borderLight,
  },
  socialBtn: { flexDirection: 'row', alignItems: 'center', marginRight: SPACING.xl },
  socialCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600', marginLeft: 5 },
  socialSpacer: { flex: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, gap: 5,
  },
  statusOpen: { backgroundColor: COLORS.successSoft },
  statusResolved: { backgroundColor: COLORS.borderLight },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  // Empty & skeleton
  emptyWrap: { alignItems: 'center', paddingTop: SPACING.xxxl, paddingHorizontal: SPACING.xl },
  emptyIconBg: { width: 80, height: 80, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  emptyText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  skeleton: { backgroundColor: COLORS.borderLight },
  skeletonCircle: { width: 44, height: 44, borderRadius: RADIUS.full },
  skeletonBar: { height: 12, borderRadius: 6 },
});
