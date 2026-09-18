export type ReaderTransactionStatus = 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export interface IReaderService {
  initialize(): Promise<void>;
  createRedemption(referenceNumber: string, amount: string): Promise<{ readerTransactionId: string }>;
  checkStatus(readerTransactionId: string): Promise<ReaderTransactionStatus>;
  cancel(readerTransactionId: string): Promise<void>;
}

/**
 * Simulates the physical card/cashback reader device at the fuel pump.
 * Randomly returns SUCCESS, FAILED, or TIMEOUT so the app is forced to
 * handle all three honestly — a mock SUCCESS here is clearly logged as
 * mock and must never be conflated with a real settled transaction.
 */
export class MockReaderService implements IReaderService {
  async initialize(): Promise<void> {
    // no-op for the mock; a real implementation would open a device/socket connection
  }

  async createRedemption(referenceNumber: string, amount: string): Promise<{ readerTransactionId: string }> {
    return { readerTransactionId: `mock-reader-${referenceNumber}` };
  }

  async checkStatus(_readerTransactionId: string): Promise<ReaderTransactionStatus> {
    const roll = Math.random();
    if (roll < 0.85) return 'SUCCESS';
    if (roll < 0.95) return 'FAILED';
    return 'TIMEOUT';
  }

  async cancel(_readerTransactionId: string): Promise<void> {
    // no-op for the mock
  }
}

export const readerService: IReaderService = new MockReaderService();
