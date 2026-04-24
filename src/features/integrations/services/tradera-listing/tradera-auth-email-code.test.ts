import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/features/filemaker/server', () => ({
  getFilemakerMailThreadDetail: vi.fn(),
  listFilemakerMailAccounts: vi.fn(),
  searchFilemakerMailMessages: vi.fn(),
}));
vi.mock('@/server/queues/filemaker', () => ({
  enqueueFilemakerMailSyncJob: vi.fn(),
  startFilemakerMailSyncQueue: vi.fn(),
}));
vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(async () => undefined),
}));

import { extractTraderaVerificationCode } from './tradera-auth-email-code';

describe('tradera-auth-email-code', () => {
  it('extracts the verification code from the Tradera subject format', () => {
    expect(
      extractTraderaVerificationCode({
        subject: 'Your verification code is 343079',
      })
    ).toBe('343079');
  });

  it('extracts the verification code from the Tradera email body', () => {
    expect(
      extractTraderaVerificationCode({
        subject: 'Here is your verification code',
        textBody: 'Here is your verification code 343079. The code is valid for 5 minutes.',
      })
    ).toBe('343079');
  });
});
