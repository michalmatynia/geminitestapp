/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

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

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('KangurLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({ push: vi.fn(), refresh: vi.fn() });
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
    useKangurPageContentEntryMock.mockReturnValue({ entry: null });
    useKangurRouteNavigatorMock.mockReturnValue({ push: vi.fn() });
    useOptionalKangurAuthMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the identifier input value after a change', () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const input = screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'a' } });

    expect(input.value).toBe('a');
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

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input');
    const passwordInput = screen.getByLabelText('Hasło');

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

  it('routes email identifiers to the parent sign-in flow', async () => {
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
      if (url.endsWith('/api/auth/verify-credentials')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, challengeId: 'challenge-1' }),
        };
      }
      if (url.endsWith('/api/auth/csrf')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ csrfToken: 'csrf-1' }),
        };
      }
      if (url.endsWith('/api/auth/callback/credentials')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ url: '/kangur' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input');
    const passwordInput = screen.getByLabelText('Hasło');

    await waitFor(() => {
      expect(identifierInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/verify-credentials',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows a student login confirmation and closes the inline modal after success', async () => {
    const onClose = vi.fn();
    const pushMock = vi.fn();
    const refreshMock = vi.fn();
    const checkAppStateMock = vi.fn().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock });
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
    });

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

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' onClose={onClose} />);

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'janek123' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText((plMessages as any).KangurLogin.successStudent)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    expect(pushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a parent login confirmation and closes the inline modal after success', async () => {
    const onClose = vi.fn();
    const pushMock = vi.fn();
    const refreshMock = vi.fn();
    const checkAppStateMock = vi.fn().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock });
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/learner-signout')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      }
      if (url.endsWith('/api/auth/verify-credentials')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, challengeId: 'challenge-1' }),
        };
      }
      if (url.endsWith('/api/auth/csrf')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ csrfToken: 'csrf-1' }),
        };
      }
      if (url.endsWith('/api/auth/callback/credentials')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ url: '/kangur' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' onClose={onClose} />);

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText((plMessages as any).KangurLogin.successParent)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    expect(pushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
