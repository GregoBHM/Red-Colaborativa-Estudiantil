import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import DoubtDetailScreen from '../screens/DoubtDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import MainTabs from './MainTabs';
import SplashTransition from '../components/SplashTransition';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (isLoading || !splashDone) {
    return (
      <SplashTransition onFinish={() => setSplashDone(true)} />
    );
  }

  // Verificar si el perfil está incompleto (carrera no especificada)
  const isProfileIncomplete = user && (!user.career || user.career === 'Sin especificar');

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 300,
        }}
      >
        {user ? (
          isProfileIncomplete ? (
            <Stack.Screen
              name="CompleteProfile"
              component={CompleteProfileScreen}
              options={{ animation: 'fade_from_bottom' }}
            />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboardScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="DoubtDetail"
                component={DoubtDetailScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="ChatRoom"
                component={ChatScreen}
                options={{ animation: 'slide_from_right' }}
              />
            </>
          )
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animation: 'fade_from_bottom' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

