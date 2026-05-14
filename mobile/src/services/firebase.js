import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { Platform } from 'react-native';
import { FIREBASE_CONFIG } from '../config/api';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);

let auth;

if (Platform.OS === 'web') {
  // On web: getAuth() uses browser localStorage automatically
  auth = getAuth(app);
} else {
  // On native (Android/iOS): use AsyncStorage for persistence
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { app, auth };
