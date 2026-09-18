import { apiClient } from './client';
import type {
  Customer,
  FuelTransaction,
  Redemption,
  AuditLog,
  DashboardStats,
  FuelRule,
  AdminUserProfile,
  FuelType,
} from '../types';

// ---- Auth ----
export async function login(email: string, password: string) {
  const { data } = await apiClient.post<{ token: string; user: AdminUserProfile }>('/auth/login', { email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get<AdminUserProfile>('/auth/me');
  return data;
}

// ---- Customers ----
export interface CustomerFilters {
  vehicleNumber?: string;
  mobileNumber?: string;
  fuelType?: FuelType | '';
  eligibleOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function fetchCustomers(filters: CustomerFilters) {
  const { data } = await apiClient.get<{ total: number; page: number; pageSize: number; customers: Customer[] }>(
    '/customers',
    { params: filters }
  );
  return data;
}

export async function fetchCustomer(id: string) {
  const { data } = await apiClient.get<Customer>(`/customers/${id}`);
  return data;
}

export async function fetchCustomerTransactions(id: string, page = 1) {
  const { data } = await apiClient.get<{ total: number; page: number; pageSize: number; transactions: FuelTransaction[] }>(
    `/customers/${id}/transactions`,
    { params: { page } }
  );
  return data;
}

export async function updateCustomer(
  id: string,
  input: { vehicleNumber?: string; mobileNumber?: string; fuelType?: FuelType; reason?: string }
) {
  const { data } = await apiClient.put<Customer>(`/customers/${id}`, input);
  return data;
}

export async function deleteCustomer(id: string, reason?: string) {
  await apiClient.delete(`/customers/${id}`, { data: { reason } });
}

// ---- Transactions ----
export interface TransactionFilters {
  customerId?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchTransactions(filters: TransactionFilters) {
  const { data } = await apiClient.get<{ total: number; page: number; pageSize: number; transactions: FuelTransaction[] }>(
    '/transactions',
    { params: filters }
  );
  return data;
}

export async function updateTransaction(id: string, input: { litres?: string; transactionDate?: string; reason?: string }) {
  const { data } = await apiClient.put<Customer>(`/transactions/${id}`, input);
  return data;
}

export async function deleteTransaction(id: string, reason?: string) {
  const { data } = await apiClient.delete<Customer>(`/transactions/${id}`, { data: { reason } });
  return data;
}

// ---- Redemptions ----
export interface RedemptionFilters {
  customerId?: string;
  status?: string;
  page?: number;
}

export async function fetchRedemptions(filters: RedemptionFilters) {
  const { data } = await apiClient.get<{ total: number; page: number; pageSize: number; redemptions: Redemption[] }>(
    '/redemptions',
    { params: filters }
  );
  return data;
}

export async function fetchRedemption(id: string) {
  const { data } = await apiClient.get<Redemption>(`/redemptions/${id}`);
  return data;
}

// ---- Dashboard ----
export async function fetchDashboard(params: { from?: string; to?: string } = {}) {
  const { data } = await apiClient.get<DashboardStats>('/admin/dashboard', { params });
  return data;
}

// ---- Audit ----
export interface AuditFilters {
  entityType?: string;
  entityId?: string;
  action?: string;
  page?: number;
}

export async function fetchAuditLogs(filters: AuditFilters) {
  const { data } = await apiClient.get<{ total: number; page: number; pageSize: number; logs: AuditLog[] }>(
    '/admin/audit-logs',
    { params: filters }
  );
  return data;
}

// ---- Export ----
export async function downloadExport(kind: 'customers' | 'transactions' | 'redemptions', params: Record<string, string | undefined> = {}) {
  const { data, headers } = await apiClient.get(`/admin/export/${kind}`, { params, responseType: 'blob' });
  const disposition = headers['content-disposition'] as string | undefined;
  const filenameMatch = disposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] ?? `${kind}.xlsx`;

  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---- Settings ----
export async function fetchFuelRules() {
  const { data } = await apiClient.get<FuelRule[]>('/admin/settings/fuel-rules');
  return data;
}

export async function updateFuelRule(fuelType: FuelType, input: { redemptionThresholdLitres: string; cashbackRatePerLitre: string }) {
  const { data } = await apiClient.put<FuelRule>(`/admin/settings/fuel-rules/${fuelType}`, input);
  return data;
}
