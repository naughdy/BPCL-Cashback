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
}

export interface FuelRule {
  fuelType: FuelType;
  redemptionThresholdLitres: string;
  cashbackRatePerLitre: string;
}

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}
