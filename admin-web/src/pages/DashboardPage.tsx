import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchDashboard } from '../api/endpoints';
import { Card, EmptyState, LoadingState, StatCard } from '../components/ui';
import { RedemptionStatusBadge } from '../components/RedemptionStatusBadge';
import { DateRangeFilter, resolveDateRange } from '../components/DateRangeFilter';
import { formatCurrency, formatDate, formatDateOnly, formatLitres } from '../lib/format';
import { toDateInputValue, type DateRangePreset } from '../lib/dateRange';

export default function DashboardPage() {
  const [preset, setPreset] = useState<DateRangePreset>('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));

  const resolved = resolveDateRange(preset, customFrom, customTo);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', preset, customFrom, customTo],
    queryFn: () =>
      fetchDashboard({
        from: resolved ? resolved.from.toISOString() : undefined,
        to: resolved ? resolved.to.toISOString() : undefined,
      }),
    enabled: !!resolved,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of the fuel cashback program for the selected period.</p>
      </div>

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      {!resolved ? (
        <EmptyState message="Pick a start and end date to see data for that range." />
      ) : isLoading ? (
        <LoadingState />
      ) : error || !data ? (
        <EmptyState message="Could not load dashboard data." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="New Customers" value={data.newCustomersInRange.toLocaleString('en-IN')} hint={`${data.totalCustomers.toLocaleString('en-IN')} total`} />
            <StatCard label="Transactions" value={data.totalTransactions.toLocaleString('en-IN')} />
            <StatCard label="Litres Sold" value={formatLitres(data.totalLitres)} />
            <StatCard label="Cashback Generated" value={formatCurrency(data.totalCashbackGenerated)} />
            <StatCard label="Cashback Redeemed" value={formatCurrency(data.totalCashbackRedeemed)} hint={`${data.totalRedemptions.toLocaleString('en-IN')} redemptions`} />
            <StatCard label="Available Cashback (live)" value={formatCurrency(data.totalAvailableCashback)} />
          </div>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Day-wise Activity</h2>
            {data.dailyBreakdown.every((d) => d.transactionsCount === 0 && d.redemptionsCount === 0) ? (
              <EmptyState message="No activity in this period." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={data.dailyBreakdown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickFormatter={(value: string) => formatDateOnly(value).replace(/,.*/, '')}
                  />
                  <YAxis yAxisId="litres" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis yAxisId="cashback" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    labelFormatter={(value) => formatDateOnly(String(value))}
                    formatter={(value, name) => [
                      typeof name === 'string' && name.toLowerCase().includes('cashback')
                        ? formatCurrency(Number(value ?? 0))
                        : `${value ?? 0} L`,
                      name,
                    ]}
                  />
                  <Bar yAxisId="litres" dataKey="litres" name="Litres" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="cashback" type="monotone" dataKey="cashbackGenerated" name="Cashback Generated" stroke="#059669" strokeWidth={2} dot={false} />
                  <Line yAxisId="cashback" type="monotone" dataKey="cashbackRedeemed" name="Cashback Redeemed" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Recent Transactions</h2>
                <Link to="/transactions" className="text-xs font-medium text-emerald-700 hover:underline">
                  View all
                </Link>
              </div>
              {data.recentTransactions.length === 0 ? (
                <EmptyState message="No transactions in this period." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentTransactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{t.vehicleNumberSnapshot}</p>
                        <p className="text-xs text-slate-400">{formatDate(t.transactionDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-800">{formatLitres(t.litres)}</p>
                        <p className="text-xs text-emerald-600">{formatCurrency(t.cashbackGenerated)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Recent Redemptions</h2>
                <Link to="/redemptions" className="text-xs font-medium text-emerald-700 hover:underline">
                  View all
                </Link>
              </div>
              {data.recentRedemptions.length === 0 ? (
                <EmptyState message="No redemptions in this period." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentRedemptions.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{r.referenceNumber}</p>
                        <p className="text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-800">{formatCurrency(r.amount)}</p>
                        <RedemptionStatusBadge status={r.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
