import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen, ScreenTitle } from '../components/Screen';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme/tokens';
import { useAppSelector } from '../store/hooks';
import { useProcessRedemptionWhatsAppMutation } from '../api/bpclApi';
import type { ScreenProps } from '../navigation/types';

export function WhatsAppVerificationScreen({ navigation }: ScreenProps<'WhatsAppVerification'>) {
  const redemptionId = useAppSelector((s) => s.flow.activeRedemptionId);
  const [processWhatsApp] = useProcessRedemptionWhatsAppMutation();
  const [status, setStatus] = useState<'PROCESSING' | 'FAILED'>('PROCESSING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!redemptionId) return;
    let cancelled = false;
    processWhatsApp({ redemptionId })
      .unwrap()
      .then(() => {
        if (!cancelled) navigation.navigate('ReaderStatus');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setStatus('FAILED');
        setErrorMessage(err?.data?.error?.message ?? 'WhatsApp verification failed.');
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

  function handleRetry() {
    setStatus('PROCESSING');
    setErrorMessage(null);
    processWhatsApp({ redemptionId: redemptionId! })
      .unwrap()
      .then(() => navigation.navigate('ReaderStatus'))
      .catch((err: any) => {
        setStatus('FAILED');
        setErrorMessage(err?.data?.error?.message ?? 'WhatsApp verification failed.');
      });
  }

  return (
    <Screen>
      <ScreenTitle title="WhatsApp Verification" />
      <View style={styles.center}>
        {status === 'PROCESSING' ? (
          <>
            <ActivityIndicator size="large" color={colors.bpclOrange} />
            <Text style={styles.message}>Sending redemption notification via WhatsApp…</Text>
          </>
        ) : (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <AppButton label="Retry" onPress={handleRetry} style={styles.retryButton} />
            <AppButton label="Cancel Redemption" variant="secondary" onPress={() => navigation.navigate('VehicleSearch')} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  errorIcon: { fontSize: 40, marginBottom: spacing.md },
  errorText: { ...typography.body, color: colors.danger, textAlign: 'center', marginBottom: spacing.lg },
  retryButton: { marginBottom: spacing.sm, width: '100%' },
});
