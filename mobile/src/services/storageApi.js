import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

/**
 * Converts a local file URI (file://...) to a Blob using XMLHttpRequest.
 * This is the reliable method for React Native / Expo environments,
 * as the standard fetch() API is not guaranteed to work with local file URIs.
 * @param {string} uri - The local file URI from expo-image-picker
 * @returns {Promise<Blob>}
 */
function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

/**
 * Upload an image to Firebase Storage and return the download URL.
 * @param {object} imageAsset - Image asset from expo-image-picker (must have .uri)
 * @param {string} folder - Storage folder path (e.g. 'doubts')
 * @param {number} userId - User ID for unique naming
 * @returns {Promise<string>} The public download URL of the uploaded image
 */
export async function uploadImage(imageAsset, folder = 'doubts', userId = 0) {
  if (!imageAsset?.uri) throw new Error('No image provided');

  const timestamp = Date.now();
  const extension = (imageAsset.uri.split('.').pop() || 'jpg').split('?')[0];
  const fileName = `${folder}/${userId}_${timestamp}.${extension}`;
  const storageRef = ref(storage, fileName);

  // Convert local URI to Blob via XMLHttpRequest (reliable in React Native)
  const blob = await uriToBlob(imageAsset.uri);

  // Upload the blob to Firebase Storage
  await uploadBytes(storageRef, blob);

  // Get the public download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
