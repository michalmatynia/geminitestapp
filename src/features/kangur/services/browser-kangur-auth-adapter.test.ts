import { describe, expect, it, vi } from 'vitest';

import { createBrowserKangurAuthAdapter } from '@/features/kangur/services/browser-kangur-auth-adapter';

describe('createBrowserKangurAuthAdapter', () => {
  it('maps a resolved user into an authenticated session', async () => {
    const adapter = createBrowserKangurAuthAdapter({
      authPort: {
        me: vi.fn().mockResolvedValue({
          id: 'user-1',
          full_name: 'Parent Demo',
          email: 'parent@example.com',
          role: 'user',
          actorType: 'parent',
          canManageLearners: true,
          ownerUserId: null,
          activeLearner: null,
          learners: [],
        }),
        prepareLoginHref: vi.fn(),
        redirectToLogin: vi.fn(),
        logout: vi.fn(),
      },
      resolveCurrentUrl: () => 'https://example.test/kangur',
    });

    await expect(adapter.getSession()).resolves.toMatchObject({
      status: 'authenticated',
      source: 'web-session',
      user: expect.objectContaining({
        id: 'user-1',
      }),
    });
  });

  it('maps auth status errors into an anonymous session', async () => {
    const authError = new Error('Authentication required') as Error & {
      status: number;
    };
    authError.status = 401;

    const adapter = createBrowserKangurAuthAdapter({
      authPort: {
        me: vi.fn().mockRejectedValue(authError),
        prepareLoginHref: vi.fn(),
        redirectToLogin: vi.fn(),
        logout: vi.fn(),
      },
      resolveCurrentUrl: () => 'https://example.test/kangur',
    });

    await expect(adapter.getSession()).resolves.toMatchObject({
      status: 'anonymous',
      source: 'web-session',
      user: null,
    });
  });

  it('delegates sign-in and sign-out to the existing auth port', async () => {
    const redirectToLogin = vi.fn();
    const logout = vi.fn().mockResolvedValue(undefined);

    const adapter = createBrowserKangurAuthAdapter({
      authPort: {
        me: vi.fn(),
        prepareLoginHref: vi.fn(),
        redirectToLogin,
        logout,
      },
      resolveCurrentUrl: () => 'https://example.test/kangur',
    });

    await adapter.signIn();
    await adapter.signOut({ returnUrl: 'https://example.test/after-logout' });

    expect(redirectToLogin).toHaveBeenCalledWith('https://example.test/kangur');
    expect(logout).toHaveBeenCalledWith('https://example.test/after-logout');
  });
});
