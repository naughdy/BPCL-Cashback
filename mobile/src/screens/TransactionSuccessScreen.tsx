import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppDispatch } from '../store/hooks';
import { resetFlow } from '../store/flowSlice';
import type { ScreenProps } from '../navigation/types';

export function TransactionSuccessScreen({ route, navigation }: ScreenProps<'TransactionSuccess'>) {
  const { litres, cashbackGenerated } = route.params;
  const dispatch = useAppDispatch();

  function handleDone() {
    dispatch(resetFlow());
    navigation.reset({ index: 0, routes: [{ name: 'VehicleSearch' }] });
  }

  return (
    <Screen>
      <View style={styles.center}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.title}>Transaction Saved</Text>
        <Text style={styles.detail}>{litres} L recorded</Text>
        <Text style={styles.cashback}>₹{cashbackGenerated} total cashback generated</Text>
      </View>
      <AppButton label="Done" onPress={handleDone} testID="transaction-done" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  checkMark: {
    fontSize: 44,
    color: colors.success,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  detail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cashback: {
    ...typography.bodyBold,
    color: colors.success,
    marginTop: spacing.sm,
  },
});
