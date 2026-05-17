import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, Alert, ScrollView, Switch, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { fetchSubjects, createDoubt } from '../services/doubtsApi';
import { uploadImage } from '../services/storageApi';
import LoadingOverlay from '../components/LoadingOverlay';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function PostScreen({ navigation }) {
  const { user, onUserActivity } = useAuth();
  const insets = useSafeAreaInsets();
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    subject_id: null, title: '', description: '', is_anonymous: false,
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Publicando tu duda...');

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    try {
      const data = await fetchSubjects();
      setSubjects(data);
    } catch (error) { console.error('Error loading subjects:', error); }
  };

  const hasUnsavedData = () => {
    return formData.title.trim() !== '' || formData.description.trim() !== '' || image !== null;
  };

  const handleCancel = () => {
    if (hasUnsavedData()) {
      Alert.alert(
        'Descartar publicación',
        '¿Seguro que quieres salir? Se perderán los datos ingresados.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Campos requeridos', 'El título de la duda es obligatorio.');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = null;
      if (image) {
        setLoadingMessage('Subiendo imagen...');
        imageUrl = await uploadImage(image, 'doubts', user.id);
      }
      setLoadingMessage('Publicando tu duda...');
      const doubtPayload = { ...formData, image_url: imageUrl };
      await createDoubt(user.id, doubtPayload);
      Alert.alert('¡Publicado!', 'Tu duda fue enviada correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'No se pudo publicar la duda. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setLoadingMessage('Publicando tu duda...');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <LoadingOverlay visible={loading} message={loadingMessage} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Duda</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !formData.title.trim()}
          style={[styles.publishBtn, (!formData.title.trim() || loading) && styles.publishBtnDisabled]}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={16} color={COLORS.textLight} style={{ marginRight: 4 }} />
          <Text style={styles.publishBtnText}>Publicar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} onTouchStart={onUserActivity} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.formCard}>
          {/* Author preview */}
          <View style={styles.authorPreview}>
            {user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarFb}>
                <Text style={styles.authorInitial}>{user?.display_name?.charAt(0) || '?'}</Text>
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{formData.is_anonymous ? 'Anónimo' : user?.display_name}</Text>
              <Text style={styles.authorSub}>Publicando en el Feed</Text>
            </View>
          </View>

          {/* Subject selector */}
          <Text style={styles.label}>Tema o Curso</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
            {subjects.map(sub => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subjectChip, formData.subject_id === sub.id && styles.subjectChipActive]}
                onPress={() => setFormData({ ...formData, subject_id: sub.id })}
              >
                <Text style={[styles.subjectChipText, formData.subject_id === sub.id && styles.subjectChipTextActive]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Title */}
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="¿Cuál es tu duda?"
            placeholderTextColor={COLORS.textMuted}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            maxLength={120}
          />
          <Text style={styles.charCount}>{formData.title.length}/120</Text>

          {/* Description */}
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Explica qué has intentado y dónde necesitas ayuda..."
            placeholderTextColor={COLORS.textMuted}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline numberOfLines={4} textAlignVertical="top"
          />

          {/* Anonymous toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Ionicons name="eye-off-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.switchLabel}>Publicar anónimamente</Text>
                <Text style={styles.switchSub}>Se ocultará tu nombre y foto</Text>
              </View>
            </View>
            <Switch
              value={formData.is_anonymous}
              onValueChange={(val) => setFormData({ ...formData, is_anonymous: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={formData.is_anonymous ? COLORS.primary : COLORS.surface}
            />
          </View>

          {/* Image picker */}
          <Text style={styles.label}>Imagen</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.imageIconBg}>
                  <Ionicons name="image-outline" size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.imageText}>Adjuntar una imagen</Text>
                <Text style={styles.imageSubtext}>JPG, PNG · Máx 5 MB</Text>
              </View>
            )}
          </TouchableOpacity>
          {image && (
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={16} color={COLORS.error} style={{ marginRight: 4 }} />
              <Text style={styles.removeImageText}>Quitar imagen</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 14, paddingHorizontal: SPACING.md, backgroundColor: COLORS.primary,
  },
  cancelBtn: { padding: 4 },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textLight },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md, paddingVertical: 9, borderRadius: RADIUS.full,
  },
  publishBtnDisabled: { opacity: 0.4 },
  publishBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textLight },
  scrollContent: { padding: SPACING.md, paddingBottom: 100 },
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.lg,
    ...SHADOWS.soft,
  },
  authorPreview: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight },
  authorAvatar: { width: 44, height: 44, borderRadius: RADIUS.full, marginRight: SPACING.sm },
  authorAvatarFb: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  authorInitial: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  authorName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  authorSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  subjectChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.borderLight, marginRight: SPACING.sm,
  },
  subjectChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subjectChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  subjectChipTextActive: { color: COLORS.textLight },
  input: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md, paddingVertical: 14, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
  },
  textArea: { height: 120 },
  charCount: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.lg, paddingVertical: SPACING.md, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight,
  },
  switchInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  switchSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  imagePicker: {
    height: 160, borderRadius: RADIUS.md, backgroundColor: COLORS.background,
    borderWidth: 2, borderColor: COLORS.borderLight, borderStyle: 'dashed',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  imagePlaceholder: { alignItems: 'center' },
  imageIconBg: {
    width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  imageText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  imageSubtext: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
    marginTop: SPACING.sm, paddingVertical: 4,
  },
  removeImageText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
