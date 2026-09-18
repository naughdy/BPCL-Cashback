import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, ScreenTitle } from '../components/Screen';
import { AppButton } from '../components/AppButton';
import { AppTextField } from '../components/AppTextField';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActiveRedemptionId } from '../store/flowSlice';
import { useInitiateRedemptionMutation } from '../api/bpclApi';
import { generateIdempotencyKey } from '../lib/idempotency';
import type { ScreenProps } from '../navigation/types';

export function RedemptionScreen({ navigation }: ScreenProps<'Redemption'>) {
  const dispatch = useAppDispatch();
  const customer = useAppSelector((s) => s.flow.customer);
  const [initiateRedemption, { isLoading }] = useInitiateRedemptionMutation();
  const [error, setError] = useState<string | null>(null);

  // Defaults to the full available balance, but the operator can lower it —
  // the backend re-validates this against the live balance regardless.
  const [amount, setAmount] = useState(customer?.summary.availableCashback ?? '0.00');
  const [amountError, setAmountError] = useState<string | null>(null);

  if (!customer) {
    navigation.replace('VehicleSearch');
    return null;
  }

  const availableCashback = Number(customer.summary.availableCashback);

  function validateAmount(): boolean {
    const value = Number(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      setAmountError('Enter a valid amount greater than ₹0');
      return false;
    }
    if (value > availableCashback) {
      setAmountError(`Cannot exceed available cashback (₹${customer!.summary.availableCashback})`);
      return false;
    }
    setAmountError(null);
    return true;
  }

  async function handleConfirm() {
    setError(null);
    if (!validateAmount()) return;

    try {
      const redemption = await initiateRedemption({
        customerId: customer!.id,
        amount,
        idempotencyKey: generateIdempotencyKey('redemption'),
      }).unwrap();
      dispatch(setActiveRedemptionId(redemption.id));
      navigation.navigate('RedemptionOtp');
    } catch (err: any) {
      setError(err?.data?.error?.message ?? 'Could not start redemption. Please try again.');
    }
  }

  function handleRedeemFull() {
    setAmount(customer!.summary.availableCashback);
    setAmountError(null);
  }

  return (
    <Screen>
      <ScreenTitle title="Confirm Redemption" />

      <View style={styles.card}>
        <Row label="Vehicle Number" value={customer.vehicleNumber} />
        <Row label="Mobile Number" value={customer.mobileNumber} />
        <View style={styles.divider} />
        <Row label="Available Cashback" value={`₹${customer.summary.availableCashback}`} />
      </View>

      <AppTextField
        label="Redemption Amount"
        placeholder="Enter amount to redeem"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={(text) => {
          setAmount(text);
          if (amountError) setAmountError(null);
        }}
        error={amountError}
        testID="redemption-amount-input"
      />

      <Text onPress={handleRedeemFull} style={styles.fullAmountLink}>
        Redeem full available balance
      </Text>

      <Text style={styles.helper}>
        This amount will be redeemed for this vehicle and cannot be undone once completed.
      </Text>

      {error ? <Text style={styles.apiError}>{error}</Text> : null}

      <AppButton label="Confirm & Continue" onPress={handleConfirm} loading={isLoading} testID="confirm-redemption" />
      <AppButton
        label="Cancel"
        variant="secondary"
        onPress={() => navigation.goBack()}
        style={styles.cancelButton}
      />
    </Screen>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, emphasize && styles.emphasize]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: { ...typography.body, color: colors.textSecondary },
  value: { ...typography.bodyBold, color: colors.textPrimary },
  emphasize: { color: colors.success, fontSize: 22 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  fullAmountLink: {
    ...typography.caption,
    color: colors.bpclBlue,
    textDecorationLine: 'underline',
    marginBottom: spacing.md,
  },
  helper: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  apiError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
});
