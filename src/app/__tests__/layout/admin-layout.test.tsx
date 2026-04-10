/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  adminLayoutMock,
  captureExceptionMock,
  readOptionalRequestHeadersMock,
  readOptionalServerAuthSessionMock,
  readOptionalRequestCookiesMock,
  redirectMock,
} = vi.hoisted(() => ({
  adminLayoutMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  captureExceptionMock: vi.fn(),
  readOptionalRequestHeadersMock: vi.fn(),
  readOptionalServerAuthSessionMock: vi.fn(),
  readOptionalRequestCookiesMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  redirect: redirectMock,
}));

vi.mock('@/features/admin/public', () => ({
  AdminLayout: adminLayoutMock,
  AdminRouteLoading: () => <div>Loading...</div>,
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

vi.mock('@/shared/lib/request/optional-cookies', () => ({
  readOptionalRequestCookies: readOptionalRequestCookiesMock,
}));

vi.mock('@/shared/lib/request/optional-headers', () => ({
  readOptionalRequestHeaders: readOptionalRequestHeadersMock,
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
    readOptionalRequestHeadersMock.mockResolvedValue(null);
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: ['settings.manage'],
        roleAssigned: true,
      },
    });
    readOptionalRequestCookiesMock.mockResolvedValue({
      get: vi.fn(),
    });
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
  });

  it('passes cookie-derived menu state into the admin layout shell', async () => {
    readOptionalRequestCookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'true' }),
    });

    const { AdminLayoutResolver } = await import('@/app/(admin)/layout');

    const layout = await AdminLayoutResolver({
      children: <div data-testid='admin-content'>admin</div>,
    });
    render(layout);

    expect(adminLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasInitialMenuPreference: true,
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
    expect(readOptionalRequestCookiesMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the forwarded admin session header without calling server auth again', async () => {
    readOptionalRequestHeadersMock.mockResolvedValue(
      new Headers({
        'x-admin-layout-session':
          '%7B%22user%22%3A%7B%22id%22%3A%22user-edge%22%2C%22name%22%3A%22Edge%20Admin%22%2C%22email%22%3A%22edge%40example.com%22%2C%22role%22%3A%22admin%22%2C%22roleLevel%22%3A100%2C%22isElevated%22%3Atrue%2C%22roleAssigned%22%3Atrue%2C%22permissions%22%3A%5B%22settings.manage%22%5D%2C%22accountDisabled%22%3Afalse%2C%22accountBanned%22%3Afalse%7D%7D',
      })
    );

    const { AdminLayoutResolver } = await import('@/app/(admin)/layout');

    const layout = await AdminLayoutResolver({
      children: <div data-testid='admin-content'>admin</div>,
    });
    render(layout);

    expect(readOptionalServerAuthSessionMock).not.toHaveBeenCalled();
    expect(adminLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canReadAdminSettings: true,
        session: expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-edge',
            email: 'edge@example.com',
          }),
        }),
      }),
      undefined
    );
  });

  it('captures cookie read errors and falls back to the default menu state', async () => {
    const error = new Error('cookie store unavailable');
    readOptionalRequestCookiesMock.mockResolvedValue({
      get: vi.fn().mockImplementation(() => { throw error; }),
    });

    const { AdminLayoutResolver } = await import('@/app/(admin)/layout');

    const layout = await AdminLayoutResolver({
      children: <div data-testid='admin-content'>admin</div>,
    });
    render(layout);

    expect(captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        action: 'loadAdminLayoutCookieState',
      })
    );
    expect(readOptionalRequestCookiesMock).toHaveBeenCalledTimes(1);
    expect(adminLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasInitialMenuPreference: false,
        initialMenuCollapsed: false,
      }),
      undefined
    );
  });

  it('redirects anonymous users to signin without capturing a request-scope error', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue(null);

    const { AdminLayoutResolver } = await import('@/app/(admin)/layout');

    await expect(
      AdminLayoutResolver({
        children: <div data-testid='admin-content'>admin</div>,
      })
    ).rejects.toThrow('redirect:/auth/signin');

    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('does not duplicate account-state redirects already enforced by edge auth', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
        permissions: [],
        roleAssigned: false,
        accountDisabled: true,
        accountBanned: false,
      },
    });

    const { AdminLayoutResolver } = await import('@/app/(admin)/layout');

    const layout = await AdminLayoutResolver({
      children: <div data-testid='admin-content'>admin</div>,
    });
    render(layout);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(adminLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canReadAdminSettings: false,
        session: expect.objectContaining({
          user: expect.objectContaining({
            accountDisabled: true,
            roleAssigned: false,
          }),
        }),
      }),
      undefined
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
