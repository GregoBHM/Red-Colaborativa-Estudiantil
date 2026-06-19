import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  FlatList, TextInput, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { API } from '../config/api';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const adminId = user?.id;
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });
  const [wlEmail, setWlEmail] = useState('');
  const [wlRole, setWlRole] = useState('student');

  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes, wlRes] = await Promise.all([
        fetch(`${API.BASE_URL}/api/v1/admin/stats?admin_id=${adminId}`),
        fetch(`${API.BASE_URL}/api/v1/admin/users?admin_id=${adminId}`),
        fetch(`${API.BASE_URL}/api/v1/admin/whitelist?admin_id=${adminId}`),
      ]);
      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setWhitelist(await wlRes.json());
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleUserActive = async (userId) => {
    try {
      await fetch(`${API.BASE_URL}/api/v1/admin/users/${userId}/toggle-active?admin_id=${adminId}`, { method: 'PATCH' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      Alert.alert('Error', 'No se pudo cambiar el estado del usuario.');
    }
  };

  const toggleUserRole = async (userId) => {
    try {
      const res = await fetch(`${API.BASE_URL}/api/v1/admin/users/${userId}/toggle-role?admin_id=${adminId}`, { method: 'PATCH' });
      const data = await res.json();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: data.role } : u));
      Alert.alert('Rol actualizado', data.message);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cambiar el rol.');
    }
  };

  const sendAnnouncement = async () => {
    if (!announcement.title.trim() || !announcement.body.trim()) {
      Alert.alert('Campos requeridos', 'Escribe un título y un mensaje.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API.BASE_URL}/api/v1/admin/announcements?admin_id=${adminId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcement),
      });
      const data = await res.json();
      Alert.alert('Enviado', data.message);
      setAnnouncement({ title: '', body: '' });
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar el anuncio.');
    } finally {
      setSending(false);
    }
  };

  const addToWhitelist = async () => {
    if (!wlEmail.trim()) {
      Alert.alert('Campo requerido', 'Escribe un correo.');
      return;
    }
    try {
      const res = await fetch(`${API.BASE_URL}/api/v1/admin/whitelist?admin_id=${adminId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: wlEmail.trim(), role: wlRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      setWhitelist(prev => [data, ...prev]);
      setWlEmail('');
      Alert.alert('✅ Acceso concedido', `${data.email} puede acceder a la plataforma.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const removeFromWhitelist = (entry) => {
    Alert.alert('Eliminar acceso', `¿Revocar el acceso de ${entry.email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${API.BASE_URL}/api/v1/admin/whitelist/${entry.id}?admin_id=${adminId}`, { method: 'DELETE' });
            setWhitelist(prev => prev.filter(e => e.id !== entry.id));
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar.');
          }
        }
      },
    ]);
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
      <LoadingOverlay visible={sending} message="Enviando anuncio..." />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Administración</Text>
        <Ionicons name="shield-checkmark" size={22} color={COLORS.accent} />
      </View>

      <View style={styles.tabRow}>
        {['stats', 'users', 'whitelist', 'announce'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'stats' ? 'bar-chart-outline' : tab === 'users' ? 'people-outline' : tab === 'whitelist' ? 'key-outline' : 'megaphone-outline'}
              size={16}
              color={activeTab === tab ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'stats' ? 'Stats' : tab === 'users' ? 'Usuarios' : tab === 'whitelist' ? 'Accesos' : 'Anuncio'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'stats' && stats && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[COLORS.primary]} />}
        >
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsGrid}>
            <View style={[styles.statCard, { borderTopColor: COLORS.primary }]}>
              <View style={[styles.statIconBg, { backgroundColor: COLORS.primarySoft }]}>
                <Ionicons name="people" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{stats.active_users}</Text>
              <Text style={styles.statLabel}>Usuarios Activos</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: COLORS.accent }]}>
              <View style={[styles.statIconBg, { backgroundColor: COLORS.accentSoft }]}>
                <Ionicons name="help-circle" size={20} color={COLORS.accent} />
              </View>
              <Text style={styles.statValue}>{stats.open_doubts}</Text>
              <Text style={styles.statLabel}>Dudas Abiertas</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.statsGrid}>
            <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
              <View style={[styles.statIconBg, { backgroundColor: COLORS.successSoft }]}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{stats.resolved_doubts}</Text>
              <Text style={styles.statLabel}>Resueltas</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: COLORS.info }]}>
              <View style={[styles.statIconBg, { backgroundColor: COLORS.secondarySoft }]}>
                <Ionicons name="trending-up" size={20} color={COLORS.info} />
              </View>
              <Text style={styles.statValue}>{stats.resolution_rate}%</Text>
              <Text style={styles.statLabel}>Tasa Resolución</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen General</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total de usuarios registrados</Text>
              <Text style={styles.summaryValue}>{stats.total_users}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total de dudas publicadas</Text>
              <Text style={styles.summaryValue}>{stats.total_doubts}</Text>
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {activeTab === 'users' && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[COLORS.primary]} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInRight.delay(index * 60).duration(300)}>
              <View style={styles.userCard}>
                <View style={styles.userAvatarWrap}>
                  <Text style={styles.userAvatarText}>{item.display_name?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.display_name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.roleBadge, item.role === 'admin' && styles.roleBadgeAdmin]}>
                      <Text style={[styles.roleBadgeText, item.role === 'admin' && styles.roleBadgeTextAdmin]}>
                        {item.role === 'admin' ? 'Admin' : 'Estudiante'}
                      </Text>
                    </View>
                    <Text style={styles.xpText}>{item.xp_points} XP</Text>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.roleBtn}
                    onPress={() => toggleUserRole(item.id)}
                  >
                    <Ionicons
                      name={item.role === 'admin' ? 'shield' : 'shield-outline'}
                      size={18}
                      color={item.role === 'admin' ? COLORS.accent : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !item.is_active && styles.toggleBtnInactive]}
                    onPress={() => toggleUserActive(item.id)}
                  >
                    <Ionicons
                      name={item.is_active ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={item.is_active ? COLORS.success : COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        />
      )}

      {activeTab === 'whitelist' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.announceCard}>
            <View style={styles.announceIconRow}>
              <Ionicons name="key" size={24} color={COLORS.primary} />
              <Text style={styles.announceTitle}>Accesos Especiales</Text>
            </View>
            <Text style={styles.announceSub}>Agrega correos externos (profesores, invitados) para que puedan acceder sin código de estudiante.</Text>
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="profesor@ejemplo.com"
              placeholderTextColor={COLORS.textMuted}
              value={wlEmail}
              onChangeText={setWlEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>Tipo de Acceso</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
              {['student', 'admin'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, wlRole === r && styles.roleChipActive]}
                  onPress={() => setWlRole(r)}
                >
                  <Text style={[styles.roleChipText, wlRole === r && styles.roleChipTextActive]}>
                    {r === 'student' ? 'Invitado' : 'Administrador'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={addToWhitelist} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
              <Text style={styles.sendBtnText}>Conceder Acceso</Text>
            </TouchableOpacity>
          </Animated.View>

          {whitelist.length > 0 && (
            <View style={[styles.announceCard, { marginTop: SPACING.md }]}>
              <Text style={[styles.summaryTitle, { marginBottom: SPACING.sm }]}>Correos con Acceso</Text>
              {whitelist.map((entry, i) => (
                <View key={entry.id} style={[styles.summaryRow, i === whitelist.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryValue}>{entry.email}</Text>
                    <Text style={[styles.summaryLabel, { marginTop: 2 }]}>{entry.role === 'admin' ? 'Administrador' : 'Invitado'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFromWhitelist(entry)} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === 'announce' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.announceCard}>
            <View style={styles.announceIconRow}>
              <Ionicons name="megaphone" size={24} color={COLORS.accent} />
              <Text style={styles.announceTitle}>Enviar Anuncio Global</Text>
            </View>
            <Text style={styles.announceSub}>Se enviará como notificación a todos los usuarios activos.</Text>

            <Text style={styles.inputLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Mantenimiento programado"
              placeholderTextColor={COLORS.textMuted}
              value={announcement.title}
              onChangeText={(t) => setAnnouncement(prev => ({ ...prev, title: t }))}
            />

            <Text style={styles.inputLabel}>Mensaje</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Escribe el contenido del anuncio..."
              placeholderTextColor={COLORS.textMuted}
              value={announcement.body}
              onChangeText={(t) => setAnnouncement(prev => ({ ...prev, body: t }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.sendBtn} onPress={sendAnnouncement} activeOpacity={0.8}>
              <Ionicons name="send" size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
              <Text style={styles.sendBtnText}>Enviar a Todos</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 48, paddingBottom: 14, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.primary,
  },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textLight },
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  content: { padding: SPACING.md, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.md,
    alignItems: 'center', borderTopWidth: 3, ...SHADOWS.soft,
  },
  statIconBg: { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  statValue: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  summaryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.lg,
    marginTop: SPACING.sm, ...SHADOWS.soft,
  },
  summaryTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight },
  summaryLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.sm,
    borderWidth: 0.5, borderColor: COLORS.borderLight, ...SHADOWS.soft,
  },
  userAvatarWrap: {
    width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  userAvatarText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  userEmail: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 1 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  roleBadge: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  roleBadgeAdmin: { backgroundColor: COLORS.accentSoft },
  roleBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.primary },
  roleBadgeTextAdmin: { color: COLORS.accentDark },
  xpText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600' },
  toggleBtn: { padding: SPACING.xs },
  toggleBtnInactive: { opacity: 0.5 },
  userActions: { alignItems: 'center', gap: 4 },
  roleBtn: { padding: SPACING.xs },
  announceCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.lg, ...SHADOWS.soft,
  },
  announceIconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  announceTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  announceSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 20 },
  inputLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.xs, borderWidth: 0.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  textArea: { height: 100 },
  sendBtn: {
    flexDirection: 'row', backgroundColor: COLORS.accent, borderRadius: RADIUS.sm,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
    ...SHADOWS.medium,
  },
  sendBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textLight },
  roleChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.borderLight, backgroundColor: COLORS.background,
  },
  roleChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  roleChipText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  roleChipTextActive: { color: COLORS.primary },
});
