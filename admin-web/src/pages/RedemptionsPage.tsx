import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchRedemptions } from '../api/endpoints';
import { Button, Card, EmptyState, LoadingState, Select } from '../components/ui';
import { RedemptionStatusBadge } from '../components/RedemptionStatusBadge';
import { formatCurrency, formatDate } from '../lib/format';
import type { RedemptionStatus } from '../types';

const STATUSES: RedemptionStatus[] = ['PENDING', 'OTP_VERIFIED', 'WHATSAPP_PENDING', 'WHATSAPP_VERIFIED', 'READER_PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'];

export default function RedemptionsPage() {
  const [status, setStatus] = useState<RedemptionStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['redemptions', status, page],
    queryFn: () => fetchRedemptions({ status: status || undefined, page }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Redemptions</h1>
        <p className="text-sm text-slate-500">{data?.total ?? 0} total redemptions</p>
      </div>

      <Card className="p-4">
        <Select
          className="max-w-xs"
          value={status}
          onChange={(e) => { setStatus(e.target.value as RedemptionStatus | ''); setPage(1); }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <LoadingState />
        ) : !data || data.redemptions.length === 0 ? (
          <EmptyState message="No redemptions match this filter." />
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Failure reason</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.redemptions.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.referenceNumber}</td>
                  <td className="px-4 py-3 text-slate-800">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3"><RedemptionStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs text-red-500">{r.failureReason ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/customers/${r.customerId}`} className="text-xs font-medium text-emerald-700 hover:underline">
                      View customer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {data.page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
