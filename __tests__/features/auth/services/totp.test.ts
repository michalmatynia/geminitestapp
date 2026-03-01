import crypto from 'crypto';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotpToken,
  generateRecoveryCodes,
  normalizeRecoveryCode,
  hashRecoveryCode,
} from '@/features/auth/services/totp';

// Mock crypto module
vi.mock('crypto', async (importOriginal) => {
  const actual = (await importOriginal());

  const randomBytes = vi.fn((size: number) => {
    if (size === 20) return Buffer.from('01234567890123456789');
    if (size === 6) return Buffer.from('ABCDEF');
    return Buffer.alloc(size);
  });

  const createHmac = vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => {
      const res = Buffer.alloc(20);
      res[19] = 0x0f; // offset 15
      res[15] = 0;
      res[16] = 0;
      res[17] = 0;
      res[18] = 0;
      return res;
    }),
  } as unknown as crypto.Hmac));

  const createHash = vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mockhash'),
  } as unknown as crypto.Hash));

  const mockedModule = {
    ...actual,
    randomBytes,
    createHmac,
    createHash,
  };

  return {
    ...mockedModule,
    default: mockedModule,
  };
});

describe('TOTP Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a valid base32 secret', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('builds a correct otpauth URL', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const url = buildOtpAuthUrl({
      secret,
      label: 'user@example.com',
      issuer: 'GeminiApp',
    });
    expect(url).toBe('otpauth://totp/user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=GeminiApp');
  });

  it('normalizes recovery codes correctly', () => {
    expect(normalizeRecoveryCode('abcd-1234-efgh')).toBe('ABCD1234EFGH');
    expect(normalizeRecoveryCode('  ABCD 1234 EFGH  ')).toBe('ABCD1234EFGH');
  });

  it('hashes recovery codes consistently', () => {
    const code = 'ABCD-1234-EFGH';
    const hash1 = hashRecoveryCode(code);
    const hash2 = hashRecoveryCode('abcd1234efgh');
    expect(hash1).toBe(hash2);
    expect(hash1).toBe('mockhash');
  });

  it('generates the specified number of recovery codes', () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    codes.forEach((code) => {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });
  });

  describe('verifyTotpToken', () => {
    const secret = 'JBSWY3DPEHPK3PXP';

    it('verifies a valid token for the current time window', () => {
      vi.useFakeTimers();
      const testTimestamp = new Date('2023-01-01T00:00:00.000Z').getTime();
      vi.setSystemTime(testTimestamp);

      const validToken = '000000';
      expect(verifyTotpToken(secret, validToken)).toBe(true);
      vi.useRealTimers();
    });

    it('verifies a valid token within the window', () => {
      vi.useFakeTimers();
      const testTimestamp = new Date('2023-01-01T00:00:00.000Z').getTime();
      vi.setSystemTime(testTimestamp);

      const validToken = '000000';
      // Current token is "000000". Offset +30s also results in "000000" with our mock.
      expect(verifyTotpToken(secret, validToken)).toBe(true);
      vi.useRealTimers();
    });

    it('returns false for invalid tokens', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z').getTime());

      // Override mock for this test to return something else
      vi.mocked(crypto.createHmac).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn(() => {
          const res = Buffer.alloc(20);
          res[19] = 0;
          res[0] = 1; // code will not be 123456
          return res;
        }),
      } as unknown as crypto.Hmac);

      expect(verifyTotpToken(secret, '123456')).toBe(false);
      vi.useRealTimers();
    });
  });
});
