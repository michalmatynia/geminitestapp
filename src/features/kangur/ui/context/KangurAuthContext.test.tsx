/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
  useRouterMock,
  routerPushMock,
  routerRefreshMock,
  meMock,
  prepareLoginHrefMock,
  redirectToLoginMock,
  logoutMock,
  selectLearnerMock,
} = vi.hoisted(() => ({
  logKangurClientErrorMock: globalThis.__kangurClientErrorMocks().logKangurClientErrorMock,
  withKangurClientError: vi.fn(
    async <T,>(
      report: { context?: Record<string, unknown> },
      task: () => Promise<T>,
      options: {
        fallback: T | (() => T);
        onError?: (error: unknown) => void;
        shouldReport?: (error: unknown) => boolean;
        shouldRethrow?: (error: unknown) => boolean;
      }
    ): Promise<T> => {
      try {
        return await task();
      } catch (error) {
        if (options.shouldReport?.(error) ?? true) {
          logKangurClientErrorMock(error, { ...(report.context ?? {}) });
        }
        options.onError?.(error);
        if (options.shouldRethrow?.(error)) {
          throw error;
        }
        return typeof options.fallback === 'function'
          ? (options.fallback as () => T)()
          : options.fallback;
      }
    }
  ),
  withKangurClientErrorSync: vi.fn(
    <T,>(
      report: { context?: Record<string, unknown> },
      task: () => T,
      options: {
        fallback: T | (() => T);
        onError?: (error: unknown) => void;
        shouldReport?: (error: unknown) => boolean;
        shouldRethrow?: (error: unknown) => boolean;
      }
    ): T => {
      try {
        return task();
      } catch (error) {
        if (options.shouldReport?.(error) ?? true) {
          logKangurClientErrorMock(error, { ...(report.context ?? {}) });
        }
        options.onError?.(error);
        if (options.shouldRethrow?.(error)) {
          throw error;
        }
        return typeof options.fallback === 'function'
          ? (options.fallback as () => T)()
          : options.fallback;
      }
    }
  ),
  useRouterMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  meMock: vi.fn(),
  prepareLoginHrefMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  selectLearnerMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: meMock,
      prepareLoginHref: prepareLoginHrefMock,
      redirectToLogin: redirectToLoginMock,
      logout: logoutMock,
    },
    learners: {
      select: selectLearnerMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import { getKangurLoginHref } from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  clearKangurAuthBootstrapCache,
  KangurAuthProvider,
  useKangurAuth,
} from '@/features/kangur/ui/context/KangurAuthContext';

const AUTHENTICATED_USER = {
  id: 'parent-1',
  full_name: 'Ada Parent',
  email: 'ada@example.com',
  role: 'user' as const,
  actorType: 'learner' as const,
  canManageLearners: false,
  ownerUserId: 'parent-1',
  activeLearner: {
    id: 'learner-1',
    ownerUserId: 'parent-1',
    displayName: 'Ada',
    loginName: 'ada-child',
    status: 'active' as const,
    legacyUserKey: 'ada@example.com',
    createdAt: '2026-03-06T10:00:00.000Z',
    updatedAt: '2026-03-06T10:00:00.000Z',
  },
  learners: [],
};

const AuthProbe = (): React.JSX.Element => {
  const {
    canAccessParentAssignments,
    hasResolvedAuth,
    isLoadingAuth,
    isLoggingOut,
    checkAppState,
    logout,
    navigateToLogin,
  } = useKangurAuth();
  const [lastCheckResult, setLastCheckResult] = useState<string>('idle');

  return (
    <div>
      <button type='button' onClick={navigateToLogin}>
        Open login
      </button>
      <button
        type='button'
        onClick={() => navigateToLogin({ authMode: 'create-account' })}
      >
        Open create-account
      </button>
      <button type='button' onClick={() => logout(false)}>
        Logout
      </button>
      <button
        type='button'
        onClick={async () => {
          const nextUser = await checkAppState({ timeoutMs: 10_000 });
          setLastCheckResult(nextUser?.id ?? 'anonymous');
        }}
      >
        Refresh auth
      </button>
      <div data-testid='kangur-auth-loading'>{String(isLoadingAuth)}</div>
      <div data-testid='kangur-auth-resolved'>{String(hasResolvedAuth)}</div>
      <div data-testid='kangur-auth-logout-pending'>{String(Boolean(isLoggingOut))}</div>
      <div data-testid='kangur-parent-assignment-access'>
        {String(canAccessParentAssignments)}
      </div>
      <div data-testid='kangur-auth-last-check'>{lastCheckResult}</div>
    </div>
  );
};

describe('KangurAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurAuthBootstrapCache();
    window.history.replaceState({}, '', '/kangur');
    useRouterMock.mockReturnValue({
      push: routerPushMock,
      refresh: routerRefreshMock,
    });
    meMock.mockResolvedValue(AUTHENTICATED_USER);
    logoutMock.mockResolvedValue(undefined);
    prepareLoginHrefMock.mockImplementation(
      (returnUrl: string) => `/kangur/login?callbackUrl=${encodeURIComponent(returnUrl)}`
    );
  });

  it('exposes assignment access only when auth resolves an active learner session', async () => {
    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('true');
    });
  });

  it('reuses the bootstrap auth session across provider remounts', async () => {
    const firstRender = render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    });

    expect(meMock).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('true');
    });

    expect(meMock).toHaveBeenCalledTimes(1);
  });

  it('navigates to the Kangur login page using the current location as callback target', async () => {
    const user = userEvent.setup();

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(meMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByRole('button', { name: 'Open login' }));

    expect(routerPushMock).toHaveBeenCalledWith(
      getKangurLoginHref('/kangur', '/kangur')
    );
    expect(prepareLoginHrefMock).not.toHaveBeenCalled();
    expect(redirectToLoginMock).not.toHaveBeenCalled();
  });

  it('navigates to the Kangur login page in create-account mode when requested', async () => {
    const user = userEvent.setup();

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(meMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByRole('button', { name: 'Open create-account' }));

    const loginHref = getKangurLoginHref('/kangur', '/kangur');
    const parsed = new URL(loginHref, 'https://kangur.local');
    parsed.searchParams.set('authMode', 'create-account');
    expect(routerPushMock).toHaveBeenCalledWith(
      `${parsed.pathname}${parsed.search}${parsed.hash}`
    );
    expect(prepareLoginHrefMock).not.toHaveBeenCalled();
    expect(redirectToLoginMock).not.toHaveBeenCalled();
  });

  it('canonicalizes the login callback target when Kangur owns the public frontend root', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/en/kangur/profile?tab=stats#summary');

    render(
      <KangurRoutingProvider basePath='/' pageKey='LearnerProfile' requestedPath='/profile'>
        <KangurAuthProvider>
          <AuthProbe />
        </KangurAuthProvider>
      </KangurRoutingProvider>
    );

    await waitFor(() => {
      expect(meMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByRole('button', { name: 'Open login' }));

    expect(routerPushMock).toHaveBeenCalledWith(
      getKangurLoginHref('/', '/en/profile?tab=stats#summary')
    );
  });

  it('drops parent-assignment access in anonymous mode', async () => {
    meMock.mockRejectedValueOnce({ status: 401 });

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('false');
    });
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });

  it('still reports unexpected auth bootstrap failures', async () => {
    meMock.mockRejectedValueOnce(new Error('boom'));

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    });

    expect(logKangurClientErrorMock).toHaveBeenCalledTimes(1);
  });

  it('skips auth bootstrap during synthetic social batch captures', async () => {
    window.history.replaceState(
      {},
      '',
      '/kangur/lessons?kangurCapture=social-batch'
    );

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('false');
    });

    expect(meMock).not.toHaveBeenCalled();
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });

  it('keeps bootstrap auth unresolved after the soft timeout until the original request settles', async () => {
    vi.useFakeTimers();
    let resolveInitialAuth: ((value: typeof AUTHENTICATED_USER) => void) | null = null;

    meMock.mockImplementationOnce(
      () =>
        new Promise<typeof AUTHENTICATED_USER>((resolve) => {
          resolveInitialAuth = resolve;
        })
    );

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-auth-resolved')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('false');

    await act(async () => {
      resolveInitialAuth?.(AUTHENTICATED_USER);
      await Promise.resolve();
    });

    expect(screen.getByTestId('kangur-auth-resolved')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('true');
  });

  it('drops parent-assignment access immediately after logout', async () => {
    const user = userEvent.setup();
    meMock.mockResolvedValueOnce(AUTHENTICATED_USER);
    meMock.mockRejectedValueOnce({ status: 401 });

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('true');
    });

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('false');
    });
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(logoutMock).toHaveBeenCalledWith();
  });

  it('does not restore the previous session when logout races with an earlier auth check', async () => {
    const user = userEvent.setup();
    let resolveInitialAuth: ((value: typeof AUTHENTICATED_USER) => void) | null = null;

    meMock.mockImplementationOnce(
      () =>
        new Promise<typeof AUTHENTICATED_USER>((resolve) => {
          resolveInitialAuth = resolve;
        })
    );
    meMock.mockRejectedValueOnce({ status: 401 });

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    resolveInitialAuth?.(AUTHENTICATED_USER);

    await waitFor(() => {
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('false');
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(meMock).toHaveBeenCalledTimes(2);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated logout clicks while the logout request is still in flight', async () => {
    const user = userEvent.setup();
    let resolveLogout: (() => void) | null = null;

    meMock.mockResolvedValueOnce(AUTHENTICATED_USER);
    meMock.mockRejectedValueOnce({ status: 401 });
    logoutMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        })
    );

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('true');
      expect(screen.getByTestId('kangur-auth-logout-pending')).toHaveTextContent('false');
    });

    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    await user.click(logoutButton);
    await user.click(logoutButton);

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('kangur-auth-logout-pending')).toHaveTextContent('true');

    resolveLogout?.();

    await waitFor(() => {
      expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('false');
      expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('kangur-auth-logout-pending')).toHaveTextContent('false');
    });

    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('allows a manual auth refresh to resolve beyond the bootstrap timeout window', async () => {
    vi.useFakeTimers();
    let resolveManualAuth: ((value: typeof AUTHENTICATED_USER) => void) | null = null;

    meMock.mockImplementationOnce(
      () =>
        new Promise<typeof AUTHENTICATED_USER>(() => {
          // Keep bootstrap pending so the provider must rely on the timeout.
        })
    );
    meMock.mockImplementationOnce(
      () =>
        new Promise<typeof AUTHENTICATED_USER>((resolve) => {
          resolveManualAuth = resolve;
        })
    );

    render(
      <KangurAuthProvider>
        <AuthProbe />
      </KangurAuthProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-auth-resolved')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh auth' }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('true');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_500);
    });
    expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('true');

    await act(async () => {
      resolveManualAuth?.(AUTHENTICATED_USER);
      await Promise.resolve();
    });

    expect(screen.getByTestId('kangur-auth-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-auth-resolved')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-parent-assignment-access')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-auth-last-check')).toHaveTextContent('parent-1');
  });
});
