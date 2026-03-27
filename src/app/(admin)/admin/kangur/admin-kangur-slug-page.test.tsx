/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, notFoundMock, redirectMock, permanentRedirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  permanentRedirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/features/kangur/admin/AdminKangurPageShell', () => ({
  AdminKangurPageShell: ({ slug }: { slug?: string[] }) => <div data-testid='admin-kangur-shell'>{JSON.stringify(slug ?? [])}</div>,
}));

describe('admin Kangur slug page access', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new Error('notFound');
    });
  });

  it('blocks the games slug for non-super-admin sessions', async () => {
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    const { default: AdminKangurSlugPage } = await import('@/app/(admin)/admin/kangur/[...slug]/page');

    await expect(
      AdminKangurSlugPage({
        params: Promise.resolve({ slug: ['games'] }),
      })
    ).rejects.toThrow('notFound');
  });

  it('keeps the games slug for exact super-admin sessions', async () => {
    authMock.mockResolvedValue({
      expires: '2099-01-01T00:00:00.000Z',
      user: {
        email: 'owner@example.com',
        role: 'super_admin',
      },
    });

    const { default: AdminKangurSlugPage } = await import('@/app/(admin)/admin/kangur/[...slug]/page');
    const page = await AdminKangurSlugPage({
      params: Promise.resolve({ slug: ['games'] }),
    });

    expect(page).not.toBeNull();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
