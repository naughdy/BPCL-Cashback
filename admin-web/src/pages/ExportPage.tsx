import { useState } from 'react';
import { downloadExport } from '../api/endpoints';
import { Button, Card, Input, Select } from '../components/ui';
import type { FuelType } from '../types';

export default function ExportPage() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [fuelType, setFuelType] = useState<FuelType | ''>('');
  const [busy, setBusy] = useState<string | null>(null);

  async function handleExport(kind: 'customers' | 'transactions' | 'redemptions') {
    setBusy(kind);
    try {
      await downloadExport(kind, { vehicleNumber: vehicleNumber || undefined, fuelType: fuelType || undefined });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Export</h1>
        <p className="text-sm text-slate-500">Download real .xlsx files of current data. Filters below apply to the customer and transaction exports.</p>
      </div>

      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <Input placeholder="Filter by vehicle number (optional)" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
        <Select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType | '')}>
          <option value="">All fuel types</option>
          <option value="PETROL">Petrol</option>
          <option value="DIESEL">Diesel</option>
        </Select>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ExportCard
          title="Customers"
          description="Vehicle, mobile, fuel type, totals and balances for every customer."
          busy={busy === 'customers'}
          onExport={() => handleExport('customers')}
        />
        <ExportCard
          title="Transactions"
          description="Every fuel purchase transaction with cashback generated."
          busy={busy === 'transactions'}
          onExport={() => handleExport('transactions')}
        />
        <ExportCard
          title="Redemptions"
          description="Every redemption attempt with status and reference number."
          busy={busy === 'redemptions'}
          onExport={() => handleExport('redemptions')}
        />
      </div>
    </div>
  );
}

function ExportCard({ title, description, busy, onExport }: { title: string; description: string; busy: boolean; onExport: () => void }) {
  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <Button className="mt-4" onClick={onExport} disabled={busy}>
        {busy ? 'Preparing…' : 'Download .xlsx'}
      </Button>
    </Card>
  );
}
