import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { colors, spacing, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { AppTextField } from '../components/AppTextField';
import { AppButton } from '../components/AppButton';
import { useSearchCustomerMutation } from '../api/bpclApi';
import { setCustomer, setVehicleNumber } from '../store/flowSlice';
import type { ScreenProps } from '../navigation/types';

// Maps to Image 1 + Image 2/3 branch point: operator enters a vehicle
// number, backend decides existing vs. new — the operator never chooses.
export function VehicleSearchScreen({ navigation }: ScreenProps<'VehicleSearch'>) {
  const dispatch = useDispatch();
  const [vehicleNumber, setVehicleNumberInput] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [searchCustomer, { isLoading, error }] = useSearchCustomerMutation();

  async function handleSubmit() {
    setFieldError(null);
    if (!vehicleNumber.trim()) {
      setFieldError('Vehicle number is required');
      return;
    }
    try {
      const result = await searchCustomer({ vehicleNumber }).unwrap();
      dispatch(setVehicleNumber(vehicleNumber));
      if (result.found && result.customer) {
        dispatch(setCustomer(result.customer));
        navigation.navigate('ExistingCustomer');
      } else {
        dispatch(setCustomer(null));
        navigation.navigate('NewCustomer');
      }
    } catch {
      // error surfaced via `error` below
    }
  }

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>BPCL</Text>
        </View>
        <Text style={styles.brandCaption}>Fuel Cashback Operator App</Text>
      </View>

      <View style={styles.formArea}>
        <AppTextField
          label="Vehicle Number"
          placeholder="e.g. MH 15 AB 1234"
          autoCapitalize="characters"
          value={vehicleNumber}
          onChangeText={setVehicleNumberInput}
          error={fieldError}
          testID="vehicle-number-input"
        />
        {error ? <Text style={styles.apiError}>Could not look up vehicle. Check your connection and try again.</Text> : null}
        <AppButton label="Submit" onPress={handleSubmit} loading={isLoading} testID="submit-vehicle" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  logoBadge: {
    backgroundColor: colors.bpclBlue,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  logoText: {
    ...typography.h1,
    color: '#FFFFFF',
  },
  brandCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  formArea: {
    marginTop: spacing.lg,
  },
  apiError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
