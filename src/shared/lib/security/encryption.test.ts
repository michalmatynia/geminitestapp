/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  decryptAuthSecret,
  decryptSecret,
  encryptAuthSecret,
  encryptSecret,
} from './encryption';

describe('shared security encryption', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('encrypts and decrypts secrets with the configured integration key', () => {
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'));
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    vi.spyOn(Date, 'now').mockReturnValue(1774472400000);

    const payload = encryptSecret('top-secret-value');
    const parts = payload.split(':');

    expect(parts).toHaveLength(3);
    expect(parts.every((part) => part.length > 0)).toBe(true);
    expect(decryptSecret(payload)).toBe('top-secret-value');
  });

  it('supports the auth-specific wrappers with a separate key env', () => {
    vi.stubEnv('AUTH_ENCRYPTION_KEY', Buffer.alloc(32, 9).toString('base64'));

    const payload = encryptAuthSecret('auth-secret');

    expect(decryptAuthSecret(payload)).toBe('auth-secret');
  });

  it('rejects missing or malformed keys and invalid encrypted payloads', () => {
    vi.stubEnv('BAD_LENGTH_KEY', Buffer.alloc(16, 1).toString('base64'));

    expect(() => encryptSecret('value', 'MISSING_KEY')).toThrowError(/MISSING_KEY is required/);
    expect(() => encryptSecret('value', 'BAD_LENGTH_KEY')).toThrowError(
      /BAD_LENGTH_KEY must be a base64-encoded 32-byte key/
    );

    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', Buffer.alloc(32, 3).toString('base64'));
    try {
      decryptSecret('not-a-valid-payload');
      throw new Error('Expected decryptSecret to throw');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Invalid encrypted payload',
      });
    }
  });
});
