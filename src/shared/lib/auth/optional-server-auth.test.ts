import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, onErrorMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  onErrorMock: vi.fn(),
}));

vi.mock('@/features/auth/auth', () => ({
  auth: authMock,
}));

import {
  isMissingRequestScopeError,
  readOptionalServerAuthSession,
  readTolerantServerAuthSession,
} from '@/features/auth/optional-server-auth';

describe('optional server auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the auth session when available', async () => {
    const session = { user: { id: 'user-1' } };
    authMock.mockResolvedValue(session);

    await expect(readOptionalServerAuthSession()).resolves.toBe(session);
  });

  it('treats missing request scope as an absent session', async () => {
    authMock.mockRejectedValue(new Error('`headers` was called outside a request scope'));

    await expect(readOptionalServerAuthSession()).resolves.toBeNull();
  });

  it('rethrows unrelated auth failures in strict mode', async () => {
    const error = new Error('database unavailable');
    authMock.mockRejectedValue(error);

    await expect(readOptionalServerAuthSession()).rejects.toBe(error);
  });

  it('skips error reporting for missing request scope in tolerant mode', async () => {
    authMock.mockRejectedValue(new Error('`headers` was called outside a request scope'));

    await expect(
      readTolerantServerAuthSession({
        onError: onErrorMock,
      })
    ).resolves.toBeNull();

    expect(onErrorMock).not.toHaveBeenCalled();
  });

  it('reports unrelated auth failures in tolerant mode', async () => {
    const error = new Error('database unavailable');
    authMock.mockRejectedValue(error);

    await expect(
      readTolerantServerAuthSession({
        onError: onErrorMock,
      })
    ).resolves.toBeNull();

    expect(onErrorMock).toHaveBeenCalledWith(error);
  });

  it('detects the request-scope error shape', () => {
    expect(isMissingRequestScopeError(new Error('outside a request scope'))).toBe(true);
    expect(isMissingRequestScopeError(new Error('something else'))).toBe(false);
    expect(isMissingRequestScopeError('outside a request scope')).toBe(false);
  });
});
