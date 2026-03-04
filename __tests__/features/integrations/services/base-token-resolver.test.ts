import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import { encryptSecret } from '@/shared/lib/security/encryption';

vi.mock('server-only', () => ({}));

describe('base-token-resolver', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env['INTEGRATION_ENCRYPTION_KEY'] = Buffer.from('b'.repeat(32)).toString('base64');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves encrypted baseApiToken first', () => {
    const token = 'base-api-token';
    const encrypted = encryptSecret(token);
    const resolved = resolveBaseConnectionToken({
      baseApiToken: encrypted,
    });

    expect(resolved).toEqual({
      token,
      source: 'baseApiToken',
      error: null,
    });
  });

  it('does not fall back when baseApiToken is empty', () => {
    const resolved = resolveBaseConnectionToken({
      baseApiToken: '',
    });

    expect(resolved.token).toBeNull();
    expect(resolved.source).toBeNull();
    expect(resolved.error).toContain('Legacy password token fallback is disabled');
  });

  it('accepts plaintext token for legacy/plain storage', () => {
    const resolved = resolveBaseConnectionToken({
      baseApiToken: 'plain-token',
    });

    expect(resolved).toEqual({
      token: 'plain-token',
      source: 'baseApiToken',
      error: null,
    });
  });

  it('returns actionable error for undecryptable encrypted-like token', () => {
    const resolved = resolveBaseConnectionToken({
      baseApiToken: 'YWJj:ZGVm:Z2hp',
    });

    expect(resolved.token).toBeNull();
    expect(resolved.source).toBeNull();
    expect(resolved.error).toContain('Failed to decrypt baseApiToken');
  });
});
