export type FuelType = 'PETROL' | 'DIESEL';

export type RedemptionStatus =
  | 'PENDING'
  | 'OTP_VERIFIED'
  | 'WHATSAPP_PENDING'
  | 'WHATSAPP_VERIFIED'
  | 'READER_PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface CashbackSummary {
  totalLitres: string;
  cashbackGenerated: string;
  eligible: boolean;
  cashbackRedeemed: string;
  availableCashback: string;
}

export interface Customer {
  id: string;
  vehicleNumber: string;
  mobileNumber: string;
  fuelType: FuelType;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  summary: CashbackSummary;
}

export interface FuelTransaction {
  id: string;
  customerId: string;
  vehicleNumberSnapshot: string;
  fuelTypeSnapshot: FuelType;
  litres: string;
  cashbackGenerated: string;
  transactionDate: string;
  status: 'ACTIVE' | 'EDITED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface Redemption {
  id: string;
  customerId: string;
  amount: string;
  status: RedemptionStatus;
  otpVerified: boolean;
  whatsappStatus: string | null;
  readerStatus: string | null;
  referenceNumber: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminUserId: string | null;
  adminUser: { name: string; email: string } | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
  createdAt: string;
}

export interface Paginated {
  total: number;
  page: number;
  pageSize: number;
  [key: string]: unknown;
}

export interface DailyBreakdownEntry {
  date: string;
  litres: string;
  cashbackGenerated: string;
  transactionsCount: number;
  cashbackRedeemed: string;
  redemptionsCount: number;
}

export interface DashboardStats {
  range: { from: string; to: string };
  totalCustomers: number;
  newCustomersInRange: number;
  totalTransactions: number;
  totalRedemptions: number;
  totalLitres: string;
  totalCashbackGenerated: string;
  totalCashbackRedeemed: string;
  totalAvailableCashback: string;
  dailyBreakdown: DailyBreakdownEntry[];
  recentTransactions: FuelTransaction[];
  recentRedemptions: Redemption[];
}

export interface FuelRule {
  fuelType: FuelType;
  redemptionThresholdLitres: string;
  cashbackRatePerLitre: string;
}

export interface AdminUserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}
