import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTransactions } from '../api/endpoints';
import { Badge, Button, Card, EmptyState, LoadingState } from '../components/ui';
import { formatCurrency, formatDate, formatLitres } from '../lib/format';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => fetchTransactions({ page, pageSize: 25 }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Transactions</h1>
        <p className="text-sm text-slate-500">{data?.total ?? 0} total fuel transactions</p>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <LoadingState />
        ) : !data || data.transactions.length === 0 ? (
          <EmptyState message="No transactions recorded yet." />
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Fuel</th>
                <th className="px-4 py-3">Litres</th>
                <th className="px-4 py-3">Cashback</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.vehicleNumberSnapshot}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.fuelTypeSnapshot === 'PETROL' ? 'amber' : 'blue'}>{t.fuelTypeSnapshot}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{formatLitres(t.litres)}</td>
                  <td className="px-4 py-3 text-emerald-700">{formatCurrency(t.cashbackGenerated)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.status === 'EDITED' ? 'amber' : 'slate'}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/customers/${t.customerId}`} className="text-xs font-medium text-emerald-700 hover:underline">
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
