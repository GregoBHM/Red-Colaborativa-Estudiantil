import { API } from '../config/api';

export async function getChatRooms(userId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/user/${userId}`);
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al cargar chats');
    throw new Error(errMsg);
  }
  return await res.json();
}

async function parseErrorResponse(res, defaultMsg) {
  try {
    const text = await res.text();
    try {
      const err = JSON.parse(text);
      return err.detail || defaultMsg;
    } catch {
      return text || defaultMsg;
    }
  } catch (e) {
    return defaultMsg;
  }
}

export async function createChatRoom(doubtId, mentorId, studentId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doubt_id: doubtId, mentor_id: mentorId, student_id: studentId }),
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al crear sala');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function getChatMessages(roomId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/${roomId}/messages`);
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al cargar mensajes');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function sendMessage(roomId, senderId, content) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_id: senderId, content }),
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al enviar mensaje');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function scheduleSession(roomId, scheduledAt) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/${roomId}/schedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al programar sesión');
    throw new Error(errMsg);
  }
  return await res.json();
}

/**
 * Solicita al backend la creación de un enlace de Google Meet para la sala.
 * Solo puede hacerlo el mentor.
 * @param {number} roomId
 * @param {number} requesterId - ID del usuario que hace la petición (mentor)
 * @param {string} [startDt] - Fecha/hora de inicio opcional en formato ISO
 * @returns {{ meet_link, event_id, html_link, scheduled_at }}
 */
export async function createMeetLink(roomId, requesterId, startDt = null) {
  let url = `${API.BASE_URL}/api/v1/chat/rooms/${roomId}/meet?requester_id=${requesterId}`;
  if (startDt) {
    url += `&start_dt=${encodeURIComponent(startDt)}`;
  }
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al crear el Meet');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function deleteMeetLink(roomId, requesterId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/${roomId}/meet?requester_id=${requesterId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al eliminar Meet');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function closeChatRoom(roomId, stars, comment = null) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/${roomId}/close`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stars, comment }),
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al cerrar sala');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function markMessagesRead(roomId, userId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/${roomId}/messages/read?user_id=${userId}`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al marcar como leído');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function softDeleteMessage(messageId, userId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/messages/${messageId}?user_id=${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al eliminar mensaje');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function hideChatRoom(roomId, userId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/chat/rooms/${roomId}?user_id=${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al eliminar chat');
    throw new Error(errMsg);
  }
  return await res.json();
}
