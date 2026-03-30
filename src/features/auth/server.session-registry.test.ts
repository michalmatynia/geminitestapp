import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, registerSessionResolverMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  registerSessionResolverMock: vi.fn(),
}));

vi.mock('./auth', () => ({
  auth: authMock,
}));

vi.mock('@/shared/lib/api/session-registry', () => ({
  registerSessionResolver: registerSessionResolverMock,
}));

describe('auth server session registry bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('registers a resolver that returns the current session user', async () => {
    authMock.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });

    await import('./server');

    expect(registerSessionResolverMock).toHaveBeenCalledTimes(1);
    const resolver = registerSessionResolverMock.mock.calls[0]?.[0];
    await expect(resolver?.()).resolves.toMatchObject({ id: 'user-1' });
  });

  it('treats missing request scope as an absent session in the registry bridge', async () => {
    authMock.mockRejectedValue(new Error('`headers` was called outside a request scope'));

    await import('./server');

    expect(registerSessionResolverMock).toHaveBeenCalledTimes(1);
    const resolver = registerSessionResolverMock.mock.calls[0]?.[0];
    await expect(resolver?.()).resolves.toBeNull();
  });
});
