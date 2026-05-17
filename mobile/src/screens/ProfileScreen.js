import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image,
  Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle, withTiming, withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { API } from '../config/api';
import { getChatRooms } from '../services/chatApi';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

function getLevelIcon(level) {
  switch (level) {
    case 'Tutor Junior': return 'medal-outline';
    case 'Tutor Senior': return 'trophy-outline';
    case 'Mentor Académico': return 'diamond-outline';
    default: return 'ribbon-outline';
  }
}

function getXpProgress(xp) {
  if (xp >= 4000) return 1;
  if (xp >= 1501) return (xp - 1501) / (4000 - 1501);
  if (xp >= 501) return (xp - 501) / (1500 - 501);
  return xp / 500;
}

function getNextLevel(level) {
  const next = {
    'Novato': 'Tutor Junior (501 XP)',
    'Tutor Junior': 'Tutor Senior (1,501 XP)',
    'Tutor Senior': 'Mentor Académico (4,000 XP)',
    'Mentor Académico': 'Nivel máximo alcanzado',
  };
  return next[level] || 'Tutor Junior (501 XP)';
}

// XP progress is shown via the AnimatedProgressBar and View-based accent ring on avatar

function AnimatedProgressBar({ progress }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(600, withTiming(progress * 100, { duration: 800 }));
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.min(width.value, 100)}%` }));
  return (
    <View style={progressStyles.bar}>
      <Animated.View style={[progressStyles.fill, barStyle]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: SPACING.xs },
  fill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.accent },
});


export default function ProfileScreen() {
  const { user, signOut, onUserActivity } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const userInitial = user?.display_name?.charAt(0)?.toUpperCase() || '?';
  const level = user?.level || 'Novato';
  const xpPoints = user?.xp_points || 0;
  const reputation = user?.reputation || 0;
  const totalHelps = user?.total_helps || 0;
  const progress = getXpProgress(xpPoints);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rooms = await getChatRooms(user.id);
      setHistory(rooms.filter(r => r.status === 'closed').slice(0, 10));
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);



  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)} días`;
  };

  return (
    <View style={styles.container} onTouchStart={onUserActivity}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header — clean nav bar */}
      <View style={[styles.headerBg, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          {user?.role === 'admin' && (
            <TouchableOpacity onPress={() => navigation.navigate('AdminDashboard')} style={styles.adminBtn} activeOpacity={0.7}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.accent} />
              <Text style={styles.adminBtnText}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory(); }} colors={[COLORS.primary]} />}
      >
        {/* Profile card — sequential, no aggressive overlap */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            )}
          </View>

          <View style={styles.levelBadge}>
            <Ionicons name={getLevelIcon(level)} size={14} color={COLORS.accentDark} style={{ marginRight: 4 }} />
            <Text style={styles.levelText}>{level}</Text>
          </View>

          <Text style={styles.userName}>{user?.display_name || 'Estudiante UPT'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userCareer}>{user?.career || 'Sin carrera especificada'}</Text>

        </Animated.View>

        {/* XP card */}
        <Animated.View entering={FadeInRight.delay(250).duration(500)} style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <View>
              <Text style={styles.xpLabel}>Experiencia</Text>
              <Text style={styles.xpValue}>{xpPoints.toLocaleString()} XP</Text>
            </View>
            <View style={styles.xpIconBg}>
              <Ionicons name="flash" size={22} color={COLORS.accent} />
            </View>
          </View>
          <AnimatedProgressBar progress={progress} />
          <Text style={styles.xpNextLevel}>Siguiente nivel: {getNextLevel(level)}</Text>
        </Animated.View>

        {/* Stats grid */}
        <Animated.View entering={FadeInRight.delay(400).duration(500)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="star" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.statValue}>{reputation.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Reputación</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.successSoft }]}>
              <Ionicons name="people" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{totalHelps}</Text>
            <Text style={styles.statLabel}>Ayudas</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.primarySoft }]}>
              <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{history.length}</Text>
            <Text style={styles.statLabel}>Sesiones</Text>
          </View>
        </Animated.View>

        {/* History */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Text style={styles.sectionTitle}>Historial de Ayudas</Text>
          {history.length > 0 ? (
            history.map((room, idx) => {
              const isMentor = user?.id === room.mentor_id;
              const otherName = isMentor ? room.student_name : room.mentor_name;
              return (
                <TouchableOpacity
                  key={room.id}
                  style={styles.historyCard}
                  onPress={() => navigation.navigate('ChatRoom', { room })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.historyIcon, { backgroundColor: isMentor ? COLORS.accentSoft : COLORS.primarySoft }]}>
                    <Ionicons name={isMentor ? 'school-outline' : 'hand-left-outline'} size={18} color={isMentor ? COLORS.accentDark : COLORS.primary} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{room.doubt_title}</Text>
                    <Text style={styles.historySub}>
                      {isMentor ? 'Ayudaste a' : 'Te ayudó'} {otherName} · {getTimeAgo(room.closed_at)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyHistory}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="time-outline" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyHistoryText}>Sin historial aún</Text>
              <Text style={styles.emptyHistorySub}>Ayuda a otros y tu historial aparecerá aquí.</Text>
            </View>
          )}
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Header — slim nav bar
  headerBg: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textLight, letterSpacing: -0.5 },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, gap: 4,
  },
  adminBtnText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.accent },
  // Profile card — clean, no aggressive overlap
  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', marginHorizontal: SPACING.xs,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  avatarWrap: { position: 'relative', marginBottom: SPACING.sm },
  avatar: { width: 84, height: 84, borderRadius: RADIUS.full, borderWidth: 3, borderColor: COLORS.accent },
  avatarPlaceholder: {
    width: 84, height: 84, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.accent,
  },
  avatarText: { fontSize: FONTS.sizes.hero, fontWeight: '700', color: COLORS.primary },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentSoft,
    paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.full, marginBottom: SPACING.xs,
  },
  levelText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.accentDark },
  userName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  userEmail: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: 2 },
  userCareer: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg,
    paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
  },
  editBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  // Body
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: SPACING.md, paddingBottom: 120 },
  // XP Card
  xpCard: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.medium },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  xpLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  xpValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textLight },
  xpIconBg: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  xpNextLevel: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.soft,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textSecondary, marginTop: 2 },
  // Section
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md },
  // History
  historyCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.sm, ...SHADOWS.soft,
  },
  historyIcon: {
    width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  historySub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 3 },
  // Empty
  emptyHistory: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.xl,
    alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.soft,
  },
  emptyIconBg: { width: 60, height: 60, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  emptyHistoryText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  emptyHistorySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  // Logout
  logoutBtn: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingVertical: 16, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.soft, marginTop: SPACING.md,
  },
  logoutText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.error },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', ...SHADOWS.large },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  modalLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md, paddingVertical: 14, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  modalCancelText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  modalSaveBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary,
  },
  modalSaveText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textLight },
});
