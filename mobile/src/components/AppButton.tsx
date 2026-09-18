import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../theme/tokens';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function AppButton({ label, onPress, variant = 'primary', disabled, loading, style, testID }: AppButtonProps) {
  const isDisabled = disabled || loading;

  const backgroundColor = isDisabled
    ? colors.disabled
    : variant === 'primary'
    ? colors.bpclOrange
    : variant === 'danger'
    ? colors.danger
    : colors.surface;

  const textColor = variant === 'secondary' && !isDisabled ? colors.bpclBlue : '#FFFFFF';
  const borderColor = variant === 'secondary' ? colors.bpclBlue : 'transparent';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor, opacity: pressed && !isDisabled ? 0.85 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.button,
  },
});
