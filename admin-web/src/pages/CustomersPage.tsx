import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchCustomers } from '../api/endpoints';
import { Badge, Button, Card, EmptyState, Input, LoadingState, Select } from '../components/ui';
import { formatCurrency, formatDate, formatLitres } from '../lib/format';
import type { FuelType } from '../types';

export default function CustomersPage() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [fuelType, setFuelType] = useState<FuelType | ''>('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { vehicleNumber, mobileNumber, fuelType, eligibleOnly, page }],
    queryFn: () => fetchCustomers({ vehicleNumber, mobileNumber, fuelType, eligibleOnly, page, pageSize: 20 }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} total customers</p>
        </div>
      </div>

      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search vehicle number"
          value={vehicleNumber}
          onChange={(e) => { setVehicleNumber(e.target.value); setPage(1); }}
        />
        <Input
          placeholder="Search mobile number"
          value={mobileNumber}
          onChange={(e) => { setMobileNumber(e.target.value); setPage(1); }}
        />
        <Select value={fuelType} onChange={(e) => { setFuelType(e.target.value as FuelType | ''); setPage(1); }}>
          <option value="">All fuel types</option>
          <option value="PETROL">Petrol</option>
          <option value="DIESEL">Diesel</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => { setEligibleOnly(e.target.checked); setPage(1); }}
          />
          Eligible / has balance
        </label>
      </Card>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <LoadingState />
        ) : !data || data.customers.length === 0 ? (
          <EmptyState message="No customers match these filters." />
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Fuel</th>
                <th className="px-4 py-3">Total Litres</th>
                <th className="px-4 py-3">Generated</th>
                <th className="px-4 py-3">Redeemed</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.vehicleNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{c.mobileNumber}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.fuelType === 'PETROL' ? 'amber' : 'blue'}>{c.fuelType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatLitres(c.summary.totalLitres)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(c.summary.cashbackGenerated)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(c.summary.cashbackRedeemed)}</td>
                  <td className="px-4 py-3 font-medium text-emerald-700">{formatCurrency(c.summary.availableCashback)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(c.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/customers/${c.id}`} className="text-xs font-medium text-emerald-700 hover:underline">
                      View
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
          <span>
            Page {data.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
