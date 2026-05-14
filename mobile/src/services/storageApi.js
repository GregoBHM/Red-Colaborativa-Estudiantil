import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

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
  const extension = imageAsset.uri.split('.').pop() || 'jpg';
  const fileName = `${folder}/${userId}_${timestamp}.${extension}`;
  const storageRef = ref(storage, fileName);

  // Fetch the image file and convert to blob
  const response = await fetch(imageAsset.uri);
  const blob = await response.blob();

  // Upload
  await uploadBytes(storageRef, blob);

  // Get the public download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
