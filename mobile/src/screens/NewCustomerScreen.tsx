import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, ScreenTitle } from '../components/Screen';
import { AppTextField } from '../components/AppTextField';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useSendOtpMutation } from '../api/bpclApi';
import type { FuelType } from '../types';
import type { ScreenProps } from '../navigation/types';

export function NewCustomerScreen({ navigation }: ScreenProps<'NewCustomer'>) {
  const dispatch = useAppDispatch();
  const vehicleNumber = useAppSelector((s) => s.flow.vehicleNumber) ?? '';
  const [mobileNumber, setMobileNumber] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('PETROL');
  const [litres, setLitres] = useState('');
  const [errors, setErrors] = useState<{ mobile?: string; litres?: string }>({});
  const [sendOtp, { isLoading, error }] = useSendOtpMutation();

  // Rough client-side estimate only — the backend recalculates the
  // authoritative figure once the transaction is actually saved.
  const rate = fuelType === 'PETROL' ? 0.5 : 0.5;
  const estimatedCashback = litres && !Number.isNaN(Number(litres)) ? (Number(litres) * rate).toFixed(2) : '0.00';

  async function handleAdd() {
    const nextErrors: typeof errors = {};
    if (!mobileNumber.trim()) nextErrors.mobile = 'Mobile number is required';
    const litresValue = Number(litres);
    if (!litres.trim() || Number.isNaN(litresValue) || litresValue <= 0) nextErrors.litres = 'Enter a valid number of litres';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const result = await sendOtp({ mobileNumber, purpose: 'CUSTOMER_VERIFICATION' }).unwrap();
      navigation.navigate('OtpVerification', {
        mode: 'NEW_CUSTOMER',
        otpId: result.otpId,
        vehicleNumber,
        mobileNumber,
        fuelType,
        litres,
      });
    } catch {
      // error surfaced below
    }
  }

  return (
    <Screen>
      <ScreenTitle title="New Customer" subtitle={`Vehicle: ${vehicleNumber}`} />

      <AppTextField
        label="Mobile Number"
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        error={errors.mobile}
        testID="mobile-input"
      />

      <View style={styles.fuelRow}>
        <FuelOption label="Petrol" selected={fuelType === 'PETROL'} onPress={() => setFuelType('PETROL')} />
        <FuelOption label="Diesel" selected={fuelType === 'DIESEL'} onPress={() => setFuelType('DIESEL')} />
      </View>

      <AppTextField
        label="Litres"
        placeholder="Enter litres purchased"
        keyboardType="decimal-pad"
        value={litres}
        onChangeText={setLitres}
        error={errors.litres}
        testID="litres-input"
      />

      <View style={styles.estimateBox}>
        <Text style={styles.estimateLabel}>Estimated Cashback</Text>
        <Text style={styles.estimateValue}>₹{estimatedCashback}</Text>
      </View>

      {error ? <Text style={styles.apiError}>Could not send OTP. Please try again.</Text> : null}

      <AppButton label="ADD" onPress={handleAdd} loading={isLoading} testID="add-new-customer" />
    </Screen>
  );
}

function FuelOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <AppButton
      label={label}
      variant={selected ? 'primary' : 'secondary'}
      onPress={onPress}
      style={styles.fuelButton}
    />
  );
}

const styles = StyleSheet.create({
  fuelRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fuelButton: {
    flex: 1,
  },
  estimateBox: {
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimateLabel: {
    ...typography.body,
    color: colors.warning,
  },
  estimateValue: {
    ...typography.h2,
    color: colors.warning,
  },
  apiError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
