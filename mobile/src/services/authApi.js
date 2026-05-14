import { API } from '../config/api';

/**
 * Send Firebase ID token to the backend for authentication.
 * Backend will verify the token, validate @virtual.upt.pe domain,
 * and create/update the user in PostgreSQL.
 */
export async function loginWithGoogle(idToken) {
  const response = await fetch(API.ENDPOINTS.GOOGLE_LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al iniciar sesión');
  }

  return await response.json();
}

/**
 * Get current user profile from backend.
 */
export async function getCurrentUser(firebaseUid) {
  const response = await fetch(`${API.ENDPOINTS.ME}?firebase_uid=${firebaseUid}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al obtener perfil');
  }

  return await response.json();
}
