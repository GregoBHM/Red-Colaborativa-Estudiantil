import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function SplashTransition({ onFinish }) {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Secuencia: logo aparece → texto aparece → todo desaparece
    logoScale.value = withTiming(1, { duration: 500 });
    logoOpacity.value = withTiming(1, { duration: 500 });
    textOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    containerOpacity.value = withDelay(1800, withTiming(0, { duration: 400 }, () => {
      if (onFinish) runOnJS(onFinish)();
    }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <Animated.View style={[styles.logoCircle, logoStyle]}>
        <Ionicons name="school" size={48} color={COLORS.textLight} />
      </Animated.View>
      <Animated.Text style={[styles.title, textStyle]}>RCE UPT</Animated.Text>
      <Animated.Text style={[styles.subtitle, textStyle]}>Red Colaborativa Estudiantil</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.large,
  },
  title: {
    fontSize: FONTS.sizes.hero,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
});
