/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const {
  signInMock,
  signOutMock,
  frontendPublicOwnerMock,
  useKangurAiTutorSessionSyncMock,
  useKangurPageContentEntryMock,
  useKangurRouteNavigatorMock,
  useKangurTutorAnchorMock,
  useOptionalKangurAuthMock,
  useOptionalKangurRoutingMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
  clearSessionUserCacheMock,
  useTurnstileMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn().mockResolvedValue({ ok: true, url: '/kangur' }),
  signOutMock: vi.fn().mockResolvedValue(undefined),
  frontendPublicOwnerMock: vi.fn(),
  useKangurAiTutorSessionSyncMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurRouteNavigatorMock: vi.fn(),
  useKangurTutorAnchorMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  clearSessionUserCacheMock: vi.fn(),
  useTurnstileMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', () => ({
  signIn: signInMock,
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

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  useOptionalFrontendPublicOwner: () => frontendPublicOwnerMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => useOptionalKangurRoutingMock(),
}));

vi.mock('@/features/kangur/services/local-kangur-platform-auth', () => ({
  clearSessionUserCache: clearSessionUserCacheMock,
}));

vi.mock('@/features/kangur/ui/login-page/use-turnstile', () => ({
  useTurnstile: useTurnstileMock,
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
    vi.useRealTimers();
    vi.clearAllMocks();
    signInMock.mockResolvedValue({ ok: true, url: '/kangur' });
    frontendPublicOwnerMock.mockReturnValue(null);
    useOptionalKangurRoutingMock.mockReturnValue(null);
    usePathnameMock.mockReturnValue('/kangur/login');
    useRouterMock.mockReturnValue({ push: vi.fn(), refresh: vi.fn() });
    useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
    useKangurPageContentEntryMock.mockReturnValue({ entry: null });
    useKangurRouteNavigatorMock.mockReturnValue({ push: vi.fn() });
    useOptionalKangurAuthMock.mockReturnValue(null);
    useTurnstileMock.mockReturnValue({ containerRef: { current: null }, isReady: false });
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

  it('focuses the identifier input when the login page opens', async () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await waitFor(() => {
      expect(screen.getByTestId('kangur-login-identifier-input')).toHaveFocus();
    });
  });

  it('shows a live sign-in hint that changes between student, parent, and account creation modes', async () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input');
    const modeHint = screen.getByTestId('kangur-login-mode-hint');
    const passwordHint = screen.getByTestId('kangur-login-password-hint');

    expect(modeHint).toHaveTextContent((plMessages as any).KangurLogin.signInModeHint);
    expect(passwordHint).toHaveTextContent((plMessages as any).KangurLogin.studentPasswordHint);

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });

    expect(modeHint).toHaveTextContent((plMessages as any).KangurLogin.parentLoginModeHint);
    expect(passwordHint).toHaveTextContent((plMessages as any).KangurLogin.parentPasswordHint);

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    await waitFor(() => {
      expect(modeHint).toHaveTextContent(
        (plMessages as any).KangurLogin.createAccountModeHint
      );
      expect(passwordHint).toHaveTextContent(
        (plMessages as any).KangurLogin.createAccountPasswordHint
      );
    });
  });

  it('keeps the sign-in flow Turnstile-free and surfaces inline captcha load errors from the create-account hook', async () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(useTurnstileMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    await waitFor(() => {
      expect(useTurnstileMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onLoadError: expect.any(Function),
        })
      );
    });

    const turnstileOptions = useTurnstileMock.mock.lastCall?.[0] as
      | { onLoadError?: () => void }
      | undefined;

    act(() => {
      turnstileOptions?.onLoadError?.();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      (plMessages as any).KangurLogin.captchaVerificationFailed
    );
  });

  it('can hide the auth mode tabs for a single-purpose login surface', () => {
    renderWithIntl(
      <KangurLoginPage
        defaultCallbackUrl='/kangur'
        parentAuthMode='sign-in'
        showParentAuthModeTabs={false}
      />
    );

    expect(
      screen.queryByRole('button', { name: (plMessages as any).KangurLogin.haveAccount })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-mode-hint')).toBeInTheDocument();
  });

  it('toggles password visibility and resets it when the auth mode changes', async () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const passwordInput = screen.getByLabelText('Hasło') as HTMLInputElement;
    const showPasswordButton = screen.getByRole('button', {
      name: (plMessages as any).KangurLogin.showPassword,
    });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(showPasswordButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.hidePassword })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(
        screen.getByRole('button', { name: (plMessages as any).KangurLogin.showPassword })
      ).toBeInTheDocument();
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

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input');
    const passwordInput = screen.getByLabelText('Hasło');

    await waitFor(() => {
      expect(identifierInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    fireEvent.change(identifierInput, { target: { value: 'janek123' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
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
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          callbackUrl: '/kangur',
          email: 'parent@example.com',
          password: 'sekret123',
          redirect: false,
        })
      );
    });
  });

  it('uses the canonical localized home callback when Kangur owns the public frontend', async () => {
    frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
    usePathnameMock.mockReturnValue('/en/login');

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
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input');
    const passwordInput = screen.getByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          callbackUrl: '/en',
          email: 'parent@example.com',
          password: 'sekret123',
          redirect: false,
        })
      );
    });
  });

  it('canonicalizes post-login callback redirects when Kangur owns the public frontend', async () => {
    const pushMock = vi.fn();
    const refreshMock = vi.fn();
    const checkAppStateMock = vi.fn().mockResolvedValue(undefined);

    frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
    usePathnameMock.mockReturnValue('/en/login');
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('callbackUrl=%2Fen%2Fkangur%2Fprofile%3Ftab%3Dstats%23summary')
    );
    useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock });
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
    });
    signInMock.mockResolvedValue({
      ok: true,
      url: `${window.location.origin}/en/kangur/profile?tab=stats#summary`,
    });
    window.history.replaceState(
      {},
      '',
      '/en/login?callbackUrl=%2Fen%2Fkangur%2Fprofile%3Ftab%3Dstats%23summary'
    );

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
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage />);

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          callbackUrl: '/en/profile?tab=stats#summary',
          email: 'parent@example.com',
          password: 'sekret123',
          redirect: false,
        })
      );
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/en/profile?tab=stats#summary', {
        scroll: false,
      });
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('normalizes parent email casing and switches the identifier field into email mode', async () => {
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
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: ' Parent@Example.COM ' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });

    expect(identifierInput).toHaveAttribute('type', 'email');
    expect(identifierInput).toHaveAttribute('autocomplete', 'email');
    expect(identifierInput).toHaveAttribute('inputmode', 'email');

    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          email: 'parent@example.com',
          password: 'sekret123',
        })
      );
      expect(identifierInput.value).toBe('parent@example.com');
    });
  });

  it('normalizes the parent email on blur before submit', () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement;

    fireEvent.change(identifierInput, { target: { value: ' Parent@Example.COM ' } });
    fireEvent.blur(identifierInput);

    expect(identifierInput.value).toBe('parent@example.com');
    expect(identifierInput).toHaveAttribute('type', 'email');
  });

  it('trims the student nickname on blur', () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement;

    fireEvent.change(identifierInput, { target: { value: ' janek123 ' } });
    fireEvent.blur(identifierInput);

    expect(identifierInput.value).toBe('janek123');
    expect(identifierInput).toHaveAttribute('type', 'text');
  });

  it('blocks parent sign-in early when the parent email is invalid', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input');
    const passwordInput = screen.getByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent(
      (plMessages as any).KangurLogin.invalidParentEmailNotice
    );
    expect(identifierInput).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    expect(identifierInput.getAttribute('aria-describedby')).toContain(alert.id);
    expect(passwordInput.getAttribute('aria-describedby')).toContain(alert.id);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('blocks parent account creation early when the password is too short', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    const identifierInput = screen.getByTestId('kangur-login-identifier-input');
    const passwordInput = screen.getByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent(
      (plMessages as any).KangurLogin.passwordRequirement
    );
    expect(identifierInput).toHaveAttribute('aria-invalid', 'false');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput.getAttribute('aria-describedby')).toContain(alert.id);

    fireEvent.change(passwordInput, { target: { value: 'strong-pass-123' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the email, clears the password, and focuses the next field when switching auth modes', async () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Hasło') as HTMLInputElement;

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    expect(identifierInput.value).toBe('parent@example.com');
    expect(passwordInput.value).toBe('');

    await waitFor(() => {
      expect(passwordInput).toHaveFocus();
    });
  });

  it('shows a staged notice while parent credentials are being verified', async () => {
    const pushMock = vi.fn();
    const refreshMock = vi.fn();
    const checkAppStateMock = vi.fn().mockResolvedValue(undefined);
    let resolveVerify:
      | ((value: { ok: boolean; status: number; json: () => Promise<Record<string, unknown>> }) => void)
      | null = null;

    useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock });
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
    });

    const verifyResponse = new Promise<{
      ok: boolean;
      status: number;
      json: () => Promise<Record<string, unknown>>;
    }>((resolve) => {
      resolveVerify = resolve;
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
        return await verifyResponse;
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

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(
        screen.getByText((plMessages as any).KangurLogin.verifyingCredentialsNotice)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: (plMessages as any).KangurLogin.loginSubmitting })
      ).toBeDisabled();
    });

    resolveVerify?.({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, challengeId: 'challenge-1' }),
    });

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          callbackUrl: '/kangur',
          email: 'parent@example.com',
          password: 'sekret123',
          redirect: false,
        })
      );
    });
  });

  it('moves to password setup, clears the old password, and focuses the password field when the account needs setup', async () => {
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
          json: async () => ({
            ok: false,
            code: 'PASSWORD_SETUP_REQUIRED',
          }),
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

    const identifierInput = screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Hasło') as HTMLInputElement;

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        (plMessages as any).KangurLogin.passwordSetupRequiredNotice
      );
    });

    expect(identifierInput.value).toBe('parent@example.com');
    expect(passwordInput.value).toBe('');

    await waitFor(() => {
      expect(passwordInput).toHaveFocus();
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
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
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

  it('still signs a student in when old-session cleanup fails before login', async () => {
    const pushMock = vi.fn();
    const refreshMock = vi.fn();
    const checkAppStateMock = vi.fn().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock });
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
    });
    signOutMock.mockRejectedValueOnce(new Error('signout failed'));

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/learner-signout')) {
        throw new Error('cleanup failed');
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

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'janek123' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/kangur/auth/learner-signin',
        expect.objectContaining({ method: 'POST' })
      );
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
    });
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
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
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

  it('still signs a parent in when learner-session cleanup fails before login', async () => {
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
        throw new Error('cleanup failed');
      }
      if (url.endsWith('/api/auth/verify-credentials')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, challengeId: 'challenge-1' }),
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

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          callbackUrl: '/kangur',
          email: 'parent@example.com',
          password: 'sekret123',
          redirect: false,
        })
      );
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a parent login error when next-auth rejects the verified credentials callback', async () => {
    signInMock.mockResolvedValueOnce({
      ok: false,
      error: 'CredentialsSignin',
      url: null,
    });

    const checkAppStateMock = vi.fn().mockResolvedValue(undefined);
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
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(
        screen.getByRole('alert')
      ).toHaveTextContent((plMessages as any).KangurLogin.parentLoginFailed);
    });

    expect(checkAppStateMock).not.toHaveBeenCalled();
  });

  it('falls back to a full reload when post-login auth refresh still resolves anonymous', async () => {
    const pushMock = vi.fn();
    const refreshMock = vi.fn();
    const checkAppStateMock = vi.fn().mockResolvedValue(null);

    useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock });
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
    });
    window.history.replaceState({}, '', '/kangur');

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

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'janek123' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(checkAppStateMock).toHaveBeenCalledWith({ timeoutMs: 12_000 });
    });

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 700);
      });
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('returns to sign-in mode when the backend says the parent account is already ready', async () => {
    const readyMessage = 'Konto rodzica jest gotowe. Zaloguj się e-mailem i hasłem.';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/parent-account/create')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            emailVerified: true,
            hasPassword: true,
            message: readyMessage,
          }),
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

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(readyMessage);
    });

    expect(screen.queryByText(/Sprawdź skrzynkę:/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.submitParentLogin })
    ).toBeInTheDocument();
    expect(passwordInput.value).toBe('');

    await waitFor(() => {
      expect(passwordInput).toHaveFocus();
    });
  });

  it('shows the backend verification message when account creation is pending email confirmation', async () => {
    const verificationMessage = 'Wysłaliśmy nowy email potwierdzający.';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/parent-account/create')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            emailVerified: false,
            hasPassword: true,
            message: verificationMessage,
          }),
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

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(screen.getByText(verificationMessage)).toBeInTheDocument();
    });

    expect(
      screen.getByText((plMessages as any).KangurLogin.checkInboxLabel.replace('{email}', 'parent@example.com'))
    ).toBeInTheDocument();
    expect(
      screen.queryByText((plMessages as any).KangurLogin.createAccountInstruction)
    ).not.toBeInTheDocument();
  });

  it('normalizes the parent email before account creation and verification messaging', async () => {
    const verificationMessage = 'Wysłaliśmy nowy email potwierdzający.';

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/parent-account/create')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            emailVerified: false,
            hasPassword: true,
            message: verificationMessage,
          }),
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

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: ' Parent@Example.COM ' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(screen.getByText(verificationMessage)).toBeInTheDocument();
    });

    const createCall = fetchMock.mock.calls.find(([input]) => {
      const url = typeof input === 'string' ? input : input.toString();
      return url.endsWith('/api/kangur/auth/parent-account/create');
    });

    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      email: 'parent@example.com',
      password: 'sekret123',
    });
    expect(
      screen.getByText((plMessages as any).KangurLogin.checkInboxLabel.replace('{email}', 'parent@example.com'))
    ).toBeInTheDocument();
  });

  it('lets the user reopen the parent account form and correct the email from the verification state', async () => {
    const verificationMessage = 'Wysłaliśmy nowy email potwierdzający.';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/parent-account/create')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            emailVerified: false,
            hasPassword: true,
            message: verificationMessage,
          }),
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

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.createAccount })
    );

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(screen.getByText(verificationMessage)).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: (plMessages as any).KangurLogin.changeEmailAction })
    );

    await waitFor(() => {
      expect(screen.queryByText(verificationMessage)).not.toBeInTheDocument();
      expect(screen.getByTestId('kangur-login-form')).toBeInTheDocument();
    });

    expect((screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement).value).toBe(
      'parent@example.com'
    );
    expect((screen.getByLabelText('Hasło') as HTMLInputElement).value).toBe('');

    await waitFor(() => {
      expect(screen.getByTestId('kangur-login-identifier-input')).toHaveFocus();
    });
  });

  it('lets the user return to sign in from the verification state when the create-account form is hidden', async () => {
    const verificationMessage = 'Wysłaliśmy nowy email potwierdzający.';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/kangur/auth/parent-account/create')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            emailVerified: false,
            hasPassword: true,
            message: verificationMessage,
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(
      <KangurLoginPage
        defaultCallbackUrl='/kangur'
        parentAuthMode='create-account'
        showParentAuthModeTabs={false}
      />
    );

    const identifierInput = await screen.findByTestId('kangur-login-identifier-input');
    const passwordInput = await screen.findByLabelText('Hasło');

    fireEvent.change(identifierInput, { target: { value: 'parent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'sekret123' } });
    fireEvent.submit(screen.getByTestId('kangur-login-form'));

    await waitFor(() => {
      expect(screen.getByText(verificationMessage)).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: (plMessages as any).KangurLogin.continueToSignInAction,
      })
    );

    await waitFor(() => {
      expect(screen.queryByText(verificationMessage)).not.toBeInTheDocument();
      expect(screen.getByTestId('kangur-login-form')).toBeInTheDocument();
    });

    expect((screen.getByTestId('kangur-login-identifier-input') as HTMLInputElement).value).toBe(
      'parent@example.com'
    );
    expect((screen.getByLabelText('Hasło') as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('kangur-login-mode-hint')).toHaveTextContent(
      (plMessages as any).KangurLogin.parentLoginModeHint
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Hasło')).toHaveFocus();
    });
  });
});
