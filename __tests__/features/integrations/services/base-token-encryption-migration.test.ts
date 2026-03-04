import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { migrateBaseTokenEncryption } from '@/features/integrations/services/base-token-encryption-migration';
import { decryptSecret, encryptSecret } from '@/shared/lib/security/encryption';

vi.mock('server-only', () => ({}));

describe('base-token-encryption-migration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env['INTEGRATION_ENCRYPTION_KEY'] = Buffer.from('b'.repeat(32)).toString('base64');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('keeps already encrypted token unchanged', () => {
    const encrypted = encryptSecret('base-token');
    const migrated = migrateBaseTokenEncryption({
      baseApiToken: encrypted,
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.alreadyEncrypted).toBe(true);
    expect(migrated.baseApiToken).toBe(encrypted);
  });

  it('encrypts plaintext token to canonical encrypted form', () => {
    const migrated = migrateBaseTokenEncryption({
      baseApiToken: 'plain-token',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.alreadyEncrypted).toBe(false);
    expect(migrated.baseApiToken).not.toBe('plain-token');
    expect(decryptSecret(migrated.baseApiToken as string)).toBe('plain-token');
  });

  it('returns unchanged null when token is missing', () => {
    const migrated = migrateBaseTokenEncryption({
      baseApiToken: null,
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.baseApiToken).toBeNull();
    expect(migrated.hadTokenBefore).toBe(false);
  });
});
