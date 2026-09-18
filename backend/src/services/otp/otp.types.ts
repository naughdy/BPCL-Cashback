export interface SendOtpResult {
  otpId: string;
  expiresAt: Date;
  resendAvailableAt: Date;
}

export interface VerifyOtpResult {
  verified: boolean;
  attemptsRemaining: number;
}

/**
 * Abstraction over "however we deliver a one-time code to the operator's
 * customer" — SMS today, WhatsApp/voice tomorrow. Swap MockOtpService for a
 * real provider (e.g. MSG91, Twilio Verify) without touching call sites.
 */
export interface IOtpService {
  sendOtp(mobileNumber: string, purpose: 'CUSTOMER_VERIFICATION' | 'REDEMPTION', customerId?: string): Promise<SendOtpResult>;
  verifyOtp(otpId: string, code: string): Promise<VerifyOtpResult>;
}
