import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

const loadEncryption = async (): Promise<typeof import('@/shared/lib/security/encryption')> =>
  import('@/shared/lib/security/encryption');

describe('auth-encryption', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.unmock('@/shared/lib/security/encryption');
    process.env = { ...originalEnv };
    // 32-byte key in base64: "a" * 32
    process.env['AUTH_ENCRYPTION_KEY'] = Buffer.from('a'.repeat(32)).toString('base64');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should encrypt and decrypt a value correctly', async () => {
    const { encryptAuthSecret, decryptAuthSecret } = await loadEncryption();
    const secret = 'my-super-secret-password';
    const encrypted = encryptAuthSecret(secret);

    expect(encrypted).toContain(':');
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptAuthSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should throw error if payload is invalid during decryption', async () => {
    const { decryptAuthSecret } = await loadEncryption();
    expect(() => decryptAuthSecret('invalidpayload')).toThrow('Invalid encrypted payload');
  });

  it('should throw error if key is missing', async () => {
    const { encryptAuthSecret } = await loadEncryption();
    delete process.env['AUTH_ENCRYPTION_KEY'];
    delete process.env['INTEGRATION_ENCRYPTION_KEY'];
    expect(() => encryptAuthSecret('test')).toThrow('AUTH_ENCRYPTION_KEY is required');
  });

  it('does not fall back to integration encryption key for auth secrets', async () => {
    const { encryptAuthSecret } = await loadEncryption();
    delete process.env['AUTH_ENCRYPTION_KEY'];
    process.env['INTEGRATION_ENCRYPTION_KEY'] = Buffer.from('b'.repeat(32)).toString('base64');
    expect(() => encryptAuthSecret('test')).toThrow('AUTH_ENCRYPTION_KEY is required');
  });
});
