import { API } from '../config/api';

export async function getFreeLabs() {
  const response = await fetch(`${API.BASE_URL}/api/v1/labs/free`);
  if (!response.ok) throw new Error('Error al cargar laboratorios');
  return response.json();
}

export async function getAllLabs(adminId) {
  const response = await fetch(`${API.BASE_URL}/api/v1/labs/?admin_id=${adminId}`);
  if (!response.ok) throw new Error('Error al cargar laboratorios');
  return response.json();
}

export async function createLab(adminId, data) {
  const response = await fetch(`${API.BASE_URL}/api/v1/labs/?admin_id=${adminId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Error al crear laboratorio');
  }
  return response.json();
}

export async function updateLab(adminId, labId, data) {
  const response = await fetch(`${API.BASE_URL}/api/v1/labs/${labId}?admin_id=${adminId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Error al actualizar laboratorio');
  }
  return response.json();
}

export async function deleteLab(adminId, labId) {
  const response = await fetch(`${API.BASE_URL}/api/v1/labs/${labId}?admin_id=${adminId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Error al eliminar laboratorio');
  }
  return response.json();
}
