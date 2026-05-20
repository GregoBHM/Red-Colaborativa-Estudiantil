import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  StatusBar, KeyboardAvoidingView, Platform, Alert, Image, Modal,
  Linking, ActionSheetIOS, Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { getChatMessages, sendMessage, closeChatRoom, scheduleSession, markMessagesRead, softDeleteMessage, createMeetLink, deleteMeetLink } from '../services/chatApi';
import { wsService } from '../services/websocket';
import LoadingOverlay from '../components/LoadingOverlay';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function ChatScreen({ route, navigation }) {
  const { room } = route.params;
  const { user, onlineUsers, lastSeenUsers } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [stars, setStars] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [closing, setClosing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [creatingMeet, setCreatingMeet] = useState(false);
  const [meetLink, setMeetLink] = useState(room.meet_link || null);
  
  // DateTimePicker state
  const [pickerDate, setPickerDate] = useState(new Date(Date.now() + 86400000)); // tomorrow
  const [pickerMode, setPickerMode] = useState('date');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerAction, setPickerAction] = useState('schedule'); // 'schedule' or 'meet'
  const flatListRef = useRef(null);

  const isMentor = user?.id === room.mentor_id;
  const isStudent = user?.id === room.student_id;
  const isClosed = room.status === 'closed';
  const otherName = isMentor ? room.student_name : room.mentor_name;
  const otherPhoto = isMentor ? room.student_photo : room.mentor_photo;
  const otherId = isMentor ? room.student_id : room.mentor_id;
  const isOnline = (onlineUsers || []).includes(otherId);

  // Calcula texto de última conexión en tiempo real
  const getLastSeenText = () => {
    if (isOnline) return 'En línea';
    if (isClosed) return 'Chat finalizado';
    const lastSeen = (lastSeenUsers || {})[otherId];
    if (!lastSeen) return 'Desconectado';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Últ. vez hace un momento';
    if (mins < 60) return `Últ. vez hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Últ. vez hace ${hours}h`;
    const date = new Date(lastSeen);
    return `Últ. vez ${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Actualizar el texto de última conexión cada 30s sin parpadeo
  const [, setTick] = useState(0);
  useEffect(() => {
    if (isOnline) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await getChatMessages(room.id);
      setMessages(data);
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    loadMessages();
    wsService.send({ action: 'join_room', room_id: room.id });

    const handleNewMessage = (data) => {
      if (data.chat_room_id === room.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleRoomClosed = (data) => {
      if (data.room_id === room.id) {
        Alert.alert('Chat cerrado', 'Esta sesión de ayuda ha finalizado.');
        navigation.goBack();
      }
    };

    const handleMeetCreated = (data) => {
      if (data.room_id === room.id) setMeetLink(data.meet_link);
    };

    wsService.on('new_message', handleNewMessage);
    wsService.on('room_closed', handleRoomClosed);
    wsService.on('meet_created', handleMeetCreated);

    // Marcar mensajes como leídos al abrir el chat
    if (user?.id) {
      markMessagesRead(room.id, user.id).catch(() => {});
      wsService.send({ action: 'mark_read', room_id: room.id, user_id: user.id });
    }

    // Escuchar cuando la otra persona lee nuestros mensajes
    const handleMessagesRead = (data) => {
      if (data.room_id === room.id && data.reader_id !== user?.id) {
        setMessages(prev => prev.map(m =>
          m.sender_id === user?.id && m.status !== 'read'
            ? { ...m, status: 'read' }
            : m
        ));
      }
    };

    const handleMessagesDelivered = (data) => {
      if (data.room_id === room.id && data.receiver_id !== user?.id) {
        setMessages(prev => prev.map(m =>
          m.sender_id === user?.id && m.status === 'sent'
            ? { ...m, status: 'delivered' }
            : m
        ));
      }
    };

    const handleMessageDeleted = (data) => {
      if (data.room_id === room.id) {
        setMessages(prev => prev.map(m =>
          m.id === data.message_id
            ? { ...m, is_deleted: true, content: 'Este mensaje fue eliminado' }
            : m
        ));
      }
    };

    wsService.on('messages_read', handleMessagesRead);
    wsService.on('messages_delivered', handleMessagesDelivered);
    wsService.on('message_deleted', handleMessageDeleted);

    return () => {
      wsService.send({ action: 'leave_room', room_id: room.id });
      wsService.off('new_message', handleNewMessage);
      wsService.off('room_closed', handleRoomClosed);
      wsService.off('meet_created', handleMeetCreated);
      wsService.off('messages_read', handleMessagesRead);
      wsService.off('messages_delivered', handleMessagesDelivered);
      wsService.off('message_deleted', handleMessageDeleted);
    };
  }, [room.id, loadMessages, navigation]);

  const handleSend = async () => {
    if (!text.trim() || isClosed) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage(room.id, user.id, content);
    } catch (err) {
      Alert.alert('Error', err.message);
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      const result = await closeChatRoom(room.id, stars, rateComment.trim() || null);
      Alert.alert(
        '¡Sesión finalizada!',
        `${result.xp_awarded} XP otorgados al mentor.\nNivel: ${result.mentor_level}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setClosing(false);
      setShowRateModal(false);
    }
  };

  const onDateTimeChange = async (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    const currentDate = selectedDate || pickerDate;
    setPickerDate(currentDate);

    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (pickerMode === 'date') {
        setTimeout(() => {
          setPickerMode('time');
          setShowPicker(true);
        }, 300);
      } else {
        // Time was selected on Android, process action
        processPickerAction(currentDate);
      }
    } else {
      // iOS
      setPickerDate(currentDate);
    }
  };

  const processPickerAction = async (finalDate) => {
    if (pickerAction === 'meet') {
      if (finalDate <= new Date()) {
        Alert.alert('Fecha pasada', 'La sesión debe ser en el futuro.');
        return;
      }
      setCreatingMeet(true);
      try {
        const data = await createMeetLink(room.id, user.id, finalDate.toISOString());
        setMeetLink(data.meet_link);
        Alert.alert('✅ Meet creado', 'El enlace de Jitsi Meet está listo para la fecha seleccionada. El estudiante fue notificado.');
      } catch (err) {
        Alert.alert('Error', err.message);
      } finally {
        setCreatingMeet(false);
      }
    }
  };

  const handleSchedule = async () => {
    if (pickerDate <= new Date()) {
      Alert.alert('Fecha pasada', 'La sesión debe ser en el futuro.');
      return;
    }

    setScheduling(true);
    try {
      await scheduleSession(room.id, pickerDate.toISOString());
      Alert.alert('✅ Listo', 'Sesión programada exitosamente. El estudiante fue notificado.');
      setShowScheduleModal(false);
      // Actualizar localmente para mostrar el botón de calendar
      room.scheduled_at = pickerDate.toISOString(); 
    } catch (err) {
      Alert.alert('Error', 'No se pudo programar la sesión.');
    } finally {
      setScheduling(false);
    }
  };

  const handleCreateMeet = () => {
    Alert.alert(
      '📹 Crear Jitsi Meet',
      '¿Cuándo quieres que inicie la reunión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Para AHORA', onPress: async () => {
            setCreatingMeet(true);
            try {
              const data = await createMeetLink(room.id, user.id);
              setMeetLink(data.meet_link);
              Alert.alert('✅ Meet creado', 'El enlace de Jitsi Meet está listo. El estudiante fue notificado.');
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setCreatingMeet(false);
            }
          },
        },
        {
          text: 'Elegir Fecha y Hora', onPress: () => {
            setPickerAction('meet');
            setPickerMode('date');
            setShowPicker(true);
          }
        }
      ],
    );
  };

  const openMeetLink = () => {
    if (!meetLink) return;
    Linking.openURL(meetLink).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace de Jitsi Meet.')
    );
  };

  const handleDeleteMeet = () => {
    Alert.alert(
      'Finalizar Meet',
      '¿Deseas eliminar este enlace de Meet? Esto te permitirá crear uno nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await deleteMeetLink(room.id, user.id);
            setMeetLink(null);
            Alert.alert('✅ Meet eliminado', 'El enlace anterior fue eliminado.');
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }}
      ]
    );
  };

  const addToGoogleCalendar = () => {
    if (!room.scheduled_at) return;
    const startDate = new Date(room.scheduled_at);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatStr = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const dates = `${formatStr(startDate)}/${formatStr(endDate)}`;
    const title = encodeURIComponent(`Mentoría RCE UPT con ${otherName}`);
    const details = encodeURIComponent('Sesión de mentoría académica agendada desde la app RCE UPT.');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el navegador.'));
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  const handleLongPressMessage = (item) => {
    if (item.is_deleted) return;
    const isMe = item.sender_id === user?.id;
    const options = ['Copiar texto'];
    if (isMe) options.push('Eliminar mensaje');
    options.push('Cancelar');
    const cancelIndex = options.length - 1;
    const destructiveIndex = isMe ? 1 : -1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        (i) => {
          if (i === 0) Clipboard.setString(item.content);
          if (i === 1 && isMe) confirmDeleteMessage(item.id);
        },
      );
    } else {
      // Android fallback
      const alertOptions = [
        { text: 'Copiar', onPress: () => Clipboard.setString(item.content) },
      ];
      if (isMe) {
        alertOptions.push({
          text: 'Eliminar', style: 'destructive',
          onPress: () => confirmDeleteMessage(item.id),
        });
      }
      alertOptions.push({ text: 'Cancelar', style: 'cancel' });
      Alert.alert('Opciones', null, alertOptions);
    }
  };

  const confirmDeleteMessage = (messageId) => {
    Alert.alert('Eliminar mensaje', '¿Eliminar este mensaje? Los demás ya no lo verán.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await softDeleteMessage(messageId, user.id);
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const getCheckmarkIcon = (status, isMe) => {
    if (!isMe) return null;
    switch (status) {
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color={COLORS.readReceipt} style={{ marginLeft: 4 }} />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />;
      default:
        return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />;
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === user?.id;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== item.sender_id);

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          showAvatar ? (
            item.sender_photo
              ? <Image source={{ uri: item.sender_photo }} style={styles.msgAvatar} />
              : <View style={styles.msgAvatarFallback}>
                  <Text style={styles.msgAvatarText}>{item.sender_name?.charAt(0) || '?'}</Text>
                </View>
          ) : <View style={styles.msgAvatarSpacer} />
        )}
        <TouchableOpacity
          style={[
            styles.msgBubble,
            isMe ? styles.msgBubbleMe : styles.msgBubbleOther,
            isMe ? styles.msgBubbleMeTail : styles.msgBubbleOtherTail,
            item.is_flagged && (isMe ? styles.msgBubbleMeFlagged : styles.msgBubbleOtherFlagged),
            item.is_deleted && styles.msgBubbleDeleted,
          ]}
          onLongPress={() => handleLongPressMessage(item)}
          activeOpacity={0.85}
          delayLongPress={300}
        >
          {item.is_deleted ? (
            <View style={styles.deletedRow}>
              <Ionicons name="ban-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.deletedText}>Este mensaje fue eliminado</Text>
            </View>
          ) : (
            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
          )}
          <View style={styles.msgFooter}>
            {item.is_flagged && !item.is_deleted && (
              <Ionicons name="warning" size={12} color={isMe ? '#FFD166' : COLORS.accent} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {getCheckmarkIcon(item.status, isMe)}
          </View>
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
      <LoadingOverlay visible={closing} message="Cerrando sesión..." />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatarContainer}>
            {otherPhoto ? (
              <Image source={{ uri: otherPhoto }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarText}>{otherName?.charAt(0) || '?'}</Text>
              </View>
            )}
            {/* Indicador de estado en línea real en el header */}
            {isOnline && <View style={styles.headerOnlineDot} />}
          </View>
          
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
            <Text style={styles.headerSub}>
              {getLastSeenText()} · {isMentor ? 'Estudiante' : 'Mentor'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {isMentor && !isClosed && (
            <TouchableOpacity onPress={() => setShowScheduleModal(true)} style={styles.headerActionBtn}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
          {isMentor && !isClosed && (
            <TouchableOpacity
              onPress={handleCreateMeet}
              style={[styles.headerActionBtn, { marginLeft: 6, backgroundColor: creatingMeet ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)' }]}
              disabled={creatingMeet}
            >
              <Ionicons name="videocam-outline" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Meet Banner */}
      {meetLink && (
        <View style={styles.meetBanner}>
          <TouchableOpacity style={styles.meetBannerInner} onPress={openMeetLink} activeOpacity={0.8}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam" size={24} color={COLORS.textLight} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.meetBannerTitle}>Jitsi Meet Activo</Text>
              <Text style={styles.meetBannerSub} numberOfLines={1}>{meetLink}</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
          </TouchableOpacity>
          {isMentor && (
            <TouchableOpacity onPress={handleDeleteMeet} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="trash-outline" size={22} color="#ff3b30" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Scheduled banner */}
      {room.scheduled_at && !meetLink && (
        <View style={styles.scheduleBanner}>
          <View style={styles.scheduleBannerLeft}>
            <Ionicons name="calendar" size={16} color={COLORS.primary} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.scheduleBannerTitle}>Sesión Programada</Text>
              <Text style={styles.scheduleBannerDate}>
                {new Date(room.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.googleCalendarBtn} onPress={addToGoogleCalendar} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.surface} style={{ marginRight: 4 }} />
            <Text style={styles.googleCalendarBtnText}>Añadir al calendario</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyChatTitle}>Comienza a interactuar</Text>
              <Text style={styles.emptyChatText}>
                {isMentor ? 'Escríbele al estudiante para coordinar la ayuda.' : 'Explica tu duda detalladamente al mentor.'}
              </Text>
            </View>
          )
        }
      />

      {/* Close button for student */}
      {isStudent && !isClosed && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowRateModal(true)}>
            <Ionicons name="checkmark-done" size={18} color={COLORS.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.closeBtnText}>Finalizar Ayuda y Calificar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Input */}
      {!isClosed ? (
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.closedBanner, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
          <Text style={styles.closedBannerText}>Esta conversación ha finalizado</Text>
        </View>
      )}

      {/* Rate Modal */}
      <Modal visible={showRateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Calificar al Mentor</Text>
            <Text style={styles.modalSub}>¿Qué tan útil fue la ayuda recibida?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => setStars(i)}>
                  <Ionicons
                    name={i <= stars ? 'star' : 'star-outline'}
                    size={36}
                    color={i <= stars ? COLORS.accent : COLORS.border}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.starsLabel}>{stars} de 5 estrellas</Text>
            <TextInput
              style={styles.rateInput}
              placeholder="Comentario opcional..."
              placeholderTextColor={COLORS.textMuted}
              value={rateComment}
              onChangeText={setRateComment}
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRateModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleClose}>
                <Ionicons name="checkmark" size={18} color={COLORS.textLight} style={{ marginRight: 4 }} />
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal visible={showScheduleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleIconBg}>
                <Ionicons name="calendar" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Programar Sesión</Text>
              <Text style={styles.modalSub}>
                Selecciona la fecha y hora para la mentoría.
              </Text>
            </View>

            <Text style={styles.scheduleLabel}>Fecha</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => { setPickerAction('schedule'); setPickerMode('date'); setShowPicker(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.pickerButtonText}>{formatDate(pickerDate)}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <Text style={styles.scheduleLabel}>Hora</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => { setPickerAction('schedule'); setPickerMode('time'); setShowPicker(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.pickerButtonText}>{formatTime(pickerDate)}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            {showPicker && pickerAction === 'schedule' && (
              <DateTimePicker
                value={pickerDate}
                mode={pickerMode}
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={onDateTimeChange}
                onBlur={() => { if (Platform.OS === 'ios') processPickerAction(pickerDate); }}
              />
            )}

            <View style={[styles.modalBtns, { marginTop: SPACING.xl }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowScheduleModal(false); setShowPicker(false); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, scheduling && { opacity: 0.6 }]}
                onPress={handleSchedule}
                disabled={scheduling}
              >
                <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} style={{ marginRight: 4 }} />
                <Text style={styles.confirmBtnText}>{scheduling ? 'Guardando...' : 'Programar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Meet Date Picker (Android/iOS standalone) */}
      {showPicker && pickerAction === 'meet' && (
        <DateTimePicker
          value={pickerDate}
          mode={pickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={onDateTimeChange}
          onBlur={() => { if (Platform.OS === 'ios') processPickerAction(pickerDate); }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface }, // Pure white background like Image 1
  // Header — Clean institutional style
  header: {
    flexDirection: 'row', alignItems: 'center', paddingBottom: 12,
    paddingHorizontal: SPACING.sm, backgroundColor: COLORS.primary,
  },
  backBtn: { padding: 6, marginRight: 2 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatarContainer: { position: 'relative', marginRight: SPACING.sm },
  headerAvatar: { width: 40, height: 40, borderRadius: RADIUS.full },
  headerAvatarFallback: {
    width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textLight },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.success, // Use standard success green, not a custom online green
    borderWidth: 2, borderColor: COLORS.primary,
  },
  headerTextWrap: { flex: 1 },
  headerName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textLight },
  headerSub: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  headerActions: { flexDirection: 'row', marginLeft: SPACING.xs },
  headerActionBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.full },
  
  // Schedule banner
  meetBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eef6ff', marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: '#cce4ff',
  },
  meetBannerInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
  },
  meetBannerTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  meetBannerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  scheduleBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.background, marginHorizontal: SPACING.sm, marginTop: SPACING.sm,
    padding: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 0.5, borderColor: COLORS.borderLight,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  scheduleBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  scheduleBannerTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  scheduleBannerDate: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  googleCalendarBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
  },
  googleCalendarBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  
  // Messages List
  messagesList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, flexGrow: 1 },
  
  // Bubbles — Institutional Modern
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: RADIUS.full, marginRight: 8, marginBottom: 2 },
  msgAvatarFallback: {
    width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2,
  },
  msgAvatarSpacer: { width: 36 },
  msgAvatarText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  msgBubble: { 
    maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
  },
  msgBubbleOther: { 
    backgroundColor: '#F5F6F8', // Very light greyish blue
    borderWidth: 0.5, borderColor: COLORS.borderLight,
  },
  msgBubbleMe: { backgroundColor: COLORS.primary },
  msgBubbleOtherTail: { borderBottomLeftRadius: 4 },
  msgBubbleMeTail: { borderBottomRightRadius: 4 },
  msgBubbleOtherFlagged: { backgroundColor: '#FFF2EB' },
  msgBubbleMeFlagged: { backgroundColor: COLORS.primaryDark },
  msgText: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, lineHeight: 20 },
  msgTextMe: { color: COLORS.textLight },
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  msgTime: { fontSize: 10, color: COLORS.textMuted },
  msgTimeMe: { color: 'rgba(255,255,255,0.65)' },
  msgBubbleDeleted: { backgroundColor: COLORS.borderLight, opacity: 0.7 },
  deletedRow: { flexDirection: 'row', alignItems: 'center' },
  deletedText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontStyle: 'italic' },
  
  // Empty
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyChatText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  
  // Close button
  closeBtn: {
    flexDirection: 'row', backgroundColor: COLORS.success, marginHorizontal: SPACING.md,
    paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md, ...SHADOWS.medium,
  },
  closeBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textLight },
  
  // Input — Matches DoubtDetailScreen comment input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.md, paddingTop: 10,
    backgroundColor: COLORS.surface, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight,
    gap: 8,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: SPACING.md,
    paddingVertical: 10, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, maxHeight: 100,
    borderWidth: 0.5, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.4 },
  
  // Closed banner
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, paddingVertical: 14, gap: 8,
    borderTopWidth: 0.5, borderTopColor: COLORS.borderLight,
  },
  closedBannerText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontWeight: '600' },
  
  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', ...SHADOWS.large,
  },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  modalSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.xl },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xs },
  starsLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg },
  rateInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md, paddingVertical: 14, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    height: 100, textAlignVertical: 'top', marginBottom: SPACING.xl,
  },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  modalCancelText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary,
  },
  confirmBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textLight },
  
  // Schedule Modal
  scheduleHeader: { alignItems: 'center', marginBottom: SPACING.xl },
  scheduleIconBg: {
    width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  scheduleLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.lg, paddingVertical: 16, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  pickerButtonText: {
    flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '600',
  },
});

