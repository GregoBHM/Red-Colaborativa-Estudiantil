import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API } from '../config/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token.
 * Returns the FCM token string or null if permissions denied.
 */
export async function registerForPushNotifications() {
  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions denied');
      return null;
    }

    // Get the device push token (FCM for Android)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rce_main_channel', {
        name: 'RCE UPT Principal',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A3D6B',
        sound: 'default',
      });
    }

    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Register the FCM token with the backend for a specific user.
 */
export async function registerTokenWithBackend(userId, fcmToken) {
  if (!fcmToken || !userId) return;
  try {
    await fetch(`${API.BASE_URL}/api/v1/users/${userId}/fcm-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: fcmToken }),
    });
    console.log('FCM token registered with backend');
  } catch (error) {
    console.error('Error registering FCM token:', error);
  }
}

/**
 * Add a listener for when a notification is received while app is foregrounded.
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when user taps on a notification.
 */
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
