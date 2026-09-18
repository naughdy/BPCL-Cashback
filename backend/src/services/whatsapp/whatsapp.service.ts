export interface WhatsAppNotificationResult {
  status: 'SENT' | 'FAILED';
  providerMessageId?: string;
}

export interface WhatsAppVerificationResult {
  status: 'VERIFIED' | 'FAILED' | 'PENDING';
}

export interface IWhatsAppService {
  sendRedemptionNotification(mobileNumber: string, amount: string, referenceNumber: string): Promise<WhatsAppNotificationResult>;
  verifyWhatsAppTransaction(referenceNumber: string): Promise<WhatsAppVerificationResult>;
}

/**
 * Development stand-in for the real WhatsApp Business API integration.
 * Simulates network latency and a small failure rate so the redemption
 * state machine and UI error-handling can be exercised honestly — it never
 * claims success when nothing actually happened.
 */
export class MockWhatsAppService implements IWhatsAppService {
  async sendRedemptionNotification(
    mobileNumber: string,
    amount: string,
    referenceNumber: string
  ): Promise<WhatsAppNotificationResult> {
    const failed = Math.random() < 0.05; // ~5% simulated failure rate
    if (failed) {
      return { status: 'FAILED' };
    }
    return { status: 'SENT', providerMessageId: `mock-wa-${referenceNumber}` };
  }

  async verifyWhatsAppTransaction(referenceNumber: string): Promise<WhatsAppVerificationResult> {
    const failed = Math.random() < 0.05;
    if (failed) return { status: 'FAILED' };
    return { status: 'VERIFIED' };
  }
}

export const whatsAppService: IWhatsAppService = new MockWhatsAppService();
