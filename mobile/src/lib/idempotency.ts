/** Generates a reasonably unique client-side key so double-taps on ADD or
 * REDEEM (e.g. from a slow network) don't create duplicate records. Not
 * cryptographically secure — doesn't need to be, it just needs to be
 * unique per user action. */
export function generateIdempotencyKey(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}-${random}`;
}
