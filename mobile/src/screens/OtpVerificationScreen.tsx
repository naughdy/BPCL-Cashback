import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, ScreenTitle } from '../components/Screen';
import { AppTextField } from '../components/AppTextField';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppDispatch } from '../store/hooks';
import { setCustomer } from '../store/flowSlice';
import { useAddTransactionMutation, useCreateCustomerMutation, useSendOtpMutation } from '../api/bpclApi';
import { generateIdempotencyKey } from '../lib/idempotency';
import type { ScreenProps } from '../navigation/types';

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpVerificationScreen({ route, navigation }: ScreenProps<'OtpVerification'>) {
  const { otpId: initialOtpId, vehicleNumber, mobileNumber, fuelType, litres } = route.params;
  const dispatch = useAppDispatch();

  const [otpId, setOtpId] = useState(initialOtpId);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const [createCustomer, { isLoading: verifying }] = useCreateCustomerMutation();
  const [addTransaction, { isLoading: savingTransaction }] = useAddTransactionMutation();
  const [sendOtp, { isLoading: resending }] = useSendOtpMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify() {
    setError(null);
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    try {
      const customer = await createCustomer({
        vehicleNumber,
        mobileNumber,
        fuelType,
        otpId,
        otpCode: code,
      }).unwrap();
      dispatch(setCustomer(customer));

      // PART 6: Create Customer -> Save Fuel Transaction. The customer now
      // exists but has zero litres recorded — save the litres entered on
      // the New Customer screen as their first transaction.
      const result = await addTransaction({
        customerId: customer.id,
        litres,
        idempotencyKey: generateIdempotencyKey('txn-initial'),
      }).unwrap();
      dispatch(setCustomer(result.customer));

      navigation.navigate('TransactionSuccess', {
        litres,
        cashbackGenerated: result.customer.summary.cashbackGenerated,
      });
    } catch (err: any) {
      const message = err?.data?.error?.message ?? 'Invalid OTP. Please try again.';
      setError(message);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      const result = await sendOtp({ mobileNumber, purpose: 'CUSTOMER_VERIFICATION' }).unwrap();
      setOtpId(result.otpId);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Could not resend OTP. Please try again shortly.');
    }
  }

  return (
    <Screen>
      <ScreenTitle title="OTP Verification" subtitle={`Sent to ${mobileNumber}`} />

      <AppTextField
        label="Enter OTP"
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        error={error}
        testID="otp-input"
      />

      <AppButton label="Verify & Continue" onPress={handleVerify} loading={verifying || savingTransaction} testID="verify-otp" />

      <View style={styles.resendRow}>
        {cooldown > 0 ? (
          <Text style={styles.cooldownText}>Resend available in {cooldown}s</Text>
        ) : (
          <Text onPress={resending ? undefined : handleResend} style={styles.resendLink}>
            {resending ? 'Resending…' : 'Resend OTP'}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resendRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  cooldownText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  resendLink: {
    ...typography.bodyBold,
    color: colors.bpclBlue,
    textDecorationLine: 'underline',
  },
});
