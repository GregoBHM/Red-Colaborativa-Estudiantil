import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView,
  ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API } from '../config/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function CompleteProfileScreen() {
  const { user, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedCareer, setSelectedCareer] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [careers, setCareers] = useState([]);
  const [loadingCareers, setLoadingCareers] = useState(true);
  const [showCareerModal, setShowCareerModal] = useState(false);

  // Extraer código de estudiante del correo automáticamente (solo números)
  const studentCode = useMemo(() => {
    if (!user?.email) return '';
    const parts = user.email.split('@');
    const localPart = parts[0] || '';
    // Extraer solo los números (ej. gh2022073898 -> 2022073898)
    return localPart.replace(/\D/g, '');
  }, [user?.email]);

  // Cargar carreras desde la API
  useEffect(() => {
    const fetchCareers = async () => {
      try {
        const res = await fetch(`${API.BASE_URL}/api/v1/careers`);
        if (res.ok) {
          const data = await res.json();
          setCareers(data);
        }
      } catch (err) {
        console.error('Error cargando carreras:', err);
      } finally {
        setLoadingCareers(false);
      }
    };
    fetchCareers();
  }, []);

  // Filtrar carreras por búsqueda
  const filteredCareers = useMemo(() => {
    if (!searchQuery.trim()) return careers;
    const q = searchQuery.toLowerCase();
    return careers.filter(c => c.name.toLowerCase().includes(q));
  }, [searchQuery, careers]);

  // Agrupar por facultad
  const groupedCareers = useMemo(() => {
    const groups = {};
    filteredCareers.forEach(c => {
      if (!groups[c.faculty]) groups[c.faculty] = [];
      groups[c.faculty].push(c);
    });
    return groups;
  }, [filteredCareers]);

  const handleSave = async () => {
    if (!selectedCareer) {
      Alert.alert('Carrera requerida', 'Por favor selecciona tu carrera académica.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API.BASE_URL}/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          career: selectedCareer,
          student_code: studentCode,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const updated = await res.json();
      // Actualizar sesión local con los nuevos datos
      await signIn({ ...user, ...updated });
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.headerIconWrap}>
          <Ionicons name="person-add" size={36} color={COLORS.textLight} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.headerTitle}>
          Completa tu Perfil
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.headerSub}>
          Necesitamos algunos datos adicionales para tu experiencia en RCE UPT.
        </Animated.Text>
      </View>

      {/* Form */}
      <Animated.View entering={FadeInUp.delay(300).duration(600)} style={[styles.formSection, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Código de Estudiante (read-only, extraído del email) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Código de Estudiante</Text>
            <View style={styles.readOnlyField}>
              <Ionicons name="school-outline" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={styles.readOnlyText}>{studentCode || 'No disponible'}</Text>
              <View style={styles.autoTag}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} style={{ marginRight: 3 }} />
                <Text style={styles.autoTagText}>Automático</Text>
              </View>
            </View>
            <Text style={styles.fieldHint}>
              Extraído de tu correo: {user?.email || ''}
            </Text>
          </View>

          {/* Carrera Académica */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Carrera Académica</Text>
            
            <TouchableOpacity 
              style={styles.selectButton} 
              onPress={() => setShowCareerModal(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="business-outline" size={18} color={selectedCareer ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 10 }} />
                <Text style={[styles.selectButtonText, !selectedCareer && { color: COLORS.textMuted }]}>
                  {selectedCareer || 'Selecciona tu carrera...'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Botón Guardar */}
          <TouchableOpacity
            style={[styles.saveBtn, (!selectedCareer || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!selectedCareer || saving}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={20} color={COLORS.textLight} style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>
              {saving ? 'Guardando...' : 'Completar Registro'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Estos datos nos ayudan a conectarte con estudiantes de tu misma carrera.
          </Text>
        </ScrollView>
      </Animated.View>

      {/* Career Select Modal */}
      <Modal visible={showCareerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Elige tu Carrera</Text>
              <TouchableOpacity onPress={() => setShowCareerModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar carrera..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {loadingCareers ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Cargando carreras...</Text>
                </View>
              ) : (
                Object.keys(groupedCareers).map(faculty => (
                  <View key={faculty} style={styles.facultyGroup}>
                    <Text style={styles.facultyLabel}>{faculty}</Text>
                    {groupedCareers[faculty].map((career) => {
                      const isSelected = selectedCareer === career.name;
                      return (
                        <TouchableOpacity
                          key={career.id}
                          style={[styles.careerListItem, isSelected && styles.careerListItemSelected]}
                          onPress={() => {
                            setSelectedCareer(career.name);
                            setShowCareerModal(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.careerListText, isSelected && styles.careerListTextSelected]}>
                            {career.name}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },

  // Header
  header: {
    paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl,
    overflow: 'hidden', position: 'relative',
  },
  decorCircle1: {
    position: 'absolute', top: -40, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -20, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerIconWrap: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md, ...SHADOWS.large,
  },
  headerTitle: {
    fontSize: FONTS.sizes.hero, fontWeight: '800', color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  headerSub: {
    fontSize: FONTS.sizes.md, color: 'rgba(255,255,255,0.75)', lineHeight: 22,
  },

  // Form
  formSection: {
    flex: 1, backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl,
    ...SHADOWS.large,
  },
  fieldGroup: { marginBottom: SPACING.xl },
  fieldLabel: {
    fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm,
  },
  readOnlyField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  readOnlyText: {
    flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary,
  },
  autoTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.successSoft, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  autoTagText: { fontSize: 10, fontWeight: '700', color: COLORS.success },
  fieldHint: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: SPACING.xs,
  },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, padding: 0,
  },

  // Loading
  loadingWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginLeft: SPACING.sm,
  },

  // Faculty groups
  facultyGroup: { marginBottom: SPACING.md },
  facultyLabel: {
    fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary,
    marginBottom: SPACING.xs, letterSpacing: 0.3,
  },

  // Career chips
  careersGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  careerChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: RADIUS.full, backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  careerChipSelected: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  careerChipText: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600',
  },
  careerChipTextSelected: { color: COLORS.textLight },

  footerNote: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    textAlign: 'center', marginTop: SPACING.lg, marginBottom: SPACING.md,
    lineHeight: 18,
  },

  // Select Button
  selectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  selectButtonText: {
    fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, maxHeight: '80%', ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg,
  },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  modalCloseBtn: { padding: 4 },
  modalList: { marginTop: SPACING.sm },
  careerListItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  careerListItemSelected: {
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, borderBottomWidth: 0,
  },
  careerListText: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary },
  careerListTextSelected: { fontWeight: '700', color: COLORS.primary },
});
