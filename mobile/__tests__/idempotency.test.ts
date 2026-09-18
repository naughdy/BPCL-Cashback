import { generateIdempotencyKey } from '../src/lib/idempotency';

describe('generateIdempotencyKey', () => {
  it('includes the given prefix', () => {
    expect(generateIdempotencyKey('txn')).toMatch(/^txn-/);
  });

  it('generates unique keys on successive calls', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateIdempotencyKey('txn')));
    expect(keys.size).toBe(20);
  });
});
