import { logger } from '../../../lib/logger';
import type { ISmsTransport, SmsSendResult } from '../smsTransport.types';

/** Dev-only transport: logs the message at debug level instead of sending
 * a real SMS. Never returns the code in the API response — only ever
 * visible in the backend's own log output. */
export class ConsoleSmsTransport implements ISmsTransport {
  async send(mobileNumber: string, message: string): Promise<SmsSendResult> {
    logger.debug({ mobileNumber, message }, '[ConsoleSmsTransport] Would send SMS (dev only)');
    return { delivered: true, providerMessageId: 'console-mock' };
  }
}
