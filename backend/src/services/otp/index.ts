import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { OtpCoreService } from './otpCore.service';
import { ConsoleSmsTransport } from './transports/consoleTransport';
import { Msg91SmsTransport } from './transports/msg91Transport';
import type { IOtpService } from './otp.types';
import type { ISmsTransport } from './smsTransport.types';

function buildTransport(): ISmsTransport {
  switch (env.otpProvider) {
    case 'MSG91': {
      const authKey = process.env.MSG91_AUTH_KEY;
      const templateId = process.env.MSG91_TEMPLATE_ID;
      const senderId = process.env.MSG91_SENDER_ID;
      if (!authKey || !templateId || !senderId) {
        throw new Error(
          'OTP_PROVIDER=MSG91 requires MSG91_AUTH_KEY, MSG91_TEMPLATE_ID and MSG91_SENDER_ID to be set'
        );
      }
      logger.info('OTP delivery: MSG91 SMS');
      return new Msg91SmsTransport({ authKey, templateId, senderId });
    }
    case 'MOCK':
    default:
      logger.info('OTP delivery: mock (console log only — not sent to any real device)');
      return new ConsoleSmsTransport();
  }
}

export const otpService: IOtpService = new OtpCoreService(buildTransport());
