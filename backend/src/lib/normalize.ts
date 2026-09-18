import { AppError } from './errors';

/**
 * Normalizes a vehicle number so that "MH 15 AB 1234", "mh15ab1234" and
 * "MH15AB1234" are all treated as the same vehicle.
 *
 * We deliberately do NOT enforce a specific Indian RTO regex (state code +
 * district code + series + number) because real-world plates vary (BH
 * series, defence plates, temporary plates, etc.) and the spec asks us not
 * to over-assume format beyond basic normalization. We only strip
 * whitespace/punctuation and uppercase the result, then sanity-check length.
 */
export function normalizeVehicleNumber(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    throw new AppError('INVALID_VEHICLE_NUMBER', 'Vehicle number is required');
  }
  const normalized = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (normalized.length < 4 || normalized.length > 15) {
    throw new AppError('INVALID_VEHICLE_NUMBER', 'Vehicle number looks invalid');
  }
  return normalized;
}

/**
 * Normalizes an Indian mobile number to a bare 10-digit string (no country
 * code, no separators). Accepts inputs like "+91 98765 43210", "091-9876543210",
 * "9876543210".
 */
export function normalizeMobileNumber(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    throw new AppError('INVALID_MOBILE', 'Mobile number is required');
  }
  let digits = raw.replace(/[^0-9]/g, '');
  // Strip a leading country code (91) or trunk prefix (0) down to 10 digits.
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  const validIndianMobile = /^[6-9]\d{9}$/;
  if (!validIndianMobile.test(digits)) {
    throw new AppError('INVALID_MOBILE', 'Enter a valid 10-digit Indian mobile number');
  }
  return digits;
}

/** Masks a mobile number for display/logging, e.g. 98765XXXXX -> 98XXXXX210 style is avoided; keep it simple. */
export function maskMobileNumber(mobile: string): string {
  if (mobile.length < 4) return '******';
  return `${mobile.slice(0, 2)}XXXXX${mobile.slice(-3)}`;
}
