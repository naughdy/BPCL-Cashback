import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import TransactionsPage from './pages/TransactionsPage';
import RedemptionsPage from './pages/RedemptionsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/redemptions" element={<RedemptionsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
