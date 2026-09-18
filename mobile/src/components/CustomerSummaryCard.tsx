import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { Customer } from '../types';

export function CustomerSummaryCard({ customer }: { customer: Customer }) {
  return (
    <View style={styles.card}>
      <Row label="Vehicle No." value={customer.vehicleNumber} />
      <Row label="Mobile No." value={customer.mobileNumber} />
      <Row label="Fuel Type" value={customer.fuelType} />
      <View style={styles.divider} />
      <Row label="Total Litres" value={`${customer.summary.totalLitres} L`} />
      <Row label="Available Cashback" value={`₹${customer.summary.availableCashback}`} emphasize />
    </View>
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
    borderRadius: radius.lg,
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
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  emphasize: {
    color: colors.success,
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
