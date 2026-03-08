/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useRouterMock,
  routerPushMock,
  meMock,
  prepareLoginHrefMock,
  redirectToLoginMock,
  logoutMock,
  selectLearnerMock,
  logKangurClientErrorMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  routerPushMock: vi.fn(),
  meMock: vi.fn(),
  prepareLoginHrefMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  selectLearnerMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
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
}));

import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';

const AUTHENTICATED_USER = {
  id: 'parent-1',
  full_name: 'Ada Parent',
  email: 'ada@example.com',
  role: 'user' as const,
  actorType: 'parent' as const,
  canManageLearners: true,
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
  const { isLoadingAuth, navigateToLogin } = useKangurAuth();

  return (
    <div>
      <button type='button' onClick={navigateToLogin}>
        Open login
      </button>
      <div data-testid='kangur-auth-loading'>{String(isLoadingAuth)}</div>
    </div>
  );
};

describe('KangurAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({
      push: routerPushMock,
    });
    meMock.mockResolvedValue(AUTHENTICATED_USER);
    prepareLoginHrefMock.mockImplementation(
      (returnUrl: string) => `/kangur/login?callbackUrl=${encodeURIComponent(returnUrl)}`
    );
  });

  it('routes login navigation through the Next router using the prepared Kangur login href', async () => {
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

    expect(prepareLoginHrefMock).toHaveBeenCalledWith(window.location.href);
    expect(routerPushMock).toHaveBeenCalledWith(
      `/kangur/login?callbackUrl=${encodeURIComponent(window.location.href)}`
    );
    expect(redirectToLoginMock).not.toHaveBeenCalled();
  });
});
