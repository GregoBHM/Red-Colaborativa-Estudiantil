import { API } from '../config/api';

export async function getComments(doubtId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/doubts/${doubtId}/comments`);
  if (!res.ok) throw new Error('Error al cargar comentarios');
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

export async function createComment(doubtId, authorId, content, imageUrl = null) {
  const res = await fetch(`${API.BASE_URL}/api/v1/doubts/${doubtId}/comments?author_id=${authorId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, image_url: imageUrl }),
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al comentar');
    throw new Error(errMsg);
  }
  return await res.json();
}

export async function toggleLikeComment(commentId, userId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/doubts/comments/${commentId}/like?user_id=${userId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Error al dar like');
  return await res.json();
}

export async function deleteComment(commentId, userId) {
  const res = await fetch(`${API.BASE_URL}/api/v1/doubts/comments/${commentId}?user_id=${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errMsg = await parseErrorResponse(res, 'Error al eliminar comentario');
    throw new Error(errMsg);
  }
  return await res.json();
}
