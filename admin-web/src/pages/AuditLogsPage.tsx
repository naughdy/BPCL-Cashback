import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../api/endpoints';
import { Badge, Button, Card, EmptyState, LoadingState, Select } from '../components/ui';
import { formatDate } from '../lib/format';

const ENTITY_TYPES = ['CUSTOMER', 'FUEL_TRANSACTION', 'REDEMPTION', 'FUEL_RULE', 'ADMIN_USER'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ADJUST', 'REDEEM', 'LOGIN', 'EXPORT'];

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, action, page],
    queryFn: () => fetchAuditLogs({ entityType: entityType || undefined, action: action || undefined, page }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Every admin modification is recorded here.</p>
      </div>

      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <Select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
      </Card>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <LoadingState />
        ) : !data || data.logs.length === 0 ? (
          <EmptyState message="No audit entries match this filter." />
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{log.adminUser?.name ?? 'System'}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{log.action}</Badge></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {log.entityType.replace(/_/g, ' ')}
                    <br />
                    <span className="font-mono text-slate-400">{log.entityId.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    {log.reason && <p className="mb-1 text-xs italic text-slate-500">"{log.reason}"</p>}
                    <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 text-xs text-slate-500">
                      {log.oldValue ? `- ${JSON.stringify(log.oldValue)}\n` : ''}
                      {log.newValue ? `+ ${JSON.stringify(log.newValue)}` : ''}
                    </pre>
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
