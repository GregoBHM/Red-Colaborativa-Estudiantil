import { API } from '../config/api';

export async function fetchFeed(subjectId = null, userId = null) {
  let url = API.ENDPOINTS.DOUBTS_FEED;
  const params = [];
  if (subjectId) params.push(`subject_id=${subjectId}`);
  if (userId) params.push(`user_id=${userId}`);
  if (params.length) url += `?${params.join('&')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al cargar el feed');
  }
  return await response.json();
}

export async function createDoubt(authorId, doubtData) {
  const response = await fetch(`${API.ENDPOINTS.DOUBTS_CREATE}?author_id=${authorId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doubtData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al publicar la duda');
  }
  return await response.json();
}

export async function resolveDoubt(doubtId, resolveData) {
  const response = await fetch(API.ENDPOINTS.DOUBT_RESOLVE(doubtId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolveData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al resolver la duda');
  }
  return await response.json();
}

export async function fetchSubjects() {
  const response = await fetch(API.ENDPOINTS.SUBJECTS);
  if (!response.ok) {
    throw new Error('Error al cargar materias');
  }
  return await response.json();
}

export async function deleteDoubt(doubtId, userId) {
  const response = await fetch(`${API.BASE_URL}/api/v1/doubts/${doubtId}?user_id=${userId}`, {
    method: 'DELETE',
  });
  if (response.status === 204) return true;
  if (!response.ok) {
    const text = await response.text();
    let errorMsg = 'Error al eliminar la duda';
    try { const err = JSON.parse(text); errorMsg = err.detail || errorMsg; } catch(e){}
    throw new Error(errorMsg);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : true;
}

export async function toggleLikeDoubt(doubtId, userId) {
  const response = await fetch(`${API.BASE_URL}/api/v1/doubts/${doubtId}/like?user_id=${userId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Error al dar like');
  }
  return await response.json();
}

export async function searchDoubts(query, filters = {}) {
  const params = [`q=${encodeURIComponent(query)}`];
  if (filters.subjectId) params.push(`subject_id=${filters.subjectId}`);
  if (filters.status) params.push(`status_filter=${filters.status}`);
  if (filters.sort) params.push(`sort=${filters.sort}`);
  const url = `${API.ENDPOINTS.DOUBTS_SEARCH}?${params.join('&')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al buscar');
  }
  return await response.json();
}

export async function editDoubt(doubtId, userId, data) {
  const response = await fetch(`${API.ENDPOINTS.DOUBT_EDIT(doubtId)}?user_id=${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al editar la duda');
  }
  return await response.json();
}
