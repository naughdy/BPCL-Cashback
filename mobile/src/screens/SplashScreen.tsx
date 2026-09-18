import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import type { ScreenProps } from '../navigation/types';

export function SplashScreen({ navigation }: ScreenProps<'Splash'>) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('VehicleSearch'), 900);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>BPCL</Text>
      </View>
      <Text style={styles.tagline}>Fuel Cashback</Text>
      <ActivityIndicator style={styles.spinner} color={colors.bpclOrange} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bpclBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    ...typography.h1,
    color: colors.bpclBlue,
  },
  tagline: {
    ...typography.h2,
    color: '#FFFFFF',
  },
  spinner: {
    marginTop: spacing.xl,
  },
});
