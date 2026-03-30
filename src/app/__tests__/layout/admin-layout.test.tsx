/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  adminLayoutMock,
  captureExceptionMock,
  getUserPreferencesMock,
  readOptionalServerAuthSessionMock,
  readOptionalRequestCookiesMock,
  redirectMock,
} = vi.hoisted(() => ({
  adminLayoutMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  captureExceptionMock: vi.fn(),
  getUserPreferencesMock: vi.fn(),
  readOptionalServerAuthSessionMock: vi.fn(),
  readOptionalRequestCookiesMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/features/admin/public', () => ({
  AdminLayout: adminLayoutMock,
}));

vi.mock('@/features/auth/server', () => ({
  getUserPreferences: getUserPreferencesMock,
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

vi.mock('@/shared/lib/request/optional-cookies', () => ({
  readOptionalRequestCookies: readOptionalRequestCookiesMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

describe('admin app layout', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    adminLayoutMock.mockImplementation(({ children }: { children: ReactNode }) => <>{children}</>);
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: ['settings.manage'],
        roleAssigned: true,
      },
    });
    getUserPreferencesMock.mockResolvedValue({
      adminMenuCollapsed: true,
    });
    readOptionalRequestCookiesMock.mockResolvedValue({
      get: vi.fn(),
    });
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
  });

  it('passes user preference state into the admin layout shell', async () => {
    const { default: Layout } = await import('@/app/(admin)/layout');

    const layout = await Layout({
      children: <div data-testid='admin-content'>admin</div>,
    });
    render(layout);

    expect(adminLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialMenuCollapsed: true,
        canReadAdminSettings: true,
        session: expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-1',
          }),
        }),
      }),
      undefined
    );
    expect(readOptionalRequestCookiesMock).not.toHaveBeenCalled();
  });

  it('falls back to cookie-derived menu state when preference loading fails', async () => {
    const error = new Error('preferences unavailable');
    getUserPreferencesMock.mockRejectedValue(error);
    readOptionalRequestCookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'true' }),
    });

    const { default: Layout } = await import('@/app/(admin)/layout');

    const layout = await Layout({
      children: <div data-testid='admin-content'>admin</div>,
    });
    render(layout);

    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(readOptionalRequestCookiesMock).toHaveBeenCalledTimes(1);
    expect(adminLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialMenuCollapsed: true,
      }),
      undefined
    );
  });

  it('redirects anonymous users to signin without capturing a request-scope error', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue(null);

    const { default: Layout } = await import('@/app/(admin)/layout');

    await expect(
      Layout({
        children: <div data-testid='admin-content'>admin</div>,
      })
    ).rejects.toThrow('redirect:/auth/signin');

    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('preserves the account-disabled redirect target', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: ['settings.manage'],
        roleAssigned: true,
        accountDisabled: true,
      },
    });

    const { default: Layout } = await import('@/app/(admin)/layout');

    await expect(
      Layout({
        children: <div data-testid='admin-content'>admin</div>,
      })
    ).rejects.toThrow('redirect:/auth/signin?error=AccountDisabled');

    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('preserves the access-denied redirect target for users without a role', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
        permissions: [],
        roleAssigned: false,
        accountDisabled: false,
        accountBanned: false,
      },
    });

    const { default: Layout } = await import('@/app/(admin)/layout');

    await expect(
      Layout({
        children: <div data-testid='admin-content'>admin</div>,
      })
    ).rejects.toThrow('redirect:/auth/signin?error=AccessDenied');

    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
