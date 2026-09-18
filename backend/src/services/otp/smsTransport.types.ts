export interface SmsSendResult {
  delivered: boolean;
  providerMessageId?: string;
  error?: string;
}

/** Sends one SMS. Implementations should never throw for a normal delivery
 * failure — return { delivered: false, error } so the caller can decide
 * whether to surface it, instead of the whole OTP flow blowing up. */
export interface ISmsTransport {
  send(mobileNumber: string, message: string): Promise<SmsSendResult>;
}
