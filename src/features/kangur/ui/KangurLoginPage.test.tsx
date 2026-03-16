/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  signOutMock,
  useKangurAiTutorSessionSyncMock,
  useKangurPageContentEntryMock,
  useKangurRouteNavigatorMock,
  useKangurTutorAnchorMock,
  useOptionalKangurAuthMock,
  useRouterMock,
  useSearchParamsMock,
  clearSessionUserCacheMock,
} = vi.hoisted(() => ({
  signOutMock: vi.fn().mockResolvedValue(undefined),
  useKangurAiTutorSessionSyncMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurRouteNavigatorMock: vi.fn(),
  useKangurTutorAnchorMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  clearSessionUserCacheMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', () => ({
  signOut: signOutMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: useKangurAiTutorSessionSyncMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: useKangurRouteNavigatorMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: useKangurTutorAnchorMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
}));

vi.mock('@/features/kangur/services/local-kangur-platform-auth', () => ({
  clearSessionUserCache: clearSessionUserCacheMock,
}));

import { KangurLoginPage } from './KangurLoginPage';

describe('KangurLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({ refresh: vi.fn() });
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
    useKangurPageContentEntryMock.mockReturnValue({ entry: null });
    useKangurRouteNavigatorMock.mockReturnValue({ push: vi.fn() });
    useOptionalKangurAuthMock.mockReturnValue(null);
  });

  it('restores focus to the identifier input after the first change', async () => {
    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const input = screen.getByTestId('kangur-login-identifier-input');
    expect(input).not.toHaveFocus();

    fireEvent.change(input, { target: { value: 'a' } });

    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('clears cached auth state after a successful student sign-in', async () => {
    const pushMock = vi.fn();
    useKangurRouteNavigatorMock.mockReturnValue({ push: pushMock });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/learner-signout')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      }
      if (url.endsWith('/api/kangur/auth/learner-signin')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ learnerId: 'learner-1' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    await waitFor(() => {
      expect(identifierInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    fireEvent.change(identifierInput, { target: { value: 'janek123' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(clearSessionUserCacheMock).toHaveBeenCalled();
    });
  });
});
