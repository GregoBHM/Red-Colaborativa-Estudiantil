import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  StatusBar, TextInput, Alert, FlatList,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { deleteDoubt, toggleLikeDoubt } from '../services/doubtsApi';
import { getComments, createComment, deleteComment, toggleLikeComment } from '../services/commentsApi';
import { createChatRoom } from '../services/chatApi';
import { uploadImage } from '../services/storageApi';
import LoadingOverlay from '../components/LoadingOverlay';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function DoubtDetailScreen({ route, navigation }) {
  const { doubt } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);
  const [liked, setLiked] = useState((doubt.liked_by || []).includes(user?.id));
  const [likesCount, setLikesCount] = useState(doubt.likes_count || 0);
  const isAuthor = user?.id === doubt.author_id;
  const isAdmin = user?.role === 'admin';

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const loadComments = useCallback(async () => {
    try {
      const data = await getComments(doubt.id);
      setComments(data);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
    }
  }, [doubt.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() && !commentImage) return;
    setSendingComment(true);
    try {
      let imageUrl = null;
      if (commentImage) {
        imageUrl = await uploadImage(commentImage, 'comments', user.id);
      }
      const created = await createComment(doubt.id, user.id, newComment.trim(), imageUrl);
      setComments(prev => [...prev, created]);
      setNewComment('');
      setCommentImage(null);
      Keyboard.dismiss();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert('Eliminar comentario', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await deleteComment(commentId, user.id);
            setComments(prev => prev.filter(c => c.id !== commentId));
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleLikeDoubt = async () => {
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    try {
      await toggleLikeDoubt(doubt.id, user.id);
    } catch (err) {
      setLiked(liked);
      setLikesCount(prev => liked ? prev + 1 : prev - 1);
    }
  };

  const handleLikeComment = async (commentId) => {
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      const isLiked = (c.liked_by || []).includes(user.id);
      return {
        ...c,
        liked_by: isLiked
          ? (c.liked_by || []).filter(id => id !== user.id)
          : [...(c.liked_by || []), user.id],
        likes_count: isLiked ? (c.likes_count || 1) - 1 : (c.likes_count || 0) + 1,
      };
    }));
    try {
      await toggleLikeComment(commentId, user.id);
    } catch (err) {
      loadComments();
    }
  };

  const handleDelete = () => {
    Alert.alert('Eliminar duda', '¿Estás seguro de que quieres eliminar esta duda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await deleteDoubt(doubt.id, user.id);
            Alert.alert('Eliminada', 'La duda fue eliminada.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleOfferHelp = async () => {
    setLoading(true);
    try {
      const room = await createChatRoom(doubt.id, user.id, doubt.author_id);
      navigation.replace('ChatRoom', { room });
    } catch (err) {
      Alert.alert('Info', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickCommentImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.6,
    });
    if (!result.canceled) setCommentImage(result.assets[0]);
  };

  const renderHeader = () => (
    <>
      {/* Doubt card */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
        <View style={styles.authorRow}>
          {doubt.author_photo ? (
            <Image source={{ uri: doubt.author_photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {doubt.author_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{doubt.author_name}</Text>
            <Text style={styles.timeText}>{getTimeAgo(doubt.created_at)}</Text>
          </View>
          {doubt.author_level && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{doubt.author_level}</Text>
            </View>
          )}
        </View>

        <View style={styles.tagsRow}>
          {doubt.subject_name && (
            <View style={styles.tag}>
              <Ionicons name="book-outline" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>{doubt.subject_name}</Text>
            </View>
          )}
          <View style={[styles.tag, styles.tagStatus]}>
            <View style={[styles.statusDot, { backgroundColor: doubt.status === 'open' ? COLORS.success : COLORS.textMuted }]} />
            <Text style={styles.tagText}>{doubt.status === 'open' ? 'Abierta' : 'Resuelta'}</Text>
          </View>
        </View>

        <Text style={styles.title}>{doubt.title}</Text>
        {doubt.description ? <Text style={styles.description}>{doubt.description}</Text> : null}
        {doubt.image_url && <Image source={{ uri: doubt.image_url }} style={styles.image} resizeMode="cover" />}

        {/* Like bar */}
        <View style={styles.likeBar}>
          <TouchableOpacity style={styles.likeBtn} onPress={handleLikeDoubt} activeOpacity={0.6}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? '#E04040' : COLORS.textSecondary}
            />
            <Text style={[styles.likeCount, liked && { color: '#E04040' }]}>
              {likesCount > 0 ? likesCount : ''}
            </Text>
          </TouchableOpacity>
          <View style={styles.commentCountWrap}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.likeCount}>{comments.length}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Action buttons */}
      {doubt.status === 'open' && !isAuthor && (
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.actionsRow}>
          <TouchableOpacity style={styles.offerBtn} onPress={handleOfferHelp} activeOpacity={0.8}>
            <Ionicons name="hand-left" size={18} color={COLORS.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.offerBtnText}>Ofrecer Ayuda</Text>
          </TouchableOpacity>
          <View style={styles.xpPreview}>
            <Ionicons name="flash-outline" size={14} color={COLORS.accent} />
            <Text style={styles.xpPreviewText}>50-100 XP</Text>
          </View>
        </Animated.View>
      )}

      {doubt.status === 'resolved' && (
        <View style={styles.resolvedBanner}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
          <Text style={styles.resolvedText}>Duda Resuelta</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Comentarios ({comments.length})
      </Text>
    </>
  );

  const renderComment = ({ item: c }) => {
    const isCommentLiked = (c.liked_by || []).includes(user?.id);
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          {c.author_photo ? (
            <Image source={{ uri: c.author_photo }} style={styles.commentAvatar} />
          ) : (
            <View style={styles.commentAvatarFb}>
              <Text style={styles.commentAvatarText}>{c.author_name?.charAt(0) || '?'}</Text>
            </View>
          )}
          <View style={styles.commentInfo}>
            <Text style={styles.commentAuthor}>{c.author_name}</Text>
            <Text style={styles.commentTime}>{getTimeAgo(c.created_at)}</Text>
          </View>
          {(c.author_id === user?.id || isAdmin) && (
            <TouchableOpacity onPress={() => handleDeleteComment(c.id)} style={{ padding: 4 }}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {c.content ? <Text style={styles.commentContent}>{c.content}</Text> : null}
        {c.image_url && (
          <Image source={{ uri: c.image_url }} style={styles.commentImage} resizeMode="cover" />
        )}
        <TouchableOpacity
          style={styles.commentLikeBtn}
          onPress={() => handleLikeComment(c.id)}
          activeOpacity={0.6}
        >
          <Ionicons
            name={isCommentLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={isCommentLiked ? '#E04040' : COLORS.textMuted}
          />
          {(c.likes_count || 0) > 0 && (
            <Text style={[styles.commentLikeCount, isCommentLiked && { color: '#E04040' }]}>
              {c.likes_count}
            </Text>
          )}
          <Text style={styles.commentLikeLabel}>Me gusta</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <LoadingOverlay visible={loading} message="Procesando..." />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Duda</Text>
        {(isAuthor || isAdmin) && (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        )}
        {!isAuthor && !isAdmin && <View style={{ width: 22 }} />}
      </View>

      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(c) => c.id.toString()}
        renderItem={renderComment}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.noComments}>
            <Text style={styles.noCommentsText}>Sé el primero en comentar</Text>
          </View>
        }
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Comment input - fixed at bottom */}
      <View style={[styles.commentInputArea, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {commentImage && (
          <View style={styles.commentImagePreviewRow}>
            <Image source={{ uri: commentImage.uri }} style={styles.commentImagePreview} />
            <TouchableOpacity onPress={() => setCommentImage(null)} style={styles.removeImgBtn}>
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.commentInputRow}>
          <TouchableOpacity onPress={pickCommentImage} style={styles.cameraBtn} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.commentInput}
            placeholder="Escribe un comentario..."
            placeholderTextColor={COLORS.textMuted}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.commentSendBtn, (!newComment.trim() && !commentImage) && { opacity: 0.4 }]}
            onPress={handleAddComment}
            disabled={(!newComment.trim() && !commentImage) || sendingComment}
          >
            <Ionicons name="send" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 14, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.primary,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textLight },
  bodyContent: { padding: SPACING.md, paddingBottom: 20 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.lg,
    borderWidth: 0.5, borderColor: COLORS.borderLight, ...SHADOWS.soft, marginBottom: SPACING.md,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.full },
  avatarFallback: {
    width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  authorInfo: { flex: 1, marginLeft: SPACING.sm },
  authorName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  timeText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  levelBadge: {
    backgroundColor: COLORS.accentSoft, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  levelText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.accentDark },
  tagsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  tag: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
  },
  tagText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.primary },
  tagStatus: { backgroundColor: COLORS.successSoft },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  description: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24 },
  image: { width: '100%', height: 220, borderRadius: RADIUS.xs, marginTop: SPACING.md },
  likeBar: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md,
    paddingTop: SPACING.sm, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight, gap: SPACING.lg,
  },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  commentCountWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg, alignItems: 'center' },
  offerBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium,
  },
  offerBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textLight },
  xpPreview: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentSoft,
    paddingHorizontal: SPACING.md, paddingVertical: 14, borderRadius: RADIUS.sm, gap: 4,
  },
  xpPreviewText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.accentDark },
  resolvedBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.successSoft,
    borderRadius: RADIUS.sm, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.success,
    marginBottom: SPACING.lg, gap: SPACING.sm,
  },
  resolvedText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  // Comments
  commentCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xs, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 0.5, borderColor: COLORS.borderLight,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  commentAvatar: { width: 32, height: 32, borderRadius: RADIUS.full },
  commentAvatarFb: {
    width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  commentInfo: { flex: 1, marginLeft: SPACING.xs },
  commentAuthor: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  commentTime: { fontSize: 10, color: COLORS.textMuted },
  commentContent: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  commentImage: { width: '100%', height: 160, borderRadius: RADIUS.xs, marginTop: SPACING.xs },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  commentLikeCount: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  commentLikeLabel: { fontSize: 12, color: COLORS.textMuted, marginLeft: 2 },
  noComments: { alignItems: 'center', paddingVertical: SPACING.lg },
  noCommentsText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  // Comment input area
  commentInputArea: {
    backgroundColor: COLORS.surface, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight,
    paddingTop: 6, paddingHorizontal: SPACING.sm,
  },
  commentImagePreviewRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm,
    paddingBottom: 6,
  },
  commentImagePreview: { width: 60, height: 60, borderRadius: RADIUS.xs },
  removeImgBtn: { marginLeft: 8 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
  },
  cameraBtn: { padding: 8 },
  commentInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: SPACING.md,
    paddingVertical: 10, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary,
    borderWidth: 0.5, borderColor: COLORS.border, maxHeight: 80,
  },
  commentSendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
