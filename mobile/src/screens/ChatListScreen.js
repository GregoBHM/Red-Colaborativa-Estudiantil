import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getChatRooms, hideChatRoom } from '../services/chatApi';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Alert } from 'react-native';

export default function ChatListScreen() {
  const { user, onlineUsers } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getChatRooms(user.id);
      setRooms(data);
    } catch (err) {
      console.error('Error cargando chats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const getOtherUser = (room) => {
    if (user.id === room.mentor_id) {
      return { id: room.student_id, name: room.student_name, photo: room.student_photo };
    }
    return { id: room.mentor_id, name: room.mentor_name, photo: room.mentor_photo };
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  };

  const renderRoom = ({ item, index }) => {
    const other = getOtherUser(item);
    const isMentor = user.id === item.mentor_id;
    const isClosed = item.status === 'closed';
    const isOnline = (onlineUsers || []).includes(other.id);
    const otherInitial = other.name?.charAt(0)?.toUpperCase() || '?';

    const handleLongPress = () => {
      Alert.alert(
        'Eliminar chat',
        '¿Deseas eliminar esta conversación de tu lista? No podrás ver el historial a menos que el otro usuario escriba de nuevo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Eliminar', 
            style: 'destructive',
            onPress: async () => {
              try {
                await hideChatRoom(item.id, user.id);
                setRooms(prev => prev.filter(r => r.id !== item.id));
              } catch (err) {
                Alert.alert('Error', err.message);
              }
            }
          }
        ]
      );
    };

    return (
      <Animated.View entering={FadeInRight.delay(index * 50).duration(250)}>
        <TouchableOpacity
          style={[styles.roomCard, isClosed && styles.roomCardClosed]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ChatRoom', { room: item })}
          onLongPress={handleLongPress}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {other.photo ? (
              <Image source={{ uri: other.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: isMentor ? COLORS.accentSoft : COLORS.primarySoft }]}>
                <Text style={[styles.avatarInitial, { color: isMentor ? COLORS.accentDark : COLORS.primary }]}>{otherInitial}</Text>
              </View>
            )}
            {isOnline && <View style={styles.onlineDot} />}
          </View>

          {/* Info */}
          <View style={styles.roomInfo}>
            <View style={styles.roomTopRow}>
              <Text style={styles.roomName} numberOfLines={1}>{other.name}</Text>
              <Text style={[styles.roomTime, !isClosed && item.last_message && { color: COLORS.primary, fontWeight: '700' }]}>
                {getTimeAgo(item.created_at)}
              </Text>
            </View>
            <Text style={styles.roomDoubt} numberOfLines={1}>{item.doubt_title}</Text>
            <View style={styles.roomBottomRow}>
              {item.last_message ? (
                <Text style={styles.roomLastMsg} numberOfLines={1}>
                  {item.last_message}
                </Text>
              ) : (
                <Text style={[styles.roomLastMsg, { fontStyle: 'italic' }]}>Escribe el primer mensaje...</Text>
              )}
              <View style={styles.roomBadges}>
                {isClosed ? (
                  <View style={[styles.badge, styles.badgeClosed]}>
                    <Text style={[styles.badgeText, styles.badgeTextClosed]}>Cerrado</Text>
                  </View>
                ) : isOnline ? (
                  <View style={[styles.badge, styles.badgeOnline]}>
                    <Text style={[styles.badgeText, styles.badgeOnlineText]}>En línea</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSeparator = () => <View style={styles.separator} />;

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

      {/* Header — slim, clean */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <View style={styles.iconCircle}>
          <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
        </View>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRoom}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRooms(); }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="chatbox-ellipses-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyText}>Sin conversaciones</Text>
            <Text style={styles.emptySub}>
              Ofrece ayuda en alguna duda del Feed para iniciar un chat privado.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  // Header — slim bar
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    ...SHADOWS.medium,
  },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textLight, letterSpacing: -0.5 },
  iconCircle: {
    width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  // List
  listContent: { paddingBottom: 100 },
  separator: { height: 0.5, backgroundColor: COLORS.borderLight, marginLeft: 80 },
  // Room card — WhatsApp-style row
  roomCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
  },
  roomCardClosed: { opacity: 0.55 },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: { width: 52, height: 52, borderRadius: RADIUS.full },
  avatarFallback: {
    width: 52, height: 52, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: FONTS.sizes.xl, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.onlineGreen,
    borderWidth: 2, borderColor: COLORS.surface,
  },
  roomInfo: { flex: 1 },
  roomTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  roomName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  roomTime: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  roomDoubt: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  roomBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomLastMsg: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flex: 1, marginRight: SPACING.sm },
  roomBadges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  badgeClosed: { backgroundColor: COLORS.borderLight },
  badgeTextClosed: { color: COLORS.textMuted },
  badgeOnline: { backgroundColor: COLORS.successSoft },
  badgeOnlineText: { color: COLORS.success },
  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 100, paddingHorizontal: SPACING.xl },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  emptyText: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
