import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API } from '../config/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API.BASE_URL}/api/v1/notifications/${user.id}`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API.BASE_URL}/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marcando como leída:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'doubt': return 'help-circle-outline';
      case 'comment': return 'chatbubble-outline';
      case 'help': return 'hand-left-outline';
      case 'system': return 'megaphone-outline';
      default: return 'notifications-outline';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'doubt': return COLORS.accent;
      case 'comment': return COLORS.primary;
      case 'help': return COLORS.success;
      case 'system': return COLORS.info;
      default: return COLORS.textMuted;
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotification = ({ item, index }) => {
    const iconColor = item.is_read ? COLORS.textMuted : getIconColor(item.notification_type);
    return (
      <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
        <TouchableOpacity
          style={[styles.card, !item.is_read && styles.cardUnread]}
          onPress={() => markAsRead(item.id)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconContainer, { backgroundColor: !item.is_read ? `${iconColor}15` : COLORS.background }]}>
            <Ionicons
              name={getIcon(item.notification_type)}
              size={22}
              color={iconColor}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, !item.is_read && styles.titleUnread]}>{item.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
            <Text style={styles.time}>{getTimeAgo(item.created_at)}</Text>
          </View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} sin leer</Text>
          )}
        </View>
        <View style={styles.headerIconCircle}>
          <Ionicons name="notifications" size={22} color={COLORS.primary} />
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={renderNotification}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadNotifications(); }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="notifications-off-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyText}>Todo tranquilo</Text>
            <Text style={styles.emptySub}>Cuando alguien interactúe contigo, recibirás un aviso aquí.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 20, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg,
    ...SHADOWS.medium,
    marginBottom: SPACING.sm,
  },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textLight, letterSpacing: -0.5 },
  headerSub: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' },
  headerIconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  listContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    ...SHADOWS.soft,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  iconContainer: {
    width: 46, height: 46, borderRadius: RADIUS.sm, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  textContainer: { flex: 1 },
  title: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  titleUnread: { fontWeight: '700', color: COLORS.textPrimary },
  body: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 4 },
  time: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent, marginLeft: SPACING.sm },
  emptyWrap: { alignItems: 'center', paddingTop: 100, paddingHorizontal: SPACING.xl },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  emptyText: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
