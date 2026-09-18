import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCustomer,
  fetchCustomerTransactions,
  fetchRedemptions,
  updateCustomer,
  updateTransaction,
  deleteTransaction,
  deleteCustomer,
} from '../api/endpoints';
import { Badge, Button, Card, EmptyState, Input, LoadingState, Modal, Select } from '../components/ui';
import { RedemptionStatusBadge } from '../components/RedemptionStatusBadge';
import { formatCurrency, formatDate, formatLitres } from '../lib/format';
import type { FuelTransaction, FuelType } from '../types';

export default function CustomerDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingTxn, setEditingTxn] = useState<FuelTransaction | null>(null);

  const customerQuery = useQuery({ queryKey: ['customer', id], queryFn: () => fetchCustomer(id), enabled: !!id });
  const transactionsQuery = useQuery({
    queryKey: ['customer-transactions', id],
    queryFn: () => fetchCustomerTransactions(id),
    enabled: !!id,
  });
  const redemptionsQuery = useQuery({
    queryKey: ['customer-redemptions', id],
    queryFn: () => fetchRedemptions({ customerId: id }),
    enabled: !!id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    queryClient.invalidateQueries({ queryKey: ['customer-transactions', id] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(id, 'Deleted from admin panel'),
    onSuccess: () => navigate('/customers'),
  });

  if (customerQuery.isLoading) return <LoadingState />;
  if (customerQuery.error || !customerQuery.data) return <EmptyState message="Customer not found." />;

  const customer = customerQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/customers" className="text-xs font-medium text-emerald-700 hover:underline">
            ← Back to customers
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{customer.vehicleNumber}</h1>
          <p className="text-sm text-slate-500">{customer.mobileNumber} · {customer.fuelType}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditingCustomer(true)}>Edit</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Soft-delete this customer? Financial history is preserved and auditable.')) {
                deleteMutation.mutate();
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryStat label="Total Litres" value={formatLitres(customer.summary.totalLitres)} />
        <SummaryStat label="Cashback Generated" value={formatCurrency(customer.summary.cashbackGenerated)} />
        <SummaryStat label="Cashback Redeemed" value={formatCurrency(customer.summary.cashbackRedeemed)} />
        <SummaryStat label="Available Cashback" value={formatCurrency(customer.summary.availableCashback)} highlight />
      </div>

      {!customer.summary.eligible && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Not yet eligible for redemption — threshold not reached for {customer.fuelType}.
        </div>
      )}

      <Card className="overflow-x-auto">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Transaction History</h2>
        </div>
        {transactionsQuery.isLoading ? (
          <LoadingState />
        ) : !transactionsQuery.data || transactionsQuery.data.transactions.length === 0 ? (
          <EmptyState message="No fuel transactions yet." />
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Litres</th>
                <th className="px-4 py-3">Cashback</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionsQuery.data.transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-800">{formatLitres(t.litres)}</td>
                  <td className="px-4 py-3 text-emerald-700">{formatCurrency(t.cashbackGenerated)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.status === 'EDITED' ? 'amber' : 'slate'}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingTxn(t)} className="text-xs font-medium text-emerald-700 hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Redemption History</h2>
        </div>
        {redemptionsQuery.isLoading ? (
          <LoadingState />
        ) : !redemptionsQuery.data || redemptionsQuery.data.redemptions.length === 0 ? (
          <EmptyState message="No redemptions yet." />
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {redemptionsQuery.data.redemptions.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.referenceNumber}</td>
                  <td className="px-4 py-3 text-slate-800">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3">
                    <RedemptionStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editingCustomer && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setEditingCustomer(false)}
          onSaved={() => { setEditingCustomer(false); invalidateAll(); }}
        />
      )}

      {editingTxn && (
        <EditTransactionModal
          transaction={editingTxn}
          onClose={() => setEditingTxn(null)}
          onSaved={() => { setEditingTxn(null); invalidateAll(); }}
        />
      )}
    </div>
  );
}

function SummaryStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
    </Card>
  );
}

function EditCustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: { id: string; vehicleNumber: string; mobileNumber: string; fuelType: FuelType };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [vehicleNumber, setVehicleNumber] = useState(customer.vehicleNumber);
  const [mobileNumber, setMobileNumber] = useState(customer.mobileNumber);
  const [fuelType, setFuelType] = useState<FuelType>(customer.fuelType);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => updateCustomer(customer.id, { vehicleNumber, mobileNumber, fuelType, reason: reason || undefined }),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save'),
  });

  return (
    <Modal open onClose={onClose} title="Edit Customer">
      <div className="space-y-3">
        <Field label="Vehicle Number">
          <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
        </Field>
        <Field label="Mobile Number">
          <Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
        </Field>
        <Field label="Fuel Type">
          <Select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
            <option value="PETROL">Petrol</option>
            <option value="DIESEL">Diesel</option>
          </Select>
        </Field>
        <Field label="Reason for change (audit log)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EditTransactionModal({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: FuelTransaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [litres, setLitres] = useState(transaction.litres);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => updateTransaction(transaction.id, { litres, reason: reason || undefined }),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(transaction.id, reason || 'Deleted from admin panel'),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to delete'),
  });

  return (
    <Modal open onClose={onClose} title="Edit Transaction">
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Editing changes only the litres for this single transaction. Totals, cashback, and eligibility are
          automatically recalculated from all of the customer's transactions — you cannot set the balance directly.
        </p>
        <Field label="Litres">
          <Input type="number" step="0.01" min="0.01" value={litres} onChange={(e) => setLitres(e.target.value)} />
        </Field>
        <Field label="Reason (audit log)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional but recommended" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between gap-2 pt-2">
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Soft-delete this transaction? It will be excluded from totals but kept for audit.')) {
                deleteMutation.mutate();
              }
            }}
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save & recalculate'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
