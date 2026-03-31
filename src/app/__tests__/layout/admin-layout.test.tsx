/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  adminLayoutMock,
  captureExceptionMock,
  readOptionalServerAuthSessionMock,
  readOptionalRequestCookiesMock,
  redirectMock,
} = vi.hoisted(() => ({
  adminLayoutMock: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
  captureExceptionMock: vi.fn(),
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

    const { default: Layout } = await import('@/app/(admin)/layout');

    const layout = await Layout({
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

  it('captures cookie read errors and falls back to the default menu state', async () => {
    const error = new Error('cookie store unavailable');
    readOptionalRequestCookiesMock.mockRejectedValue(error);

    const { default: Layout } = await import('@/app/(admin)/layout');

    const layout = await Layout({
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

    const { default: Layout } = await import('@/app/(admin)/layout');

    await expect(
      Layout({
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

    const { default: Layout } = await import('@/app/(admin)/layout');

    const layout = await Layout({
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
