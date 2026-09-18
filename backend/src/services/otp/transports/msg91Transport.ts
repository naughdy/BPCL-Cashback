import { logger } from '../../../lib/logger';
import type { ISmsTransport, SmsSendResult } from '../smsTransport.types';

/**
 * Sends OTP messages via MSG91's Flow API using a pre-approved DLT
 * template. Requires (see backend/.env.example):
 *   MSG91_AUTH_KEY    — from your MSG91 dashboard (Settings > API)
 *   MSG91_TEMPLATE_ID — the Flow ID of your DLT-approved OTP template,
 *                        e.g. "Your OTP for BPCL Cashback is ##OTP##.
 *                        Valid for 5 minutes. Do not share this code."
 *                        The template's single variable must be named
 *                        VAR1 in MSG91's flow editor.
 *   MSG91_SENDER_ID    — your approved 6-character DLT sender ID.
 *
 * MSG91 (not Twilio) is used here because, for Indian 10-digit mobile
 * numbers, its per-SMS transactional rate is meaningfully cheaper
 * (typically ~₹0.15–0.20/SMS with no fixed monthly fee) than Twilio's
 * India rates, and it has first-class DLT template support built into
 * its dashboard.
 *
 * This transport only sends the message — OTP generation, hashing,
 * expiry and attempt-limiting all stay in otpCore.service.ts regardless
 * of which transport is active, so switching providers never touches
 * the security-critical logic.
 */
export class Msg91SmsTransport implements ISmsTransport {
  private readonly authKey: string;
  private readonly templateId: string;
  private readonly senderId: string;

  constructor(config: { authKey: string; templateId: string; senderId: string }) {
    this.authKey = config.authKey;
    this.templateId = config.templateId;
    this.senderId = config.senderId;
  }

  async send(mobileNumber: string, message: string): Promise<SmsSendResult> {
    // MSG91 expects the number with country code, no leading '+' or '0'.
    const otpMatch = message.match(/\b(\d{6})\b/);
    const otp = otpMatch ? otpMatch[1] : '';

    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        body: JSON.stringify({
          template_id: this.templateId,
          sender: this.senderId,
          short_url: '0',
          recipients: [
            {
              mobiles: `91${mobileNumber}`,
              VAR1: otp,
            },
          ],
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        type?: string;
        message?: string;
        request_id?: string;
      };

      if (!response.ok || body?.type === 'error') {
        logger.error({ mobileNumber, status: response.status, body }, 'MSG91 send failed');
        return { delivered: false, error: body?.message ?? `MSG91 returned HTTP ${response.status}` };
      }

      return { delivered: true, providerMessageId: body?.request_id };
    } catch (err) {
      logger.error({ err, mobileNumber }, 'MSG91 request threw');
      return { delivered: false, error: err instanceof Error ? err.message : 'Unknown network error' };
    }
  }
}
