import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, notFoundMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

import {
  createKangurDeniedApiResponse,
  readCanAccessKangurPage,
  readSanitizedKangurAliasLoginSearchParams,
  requireAccessibleKangurSlugRoute,
} from '@/features/kangur/server/route-access';

describe('kangur server route access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new Error('notFound');
    });
  });

  it('allows GamesLibrary for exact super-admin sessions', async () => {
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'owner@example.com',
        role: 'super_admin',
      },
    });

    await expect(readCanAccessKangurPage('GamesLibrary')).resolves.toBe(true);
  });

  it('allows unrestricted pages without reading auth', async () => {
    await expect(readCanAccessKangurPage('Lessons')).resolves.toBe(true);
    expect(authMock).not.toHaveBeenCalled();
  });

  it('blocks GamesLibrary for non-super-admin sessions', async () => {
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    await expect(readCanAccessKangurPage('GamesLibrary')).resolves.toBe(false);
  });

  it('throws notFound for blocked slug routes', async () => {
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    await expect(requireAccessibleKangurSlugRoute(['games'])).rejects.toThrow('notFound');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('allows unrestricted slug routes without reading auth', async () => {
    await expect(requireAccessibleKangurSlugRoute(['lessons'])).resolves.toBeUndefined();
    expect(authMock).not.toHaveBeenCalled();
  });

  it('returns a private not-found api response', async () => {
    const response = createKangurDeniedApiResponse();

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ error: 'Not Found' });
  });

  it('sanitizes blocked games callbacks in alias login params for non-super-admin sessions', async () => {
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    await expect(
      readSanitizedKangurAliasLoginSearchParams({
        searchParams: {
          callbackUrl: '/kangur/games',
        },
        pathname: '/kangur/login',
        fallbackHref: '/',
      })
    ).resolves.toEqual({
      callbackUrl: '/',
    });
  });

  it('preserves games callbacks in alias login params for exact super admins', async () => {
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'owner@example.com',
        role: 'super_admin',
      },
    });

    await expect(
      readSanitizedKangurAliasLoginSearchParams({
        searchParams: {
          callbackUrl: '/kangur/games',
        },
        pathname: '/kangur/login',
        fallbackHref: '/',
      })
    ).resolves.toEqual({
      callbackUrl: '/games',
    });
  });

  it('preserves unrestricted alias login callbacks without reading auth', async () => {
    await expect(
      readSanitizedKangurAliasLoginSearchParams({
        searchParams: {
          callbackUrl: '/kangur/lessons',
        },
        pathname: '/kangur/login',
        fallbackHref: '/',
      })
    ).resolves.toEqual({
      callbackUrl: '/lessons',
    });
    expect(authMock).not.toHaveBeenCalled();
  });
});
