import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, ScreenTitle } from '../components/Screen';
import { AppTextField } from '../components/AppTextField';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppSelector } from '../store/hooks';
import { useSendRedemptionOtpMutation, useVerifyRedemptionOtpMutation } from '../api/bpclApi';
import type { ScreenProps } from '../navigation/types';

const RESEND_COOLDOWN_SECONDS = 30;

export function RedemptionOtpScreen({ navigation }: ScreenProps<'RedemptionOtp'>) {
  const customer = useAppSelector((s) => s.flow.customer);
  const redemptionId = useAppSelector((s) => s.flow.activeRedemptionId);

  const [sendOtp, { isLoading: sending }] = useSendRedemptionOtpMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyRedemptionOtpMutation();

  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [initialSendDone, setInitialSendDone] = useState(false);

  useEffect(() => {
    if (!redemptionId || initialSendDone) return;
    setInitialSendDone(true);
    sendOtp({ redemptionId })
      .unwrap()
      .then((result) => {
        setOtpId(result.otpId);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      })
      .catch(() => setError('Could not send OTP. Please try again.'));
  }, [redemptionId, initialSendDone, sendOtp]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!redemptionId || !customer) {
    navigation.replace('VehicleSearch');
    return null;
  }

  async function handleVerify() {
    setError(null);
    if (!otpId) {
      setError('OTP not sent yet, please wait.');
      return;
    }
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    try {
      await verifyOtp({ redemptionId: redemptionId!, otpId, code }).unwrap();
      navigation.navigate('WhatsAppVerification');
    } catch (err: any) {
      setError(err?.data?.error?.message ?? 'Invalid OTP. Please try again.');
    }
  }

  async function handleResend() {
    setError(null);
    try {
      const result = await sendOtp({ redemptionId: redemptionId! }).unwrap();
      setOtpId(result.otpId);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Could not resend OTP. Please try again shortly.');
    }
  }

  return (
    <Screen>
      <ScreenTitle title="Redemption OTP" subtitle={`Sent to ${customer.mobileNumber}`} />

      <AppTextField
        label="Enter OTP"
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        error={error}
        testID="redemption-otp-input"
      />

      <AppButton label="Verify & Continue" onPress={handleVerify} loading={verifying || sending} testID="verify-redemption-otp" />

      <View style={styles.resendRow}>
        {cooldown > 0 ? (
          <Text style={styles.cooldownText}>Resend available in {cooldown}s</Text>
        ) : (
          <Text onPress={handleResend} style={styles.resendLink}>
            Resend OTP
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resendRow: { marginTop: spacing.lg, alignItems: 'center' },
  cooldownText: { ...typography.caption, color: colors.textSecondary },
  resendLink: { ...typography.bodyBold, color: colors.bpclBlue, textDecorationLine: 'underline' },
});
