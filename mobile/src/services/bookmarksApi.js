import { API } from '../config/api';

export async function toggleBookmark(userId, doubtId) {
  const response = await fetch(
    `${API.BASE_URL}/api/v1/bookmarks/${doubtId}?user_id=${userId}`,
    { method: 'POST' }
  );
  if (!response.ok) throw new Error('Error al guardar duda');
  return response.json();
}

export async function getMyBookmarks(userId) {
  const response = await fetch(
    `${API.BASE_URL}/api/v1/bookmarks/?user_id=${userId}`
  );
  if (!response.ok) throw new Error('Error al cargar guardados');
  return response.json();
}

export async function getMyBookmarkIds(userId) {
  const response = await fetch(
    `${API.BASE_URL}/api/v1/bookmarks/ids?user_id=${userId}`
  );
  if (!response.ok) return { bookmark_ids: [] };
  return response.json();
}
