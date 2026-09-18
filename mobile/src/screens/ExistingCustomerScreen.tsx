import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import { Screen, ScreenTitle, StatusBanner } from '../components/Screen';
import { AppTextField } from '../components/AppTextField';
import { AppButton } from '../components/AppButton';
import { CustomerSummaryCard } from '../components/CustomerSummaryCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCustomer } from '../store/flowSlice';
import { useAddTransactionMutation } from '../api/bpclApi';
import { generateIdempotencyKey } from '../lib/idempotency';
import type { ScreenProps } from '../navigation/types';

const THRESHOLD_MESSAGE: Record<string, string> = {
  PETROL: 'Minimum 50 litres required for Petrol redemption.',
  DIESEL: 'Minimum 100 litres required for Diesel redemption.',
};

export function ExistingCustomerScreen({ navigation }: ScreenProps<'ExistingCustomer'>) {
  const dispatch = useAppDispatch();
  const customer = useAppSelector((s) => s.flow.customer);
  const [litres, setLitres] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [addTransaction, { isLoading, error }] = useAddTransactionMutation();

  if (!customer) {
    // Defensive guard — shouldn't happen given navigation flow.
    navigation.replace('VehicleSearch');
    return null;
  }

  async function handleAdd() {
    setFieldError(null);
    const value = Number(litres);
    if (!litres.trim() || Number.isNaN(value) || value <= 0) {
      setFieldError('Enter a valid number of litres (greater than 0)');
      return;
    }
    try {
      const result = await addTransaction({
        customerId: customer!.id,
        litres,
        idempotencyKey: generateIdempotencyKey('txn'),
      }).unwrap();
      dispatch(setCustomer(result.customer));
      setLitres('');
      navigation.navigate('TransactionSuccess', {
        litres,
        cashbackGenerated: result.customer.summary.cashbackGenerated,
      });
    } catch {
      // error surfaced below
    }
  }

  function handleRedeem() {
    navigation.navigate('Redemption');
  }

  const eligible = customer.summary.eligible && Number(customer.summary.availableCashback) > 0;

  return (
    <Screen>
      <ScreenTitle title="Existing Customer" />
      <CustomerSummaryCard customer={customer} />

      {!eligible && <StatusBanner tone="warning" message={THRESHOLD_MESSAGE[customer.fuelType]} />}

      <AppTextField
        label="Litres"
        placeholder="Enter litres purchased"
        keyboardType="decimal-pad"
        value={litres}
        onChangeText={setLitres}
        error={fieldError}
        testID="litres-input"
      />
      {error ? <Text style={styles.apiError}>Could not save this transaction. Please try again.</Text> : null}

      <View style={styles.buttonRow}>
        <AppButton label="ADD" onPress={handleAdd} loading={isLoading} style={styles.flexButton} testID="add-button" />
        <AppButton
          label="REDEEM"
          onPress={handleRedeem}
          variant="secondary"
          disabled={!eligible}
          style={styles.flexButton}
          testID="redeem-button"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  apiError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
