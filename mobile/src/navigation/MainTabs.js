import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FeedScreen from '../screens/FeedScreen';
import ChatListScreen from '../screens/ChatListScreen';
import PostScreen from '../screens/PostScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Feed:          { label: 'Inicio',   icon: 'home',            iconOutline: 'home-outline' },
  Chats:         { label: 'Chats',    icon: 'chatbubbles',     iconOutline: 'chatbubbles-outline' },
  Post:          { label: 'Publicar', icon: 'add',             iconOutline: 'add' },
  Notifications: { label: 'Avisos',   icon: 'notifications',   iconOutline: 'notifications-outline' },
  Profile:       { label: 'Perfil',   icon: 'person',          iconOutline: 'person-outline' },
};

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          ...styles.tabBar,
          height: 62 + Math.max(insets.bottom, 6),
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color }) => {
          const cfg = TAB_CONFIG[route.name];
          if (route.name === 'Post') {
            return (
              <View style={styles.postBtn}>
                <Ionicons name="add" size={28} color={COLORS.textLight} />
              </View>
            );
          }
          return (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? cfg.icon : cfg.iconOutline}
                size={22}
                color={color}
              />
            </View>
          );
        },
        tabBarLabel: ({ focused, color }) => {
          const cfg = TAB_CONFIG[route.name];
          if (route.name === 'Post') return null;
          return (
            <Text style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]} numberOfLines={1}>
              {cfg.label}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Post" component={PostScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBarBg,
    borderTopWidth: 0,
    paddingTop: 8,
    elevation: 0,
    shadowColor: '#0A3D6B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  activeIconWrap: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  postBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
});
