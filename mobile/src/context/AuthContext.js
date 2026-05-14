import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../services/firebase';
import { AppState } from 'react-native';
import {
  registerForPushNotifications,
  registerTokenWithBackend,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '../services/pushNotifications';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = '@mentoria_user';
const SESSION_TIMESTAMP_KEY = '@mentoria_session_ts';
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]); // Array of user IDs online
  const [lastSeenUsers, setLastSeenUsers] = useState({}); // { userId: ISO timestamp }
  const inactivityTimer = useRef(null);
  const notifReceivedSub = useRef(null);
  const notifResponseSub = useRef(null);

  useEffect(() => {
    restoreSession();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up notification listeners
    notifReceivedSub.current = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    notifResponseSub.current = addNotificationResponseListener((response) => {
      console.log('Notification tapped:', response);
      // Could navigate to specific screen based on notification data here
    });

    return () => {
      subscription.remove();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (notifReceivedSub.current) notifReceivedSub.current.remove();
      if (notifResponseSub.current) notifResponseSub.current.remove();
    };
  }, []);

  useEffect(() => {
    import('../services/websocket').then(({ wsService }) => {
      if (user) {
        wsService.connect(user.id);

        const onUserOnline = (data) => {
          setOnlineUsers(prev => prev.includes(data.user_id) ? prev : [...prev, data.user_id]);
        };
        const onUserOffline = (data) => {
          setOnlineUsers(prev => prev.filter(id => id !== data.user_id));
          // Guardar timestamp de última conexión
          const ts = data.last_seen_at || new Date().toISOString();
          setLastSeenUsers(prev => ({ ...prev, [data.user_id]: ts }));
        };
        const onPresenceSync = (data) => {
          setOnlineUsers(data.online_users || []);
        };

        wsService.on('user_online', onUserOnline);
        wsService.on('user_offline', onUserOffline);
        wsService.on('presence_sync', onPresenceSync);

        return () => {
          wsService.off('user_online', onUserOnline);
          wsService.off('user_offline', onUserOffline);
          wsService.off('presence_sync', onPresenceSync);
          wsService.disconnect();
        };
      } else {
        wsService.disconnect();
        setOnlineUsers([]);
      }
    });
  }, [user]);

  const handleAppStateChange = async (nextState) => {
    if (nextState === 'active') {
      // Verificar si la sesión expiró mientras la app estaba en background
      const ts = await AsyncStorage.getItem(SESSION_TIMESTAMP_KEY);
      if (ts && Date.now() - parseInt(ts) > SESSION_TIMEOUT_MS) {
        await signOut();
        return;
      }
      resetInactivityTimer();
    } else if (nextState === 'background') {
      // Guardar timestamp cuando la app va a background
      await AsyncStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      signOut();
    }, SESSION_TIMEOUT_MS);
  };

  const restoreSession = async () => {
    try {
      const ts = await AsyncStorage.getItem(SESSION_TIMESTAMP_KEY);
      if (ts && Date.now() - parseInt(ts) > SESSION_TIMEOUT_MS) {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        await AsyncStorage.removeItem(SESSION_TIMESTAMP_KEY);
        setIsLoading(false);
        return;
      }

      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        resetInactivityTimer();

        // Re-register push token on session restore
        setupPushNotifications(userData.id);
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupPushNotifications = async (userId) => {
    try {
      const fcmToken = await registerForPushNotifications();
      if (fcmToken) {
        await registerTokenWithBackend(userId, fcmToken);
      }
    } catch (err) {
      console.error('Error setting up push notifications:', err);
    }
  };

  const signIn = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    await AsyncStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    resetInactivityTimer();

    // Register push notifications after login
    setupPushNotifications(userData.id);
  };

  const signOut = async () => {
    try {
      // Cerrar sesión en Google (fuerza selector de cuentas la próxima vez)
      await GoogleSignin.signOut();
    } catch (e) {
      console.log('Google sign out error (non-critical):', e);
    }
    try {
      // Cerrar sesión en Firebase
      await auth.signOut();
    } catch (e) {
      console.log('Firebase sign out error (non-critical):', e);
    }
    // Limpiar datos locales
    setUser(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    await AsyncStorage.removeItem(SESSION_TIMESTAMP_KEY);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  const onUserActivity = () => {
    if (user) {
      AsyncStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      resetInactivityTimer();
    }
  };

  return (
    <AuthContext.Provider value={{ user, onlineUsers, lastSeenUsers, isLoading, signIn, signOut, onUserActivity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
