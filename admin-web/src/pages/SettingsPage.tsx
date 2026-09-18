import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFuelRules, updateFuelRule } from '../api/endpoints';
import { Button, Card, EmptyState, Input, LoadingState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { FuelRule } from '../types';

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['fuel-rules'], queryFn: fetchFuelRules });

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState message="Could not load fuel rules." />;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Business rules used across the mobile app and backend. Changes are audited{isSuperAdmin ? '' : ' — only Super Admins can edit these'}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.map((rule) => (
          <FuelRuleCard
            key={rule.fuelType}
            rule={rule}
            editable={isSuperAdmin}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['fuel-rules'] })}
          />
        ))}
      </div>
    </div>
  );
}

function FuelRuleCard({ rule, editable, onSaved }: { rule: FuelRule; editable: boolean; onSaved: () => void }) {
  const [threshold, setThreshold] = useState(rule.redemptionThresholdLitres);
  const [rate, setRate] = useState(rule.cashbackRatePerLitre);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => updateFuelRule(rule.fuelType, { redemptionThresholdLitres: threshold, cashbackRatePerLitre: rate }),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save'),
  });

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-slate-900">{rule.fuelType}</h3>
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Redemption threshold (litres)</label>
          <Input type="number" step="0.01" min="0.01" value={threshold} disabled={!editable} onChange={(e) => setThreshold(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Cashback rate (₹ per litre)</label>
          <Input type="number" step="0.01" min="0.01" value={rate} disabled={!editable} onChange={(e) => setRate(e.target.value)} />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {editable && (
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>
    </Card>
  );
}
