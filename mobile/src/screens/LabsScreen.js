import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getFreeLabs, getAllLabs, createLab, updateLab, deleteLab } from '../services/labsApi';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function LabsScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';

  const [labs, setLabs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState('20');
  const [formMessage, setFormMessage] = useState('');

  const loadLabs = useCallback(async () => {
    try {
      const data = isAdmin ? await getAllLabs(user.id) : await getFreeLabs();
      setLabs(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, [isAdmin, user?.id]);

  useEffect(() => { loadLabs(); }, [loadLabs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLabs();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormName('');
    setFormCapacity('20');
    setFormMessage('');
    setShowForm(true);
  };

  const openEdit = (lab) => {
    setEditTarget(lab);
    setFormName(lab.name);
    setFormCapacity(String(lab.capacity));
    setFormMessage(lab.status_message || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Campo requerido', 'El nombre del laboratorio es obligatorio.');
      return;
    }
    const payload = {
      name: formName.trim(),
      capacity: parseInt(formCapacity) || 20,
      status_message: formMessage.trim() || null,
    };
    try {
      if (editTarget) {
        await updateLab(user.id, editTarget.id, payload);
      } else {
        await createLab(user.id, payload);
      }
      setShowForm(false);
      loadLabs();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleToggleAvailability = async (lab) => {
    try {
      await updateLab(user.id, lab.id, { is_available: !lab.is_available });
      loadLabs();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = (lab) => {
    Alert.alert('Eliminar Laboratorio', `¿Eliminar "${lab.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await deleteLab(user.id, lab.id);
            loadLabs();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }
      },
    ]);
  };

  const renderLab = ({ item }) => (
    <View style={[styles.card, !item.is_available && styles.cardUnavailable]}>
      <View style={[styles.statusDot, { backgroundColor: item.is_available ? COLORS.success : COLORS.error }]} />
      <View style={styles.cardBody}>
        <Text style={styles.labName}>{item.name}</Text>
        <View style={styles.labMeta}>
          <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.labMetaText}>Capacidad: {item.capacity}</Text>
        </View>
        {item.status_message ? (
          <Text style={styles.labMessage}>{item.status_message}</Text>
        ) : null}
        <View style={[styles.badge, { backgroundColor: item.is_available ? COLORS.successSoft : COLORS.errorSoft }]}>
          <Text style={[styles.badgeText, { color: item.is_available ? COLORS.success : COLORS.error }]}>
            {item.is_available ? 'Disponible' : 'No disponible'}
          </Text>
        </View>
      </View>
      {isAdmin && (
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => handleToggleAvailability(item)} style={styles.actionBtn}>
            <Ionicons name={item.is_available ? 'lock-closed-outline' : 'lock-open-outline'} size={20} color={item.is_available ? COLORS.error : COLORS.success} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laboratorios</Text>
        {isAdmin && (
          <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={labs}
        keyExtractor={item => item.id.toString()}
        renderItem={renderLab}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={52} color={COLORS.border} />
            <Text style={styles.emptyTitle}>
              {isAdmin ? 'No hay laboratorios aún' : 'No hay laboratorios disponibles'}
            </Text>
            <Text style={styles.emptyText}>
              {isAdmin ? 'Toca el botón + para agregar el primero.' : 'Revisa más tarde o contacta al administrador.'}
            </Text>
          </View>
        }
      />

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editTarget ? 'Editar Laboratorio' : 'Nuevo Laboratorio'}</Text>
            <Text style={styles.formLabel}>Nombre *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Lab L-302"
              placeholderTextColor={COLORS.textMuted}
              value={formName}
              onChangeText={setFormName}
            />
            <Text style={styles.formLabel}>Capacidad</Text>
            <TextInput
              style={styles.formInput}
              placeholder="20"
              placeholderTextColor={COLORS.textMuted}
              value={formCapacity}
              onChangeText={setFormCapacity}
              keyboardType="numeric"
            />
            <Text style={styles.formLabel}>Mensaje (opcional)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Solo para prácticas de programación"
              placeholderTextColor={COLORS.textMuted}
              value={formMessage}
              onChangeText={setFormMessage}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editTarget ? 'Guardar' : 'Crear'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, paddingHorizontal: SPACING.md, backgroundColor: COLORS.primary,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textLight },
  addBtn: { padding: 4 },
  list: { padding: SPACING.md, paddingBottom: 80 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    ...SHADOWS.soft,
  },
  cardUnavailable: { opacity: 0.65 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm, alignSelf: 'flex-start', marginTop: 4 },
  cardBody: { flex: 1 },
  labName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  labMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  labMetaText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginLeft: 4 },
  labMessage: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full, marginTop: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, paddingHorizontal: SPACING.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: 40 },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  formLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.lg, gap: SPACING.sm },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.sm, backgroundColor: COLORS.background, alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { fontWeight: '700', color: COLORS.textLight },
});
