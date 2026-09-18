import { normalizeVehicleNumber, normalizeMobileNumber } from '../src/lib/normalize';
import { AppError } from '../src/lib/errors';

describe('normalizeVehicleNumber', () => {
  it('treats spaced, lowercase and compact forms as identical', () => {
    expect(normalizeVehicleNumber('MH 15 AB 1234')).toBe('MH15AB1234');
    expect(normalizeVehicleNumber('mh15ab1234')).toBe('MH15AB1234');
    expect(normalizeVehicleNumber('MH15AB1234')).toBe('MH15AB1234');
  });

  it('strips punctuation like hyphens', () => {
    expect(normalizeVehicleNumber('MH-15-AB-1234')).toBe('MH15AB1234');
  });

  it('rejects empty or too-short input', () => {
    expect(() => normalizeVehicleNumber('')).toThrow(AppError);
    expect(() => normalizeVehicleNumber('AB')).toThrow(AppError);
  });
});

describe('normalizeMobileNumber', () => {
  it('accepts a bare 10-digit number', () => {
    expect(normalizeMobileNumber('9876543210')).toBe('9876543210');
  });

  it('strips a +91 country code', () => {
    expect(normalizeMobileNumber('+91 98765 43210')).toBe('9876543210');
  });

  it('strips a leading trunk 0', () => {
    expect(normalizeMobileNumber('09876543210')).toBe('9876543210');
  });

  it('rejects invalid numbers (wrong length, bad leading digit)', () => {
    expect(() => normalizeMobileNumber('12345')).toThrow(AppError);
    expect(() => normalizeMobileNumber('1234567890')).toThrow(AppError); // leading digit < 6
  });
});
