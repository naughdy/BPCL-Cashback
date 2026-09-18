import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { resetFlow, setActiveRedemptionId } from '../store/flowSlice';
import type { ScreenProps } from '../navigation/types';

export function RedemptionResultScreen({ route, navigation }: ScreenProps<'RedemptionResult'>) {
  const { success, failureReason } = route.params;
  const dispatch = useAppDispatch();
  const customer = useAppSelector((s) => s.flow.customer);

  function handleDone() {
    dispatch(resetFlow());
    navigation.reset({ index: 0, routes: [{ name: 'VehicleSearch' }] });
  }

  function handleTryAgain() {
    dispatch(setActiveRedemptionId(null));
    navigation.navigate('ExistingCustomer');
  }

  return (
    <Screen>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: success ? colors.successBg : colors.dangerBg }]}>
          <Text style={[styles.icon, { color: success ? colors.success : colors.danger }]}>{success ? '✓' : '✕'}</Text>
        </View>
        <Text style={styles.title}>{success ? 'Redemption Successful' : 'Redemption Failed'}</Text>
        {success ? (
          <Text style={styles.detail}>
            Cashback has been redeemed. New available balance: ₹{customer?.summary.availableCashback ?? '0.00'}
          </Text>
        ) : (
          <Text style={styles.detailFailure}>{failureReason ?? 'Something went wrong during redemption.'}</Text>
        )}
      </View>

      {success ? (
        <AppButton label="Done" onPress={handleDone} testID="redemption-done" />
      ) : (
        <>
          <AppButton label="Try Again" onPress={handleTryAgain} testID="redemption-retry" />
          <AppButton label="Back to Start" variant="secondary" onPress={handleDone} style={styles.secondaryButton} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  icon: { fontSize: 44 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  detail: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  detailFailure: { ...typography.body, color: colors.danger, textAlign: 'center' },
  secondaryButton: { marginTop: spacing.sm },
});
