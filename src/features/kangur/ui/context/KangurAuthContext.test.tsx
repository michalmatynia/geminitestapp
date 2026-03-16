/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const {
  useRouterMock,
  routerPushMock,
  routerRefreshMock,
  meMock,
  prepareLoginHrefMock,
  redirectToLoginMock,
  logoutMock,
  selectLearnerMock,
  logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  meMock: vi.fn(),
  prepareLoginHrefMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  selectLearnerMock: vi.fn(),
  ...globalThis.__kangurClientErrorMocks(),
}));

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
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
import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';

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
  const { canAccessParentAssignments, isLoadingAuth, logout, navigateToLogin } = useKangurAuth();

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
      <div data-testid='kangur-auth-loading'>{String(isLoadingAuth)}</div>
      <div data-testid='kangur-parent-assignment-access'>
        {String(canAccessParentAssignments)}
      </div>
    </div>
  );
};

describe('KangurAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      getKangurLoginHref('/kangur', window.location.href)
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

    const loginHref = getKangurLoginHref('/kangur', window.location.href);
    const parsed = new URL(loginHref, 'https://kangur.local');
    parsed.searchParams.set('authMode', 'create-account');
    expect(routerPushMock).toHaveBeenCalledWith(
      `${parsed.pathname}${parsed.search}${parsed.hash}`
    );
    expect(prepareLoginHrefMock).not.toHaveBeenCalled();
    expect(redirectToLoginMock).not.toHaveBeenCalled();
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
});
