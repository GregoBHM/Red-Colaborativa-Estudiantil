import { API } from '../config/api';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

export async function uploadImage(imageAsset, folder = 'doubts') {
  if (!imageAsset?.uri) throw new Error('No image provided');

  const uri = imageAsset.uri;
  const filename = uri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}` : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type });

  const response = await fetch(`${API.ENDPOINTS.UPLOAD_IMAGE}?folder=${folder}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let detail = 'Error al subir imagen';
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const data = await response.json();
  return data.url;
}

export async function uploadFileToStorage(uri, storagePath, mimeType = 'application/octet-stream') {
  const xhr = await new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.onload = () => resolve(x.response);
    x.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    x.responseType = 'blob';
    x.open('GET', uri, true);
    x.send(null);
  });

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, xhr, { contentType: mimeType });
  return await getDownloadURL(storageRef);
}
