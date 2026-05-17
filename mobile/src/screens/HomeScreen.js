import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const LEVEL_META = {
  'Novato':           { emoji: '🥉', color: '#A0A0A0', bg: 'rgba(160,160,160,0.1)' },
  'Tutor Junior':     { emoji: '🥈', color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)' },
  'Tutor Senior':     { emoji: '🥇', color: COLORS.accent, bg: COLORS.accentSoft },
  'Mentor Académico': { emoji: '💎', color: COLORS.primary, bg: COLORS.primarySoft },
};

const XP_THRESHOLDS = { 'Novato': 500, 'Tutor Junior': 1500, 'Tutor Senior': 4000, 'Mentor Académico': 4000 };

export default function HomeScreen() {
  const { user, signOut, onUserActivity } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const userInitial = user?.display_name?.charAt(0)?.toUpperCase() || '?';
  const firstName = user?.display_name?.split(' ')[0] || 'Estudiante';
  const level = user?.level || 'Novato';
  const xp = user?.xp_points || 0;
  const levelMeta = LEVEL_META[level] || LEVEL_META['Novato'];
  const xpMax = XP_THRESHOLDS[level] || 500;
  const xpProgress = Math.min(xp / xpMax, 1);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const quickActions = [
    { icon: 'chatbubbles-outline', label: 'Ver Dudas', color: COLORS.primary, bg: COLORS.primarySoft, nav: 'FeedTab' },
    { icon: 'add-circle-outline', label: 'Publicar', color: COLORS.accent, bg: COLORS.accentSoft, nav: 'PostTab' },
    { icon: 'paper-plane-outline', label: 'Mensajes', color: COLORS.success, bg: COLORS.successSoft, nav: 'ChatTab' },
    { icon: 'person-outline', label: 'Perfil', color: COLORS.info, bg: 'rgba(44,130,201,0.10)', nav: 'ProfileTab' },
  ];

  return (
    <View style={styles.container} onTouchStart={onUserActivity}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <LoadingOverlay visible={loggingOut} message="Cerrando sesión..." />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <View style={styles.logoBox}>
              <Ionicons name="school" size={18} color={COLORS.textLight} />
            </View>
            <View>
              <Text style={styles.headerTitle}>RCE UPT</Text>
              <Text style={styles.headerSub}>Red Colaborativa Estudiantil</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.avatarRing}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProfileTab')}
          >
            {user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{userInitial}</Text>
              </View>
            )}
            <View style={styles.avatarOnline} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.greetingCard}>
          <Text style={styles.greetingLabel}>{getGreeting()},</Text>
          <Text style={styles.greetingName}>{firstName} 👋</Text>
          {user?.career ? (
            <View style={styles.careerTag}>
              <Ionicons name="briefcase-outline" size={11} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
              <Text style={styles.careerTagText}>{user.career}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* XP Progress Bar */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.xpBar}>
          <View style={styles.xpBarHeader}>
            <View style={styles.levelRow}>
              <Text style={styles.levelEmoji}>{levelMeta.emoji}</Text>
              <Text style={[styles.levelLabel, { color: levelMeta.color }]}>{level}</Text>
            </View>
            <Text style={styles.xpText}>{xp} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <Animated.View
              entering={FadeIn.delay(500).duration(800)}
              style={[styles.xpFill, { width: `${xpProgress * 100}%`, backgroundColor: levelMeta.color || COLORS.accent }]}
            />
          </View>
          <Text style={styles.xpSub}>Meta: {xpMax} XP</Text>
        </Animated.View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

        {/* Stats Grid */}
        <Animated.View entering={FadeInRight.delay(300).duration(500)} style={styles.statsGrid}>
          <View style={[styles.statTile, { borderTopColor: COLORS.primary }]}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.primarySoft }]}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.statNumber}>{user?.credits || 0}</Text>
            <Text style={styles.statTitle}>Créditos</Text>
          </View>
          <View style={[styles.statTile, { borderTopColor: COLORS.accent }]}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="star-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.statNumber}>{user?.reputation?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statTitle}>Reputación</Text>
          </View>
          <View style={[styles.statTile, { borderTopColor: COLORS.success }]}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.successSoft }]}>
              <Ionicons name="people-outline" size={18} color={COLORS.success} />
            </View>
            <Text style={styles.statNumber}>{user?.total_helps || 0}</Text>
            <Text style={styles.statTitle}>Ayudas</Text>
          </View>
        </Animated.View>

        {/* Admin Panel */}
        {user?.role === 'admin' && (
          <Animated.View entering={FadeInDown.delay(350).duration(500)}>
            <TouchableOpacity
              style={styles.adminBtn}
              onPress={() => navigation.navigate('AdminDashboard')}
              activeOpacity={0.75}
            >
              <View style={styles.adminBtnIcon}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.adminBtnContent}>
                <Text style={styles.adminBtnTitle}>Panel de Administración</Text>
                <Text style={styles.adminBtnSub}>Gestionar usuarios, dudas y anuncios</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Status Card */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.statusCard}>
          <View style={styles.statusDot} />
          <View style={styles.statusContent}>
            <Text style={styles.statusHeading}>Plataforma activa</Text>
            <Text style={styles.statusDescription}>Todo listo, tu cuenta institucional está verificada.</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>UPT</Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <Text style={styles.sectionTitle}>Acceso Rápido</Text>
          <View style={styles.quickActions}>
            {quickActions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickActionCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(a.nav)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={styles.quickActionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Tips */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color={COLORS.accent} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>💡 Tip del día</Text>
            <Text style={styles.tipText}>
              Responder dudas marcadas como urgentes te da +75 XP adicionales. ¡Busca en el Feed!
            </Text>
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(550).duration(500)}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} style={{ marginRight: 6 }} />
            <Text style={styles.logoutLabel}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoBox: {
    width: 36, height: 36, borderRadius: RADIUS.xs, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textLight },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: 1 },
  avatarRing: {
    width: 44, height: 44, borderRadius: RADIUS.full, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center', overflow: 'visible',
  },
  avatarImg: { width: 40, height: 40, borderRadius: RADIUS.full },
  avatarCircle: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textLight },
  avatarOnline: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.primary,
  },
  greetingCard: { marginBottom: SPACING.md },
  greetingLabel: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  greetingName: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textLight, marginBottom: SPACING.xs },
  careerTag: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  careerTagText: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  // XP Bar
  xpBar: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: RADIUS.sm, padding: SPACING.md,
  },
  xpBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelEmoji: { fontSize: 18 },
  levelLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  xpText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textLight },
  xpTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  xpFill: { height: 6, borderRadius: 3 },
  xpSub: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  // Body
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 100 },
  // Stats
  statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statTile: {
    flex: 1, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center',
    backgroundColor: COLORS.surface, borderTopWidth: 3, ...SHADOWS.soft,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs },
  statNumber: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  statTitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  // Status card
  statusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.lg, borderLeftWidth: 3, borderLeftColor: COLORS.success, ...SHADOWS.soft,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: SPACING.md },
  statusContent: { flex: 1 },
  statusHeading: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  statusDescription: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  statusBadge: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  // Quick actions
  sectionTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickActionCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.soft,
  },
  quickActionIcon: {
    width: 52, height: 52, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  quickActionLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  // Tip card
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(232,114,28,0.2)',
  },
  tipTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.accentDark, marginBottom: 4 },
  tipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 18 },
  // Admin btn
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 0.5, borderColor: COLORS.accentSoft, ...SHADOWS.soft,
  },
  adminBtnIcon: {
    width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  adminBtnContent: { flex: 1 },
  adminBtnTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  adminBtnSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  // Logout
  logoutBtn: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    paddingVertical: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: COLORS.errorSoft, ...SHADOWS.soft,
  },
  logoutLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.error },
});
