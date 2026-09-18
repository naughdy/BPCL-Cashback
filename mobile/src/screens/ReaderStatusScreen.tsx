import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen, ScreenTitle } from '../components/Screen';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCustomer } from '../store/flowSlice';
import { useProcessRedemptionReaderMutation } from '../api/bpclApi';
import type { ScreenProps } from '../navigation/types';

export function ReaderStatusScreen({ navigation }: ScreenProps<'ReaderStatus'>) {
  const dispatch = useAppDispatch();
  const redemptionId = useAppSelector((s) => s.flow.activeRedemptionId);
  const [processReader] = useProcessRedemptionReaderMutation();

  useEffect(() => {
    if (!redemptionId) return;
    let cancelled = false;
    processReader({ redemptionId })
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        dispatch(setCustomer(result.customer));
        navigation.replace('RedemptionResult', { success: true });
      })
      .catch((err: any) => {
        if (cancelled) return;
        const code = err?.data?.error?.code;
        const message =
          code === 'READER_TIMEOUT'
            ? 'The reader device timed out. No amount was deducted.'
            : err?.data?.error?.message ?? 'The reader transaction failed. No amount was deducted.';
        navigation.replace('RedemptionResult', { success: false, failureReason: message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redemptionId]);

  if (!redemptionId) {
    navigation.replace('VehicleSearch');
    return null;
  }

  return (
    <Screen>
      <ScreenTitle title="Reader" />
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.bpclOrange} />
        <Text style={styles.message}>Waiting for the cashback reader device…</Text>
        <Text style={styles.hint}>Please hold the reader steady until this completes.</Text>
      </View>
      <AppButton label="Cancel" variant="secondary" onPress={() => navigation.navigate('VehicleSearch')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
});
