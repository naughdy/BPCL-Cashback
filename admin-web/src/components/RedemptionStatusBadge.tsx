import { Badge } from './ui';
import type { RedemptionStatus } from '../types';

const TONE_BY_STATUS: Record<RedemptionStatus, 'slate' | 'green' | 'red' | 'amber' | 'blue'> = {
  PENDING: 'slate',
  OTP_VERIFIED: 'blue',
  WHATSAPP_PENDING: 'amber',
  WHATSAPP_VERIFIED: 'blue',
  READER_PENDING: 'amber',
  SUCCESS: 'green',
  FAILED: 'red',
  CANCELLED: 'slate',
};

export function RedemptionStatusBadge({ status }: { status: RedemptionStatus }) {
  return <Badge tone={TONE_BY_STATUS[status]}>{status.replace(/_/g, ' ')}</Badge>;
}
