/**
 * In production, wire this to react-native-config (or a build-time env
 * mechanism) so the API URL can change per environment (dev/staging/prod)
 * without a code change. Kept as a plain constant here to avoid pulling in
 * a native module for this reference implementation.
 */
export const API_BASE_URL = 'http://10.0.2.2:4000/api'; // 10.0.2.2 = Android emulator's host loopback
