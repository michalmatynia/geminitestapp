/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { signOut } from 'next-auth/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS } from '@/features/kangur/settings';
import plMessages from '@/i18n/messages/pl.json';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

const {
  trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
  checkAppStateMock,
  locationAssignMock,
  routerPushMock,
  routerRefreshMock,
  signOutMock,
  useKangurAiTutorSessionSyncMock,
  useOptionalKangurAuthMock,
  useKangurPageContentEntryMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  trackKangurClientEventMock: vi.fn(),
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  checkAppStateMock: vi.fn(),
  locationAssignMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  signOutMock: vi.fn(),
  useKangurAiTutorSessionSyncMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', () => ({
  signOut: signOutMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutorSessionSync: useKangurAiTutorSessionSyncMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('KangurLoginPage', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: locationAssignMock,
        hash: '',
        href: 'https://example.com/kangur/game',
        origin: 'https://example.com',
        pathname: '/kangur/game',
        search: '',
      },
      configurable: true,
    });
    useRouterMock.mockReturnValue({
      push: routerPushMock,
      refresh: routerRefreshMock,
    });
    usePathnameMock.mockReturnValue('/kangur/login');
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('callbackUrl=%2Ftests%3Ffocus%3Ddivision')
    );
    signOutMock.mockResolvedValue(undefined);
    checkAppStateMock.mockResolvedValue(undefined);
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
      isAuthenticated: false,
    });
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === '/api/kangur/auth/learner-signout') {
          return {
            json: vi.fn().mockResolvedValue({ ok: true }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/auth/csrf') {
          return {
            json: vi.fn().mockResolvedValue({ csrfToken: 'kangur-parent-csrf' }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/auth/verify-credentials') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              challengeId: 'challenge-1',
              mfaRequired: false,
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/auth/callback/credentials') {
          return {
            json: vi.fn().mockResolvedValue({ url: '/tests?focus=division' }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/create') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              email: 'parent@example.com',
              created: true,
              emailVerified: false,
              hasPassword: true,
              retryAfterMs: 60_000,
              debug: {
                verificationUrl:
                  'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-1',
              },
              message:
                'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/resend') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              email: 'parent@example.com',
              created: false,
              emailVerified: false,
              hasPassword: true,
              retryAfterMs: 60_000,
              debug: {
                verificationUrl:
                  'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-2',
              },
              message:
                'Wysłaliśmy nowy e-mail potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-email/verify') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              email: 'parent@example.com',
              callbackUrl: '/tests?focus=division',
              emailVerified: true,
              message:
                'E-mail został zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i możesz zalogować się e-mailem oraz hasłem.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/learner-signin') {
          return {
            json: vi.fn().mockResolvedValue({ learnerId: 'learner-7' }),
            ok: true,
            status: 200,
          };
        }

        throw new Error(`Unexpected fetch: ${url}`);
      })
    );
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });

  it('renders a single unified login form with explicit parent account actions', () => {
    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(screen.getByText('Zaloguj się')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-hero-logo').querySelector('svg')).not.toBeNull();
    expect(screen.queryByText('Konto StudiQ')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true');
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'unknown');
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute(
      'data-tutor-anchor',
      'login_form'
    );
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByTestId('kangur-login-identifier-input')).toHaveAttribute(
      'data-tutor-anchor',
      'login_identifier_field'
    );
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mam konto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utwórz konto' })).toBeInTheDocument();
    expect(screen.queryByText('Jeśli loguje się rodzic')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Rodzic' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Uczeń' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /magiczny link/i })).not.toBeInTheDocument();
    expect(useKangurAiTutorSessionSyncMock).toHaveBeenCalledWith({
      learnerId: null,
      sessionContext: {
        surface: 'auth',
        contentId: 'auth:login:sign-in',
        title: 'Logowanie do Kangur',
        description:
          'Rodzic loguje się emailem i hasłem. Uczeń loguje się nickiem i hasłem.',
      },
    });
  });

  it('has no obvious accessibility violations in the login shell', async () => {
    const { container } = renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await screen.findByText('Zaloguj się');
    await expectNoAxeViolations(container);
  });

  it('uses Mongo-backed login form copy while keeping the identifier helper hidden', () => {
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => ({
      data: undefined,
      entry:
        entryId === 'login-page-form'
          ? {
              id: 'login-page-form',
              title: 'Zaloguj się',
              summary: 'Wejdź do Kangur jako rodzic albo uczeń z jednego formularza.',
            }
          : {
              id: 'login-page-identifier-field',
              title: 'Email albo nick ucznia',
              summary:
                'Wpisz email rodzica lub login ucznia, aby uruchomić właściwy tryb logowania.',
            },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    }));

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(useKangurAiTutorSessionSyncMock).toHaveBeenCalledWith({
      learnerId: null,
      sessionContext: {
        surface: 'auth',
        contentId: 'auth:login:sign-in',
        title: 'Zaloguj się',
        description: 'Wejdź do Kangur jako rodzic albo uczeń z jednego formularza.',
      },
    });
    expect(
      screen.queryByText(
        'Wpisz email rodzica lub login ucznia, aby uruchomić właściwy tryb logowania.'
      )
    ).not.toBeInTheDocument();
  });

  it('switches the parent form into explicit create-account mode with a minimal create-account layout', async () => {
    const user = userEvent.setup();

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.click(screen.getByRole('button', { name: 'Utwórz konto' }));

    expect(screen.getByTestId('kangur-login-identifier-input')).toHaveAttribute(
      'placeholder',
      'rodzic@example.com'
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utwórz konto rodzica' })).toBeInTheDocument();
    expect(screen.queryByText('Jak założyć konto rodzica')).not.toBeInTheDocument();
  });

  it('starts in create-account mode when the route requests it explicitly', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'callbackUrl=%2Ftests%3Ffocus%3Ddivision&authMode=create-account'
      )
    );

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(screen.getByTestId('kangur-login-identifier-input')).toHaveAttribute(
      'placeholder',
      'rodzic@example.com'
    );
    expect(screen.getByRole('button', { name: 'Utwórz konto rodzica' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utwórz konto' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('submits parent email credentials through the shared login form', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'parent@example.com');
    await user.type(screen.getByLabelText('Hasło'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/learner-signout',
      expect.objectContaining({
        credentials: 'same-origin',
        method: 'POST',
      })
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/csrf', {
      credentials: 'same-origin',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/verify-credentials',
      expect.objectContaining({
        body: JSON.stringify({
          authFlow: 'kangur_parent',
          email: 'parent@example.com',
          password: 'secret123',
        }),
        credentials: 'same-origin',
        method: 'POST',
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/callback/credentials',
      expect.objectContaining({
        body: expect.any(URLSearchParams),
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      })
    );

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/tests?focus=division', {
        scroll: false,
      });
    });
    expect(locationAssignMock).not.toHaveBeenCalled();
  });

  it('refreshes the current page instead of redirecting when login returns to the same route', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: locationAssignMock,
        hash: '',
        href: 'https://example.com/kangur/lessons',
        origin: 'https://example.com',
        pathname: '/kangur/lessons',
        search: '',
      },
      configurable: true,
    });
    useSearchParamsMock.mockReturnValue(new URLSearchParams('callbackUrl=%2Fkangur%2Flessons'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === '/api/kangur/auth/learner-signout') {
          return {
            json: vi.fn().mockResolvedValue({ ok: true }),
            ok: true,
            status: 200,
          };
        }
        if (url === '/api/auth/csrf') {
          return {
            json: vi.fn().mockResolvedValue({ csrfToken: 'kangur-parent-csrf' }),
            ok: true,
            status: 200,
          };
        }
        if (url === '/api/auth/verify-credentials') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              challengeId: 'challenge-1',
              mfaRequired: false,
            }),
            ok: true,
            status: 200,
          };
        }
        if (url === '/api/auth/callback/credentials') {
          return {
            json: vi.fn().mockResolvedValue({ url: '/kangur/lessons' }),
            ok: true,
            status: 200,
          };
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' onClose={onClose} />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'parent@example.com');
    await user.type(screen.getByLabelText('Hasło'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    await waitFor(() => {
      expect(routerRefreshMock).toHaveBeenCalledTimes(1);
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(routerPushMock).not.toHaveBeenCalled();
    expect(locationAssignMock).not.toHaveBeenCalled();
  });

  it('requests parent account creation email and shows the verification shortcut in the shared form', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Hasło'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/parent-account/create',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'parent@example.com',
          password: 'Strong123!',
          callbackUrl: '/tests?focus=division',
        }),
        credentials: 'same-origin',
        method: 'POST',
      })
    );
    expect(await screen.findByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText('Kliknij link potwierdzający w e-mailu. Potem zalogujesz się tym samym e-mailem i hasłem.')
    ).toBeVisible();
    expect(
      screen.queryByText(
        'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Potwierdź e-mail teraz' })).toHaveAttribute(
      'href',
      'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-1'
    );
    expect(screen.getByRole('link', { name: 'Potwierdź e-mail teraz' })).toHaveClass(
      'cursor-pointer'
    );
    expect(
      screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 1 min' })
    ).toBeDisabled();
    expect(screen.getByText('Nowy e-mail będzie można wysłać za 1 min.')).toBeVisible();
  });

  it('submits the captcha token when Turnstile is enabled for parent account creation', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalSiteKey = process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'];
    const originalTurnstile = window.turnstile;

    try {
      process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'] = 'turnstile-site-key';

      const renderSpy = vi.fn(
        (_container: HTMLElement, options: { callback?: (token: string) => void }) => {
          options.callback?.('turnstile-token-1');
          return 'widget-1';
        }
      );
      window.turnstile = {
        render: renderSpy,
        reset: vi.fn(),
        remove: vi.fn(),
      };

      vi.resetModules();
      const { KangurLoginPage: CaptchaLoginPage } = await import(
        '@/features/kangur/ui/KangurLoginPage'
      );

      renderWithIntl(<CaptchaLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      await user.type(screen.getByLabelText('Hasło'), 'Strong123!');

      const submitButton = screen.getByRole('button', { name: 'Utwórz konto rodzica' });
      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalledTimes(1);
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      const createCall = fetchMock.mock.calls.find(
        ([url]) => url === '/api/kangur/auth/parent-account/create'
      );
      expect(createCall).toBeTruthy();
      const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<
        string,
        unknown
      >;

      expect(body).toEqual({
        email: 'parent@example.com',
        password: 'Strong123!',
        callbackUrl: '/tests?focus=division',
        captchaToken: 'turnstile-token-1',
      });
    } finally {
      if (originalSiteKey === undefined) {
        delete process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'];
      } else {
        process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'] = originalSiteKey;
      }
      if (originalTurnstile) {
        window.turnstile = originalTurnstile;
      } else {
        delete window.turnstile;
      }
    }
  });

  it('uses a custom retryAfterMs value from the create response', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/api/kangur/auth/parent-account/create') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: true,
            email: 'parent@example.com',
            created: true,
            emailVerified: false,
            hasPassword: true,
            retryAfterMs: 20_000,
            debug: {
              verificationUrl:
                'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-custom',
            },
            message:
              'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
          }),
          ok: true,
          status: 200,
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Hasło'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));

    expect(await screen.findByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 20 s' })).toBeDisabled();
  });

  it('re-enables resend after the default cooldown expires', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T11:30:00.000Z'));

      renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Hasło'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 1 min' })).toBeDisabled();
      expect(screen.getByText('Nowy e-mail będzie można wysłać za 1 min.')).toBeVisible();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });

      expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' })).toBeEnabled();
      expect(screen.queryByText('Nowy e-mail będzie można wysłać za 1 min.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses a custom retryAfterMs value from the resend response', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T11:30:00.000Z'));
      const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === '/api/kangur/auth/parent-account/create') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              email: 'parent@example.com',
              created: true,
              emailVerified: false,
              hasPassword: true,
              retryAfterMs: 12_000,
              debug: {
                verificationUrl:
                  'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-create-custom',
              },
              message:
              'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/resend') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              email: 'parent@example.com',
              created: false,
              emailVerified: false,
              hasPassword: true,
              retryAfterMs: 7_000,
              debug: {
                verificationUrl:
                  'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-resend-custom',
              },
              message:
                'Wysłaliśmy nowy e-mail potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.',
            }),
            ok: true,
            status: 200,
          };
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal('fetch', fetchMock);

      renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Hasło'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 12 s' })).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(12_000);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 7 s' })).toBeDisabled();
      expect(screen.getByRole('link', { name: 'Potwierdź e-mail teraz' })).toHaveAttribute(
        'href',
        'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-resend-custom'
      );
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/kangur/auth/parent-account/resend',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'parent@example.com',
            callbackUrl: '/tests?focus=division',
          }),
          credentials: 'same-origin',
          method: 'POST',
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-enables resend after a backend rate-limit cooldown expires', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T11:30:00.000Z'));
      const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === '/api/kangur/auth/parent-account/create') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              email: 'parent@example.com',
              created: true,
              emailVerified: false,
              hasPassword: true,
              retryAfterMs: 60_000,
              message:
              'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/resend') {
          return {
            json: vi.fn().mockResolvedValue({
              error:
                'E-mail potwierdzający został już wysłany. Poczekaj 30 s i spróbuj ponownie.',
              code: 'RATE_LIMITED',
              retryAfterMs: 30_000,
            }),
            ok: false,
            status: 429,
          };
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal('fetch', fetchMock);

      renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Hasło'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 30 s' })).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resends the parent verification email from the compact confirmation card', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T11:30:00.000Z'));
      const fetchMock = vi.mocked(fetch);

      renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Hasło'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/kangur/auth/parent-account/resend',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'parent@example.com',
            callbackUrl: '/tests?focus=division',
          }),
          credentials: 'same-origin',
          method: 'POST',
        })
      );
      expect(
        screen.getByText(
          'Wysłaliśmy nowy e-mail potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.'
        )
      ).toBeVisible();
      expect(screen.getByRole('link', { name: 'Potwierdź e-mail teraz' })).toHaveAttribute(
        'href',
        'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-2'
      );
      expect(
        screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 1 min' })
      ).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the backend rate-limit message when resending too quickly', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T11:30:00.000Z'));
      const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === '/api/kangur/auth/parent-account/create') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              email: 'parent@example.com',
              created: true,
              emailVerified: false,
              hasPassword: true,
              retryAfterMs: 60_000,
              message:
              'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/resend') {
          return {
            json: vi.fn().mockResolvedValue({
              error:
                'E-mail potwierdzający został już wysłany. Poczekaj 30 s i spróbuj ponownie.',
              code: 'RATE_LIMITED',
              retryAfterMs: 30_000,
            }),
            ok: false,
            status: 429,
          };
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal('fetch', fetchMock);

      renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Hasło'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(
        screen.getByText(
          'E-mail potwierdzający został już wysłany. Poczekaj 30 s i spróbuj ponownie.'
        )
      ).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 30 s' })
      ).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the user in the inbox confirmation state when repeated create is rate limited', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/api/kangur/auth/parent-account/create') {
        return {
          json: vi.fn().mockResolvedValue({
            error:
              'E-mail potwierdzający został już wysłany. Poczekaj 30 s i spróbuj ponownie.',
            code: 'RATE_LIMITED',
            retryAfterMs: 30_000,
          }),
          ok: false,
          status: 429,
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Hasło'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));

    expect(
      await screen.findByText(
        'E-mail potwierdzający został już wysłany. Poczekaj 30 s i spróbuj ponownie.'
      )
    ).toBeVisible();
    expect(await screen.findByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Wyślij e-mail ponownie za 30 s' })
    ).toBeDisabled();
  });

  it('clears the compact create-account confirmation when switching back to sign-in mode', async () => {
    const user = userEvent.setup();

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Hasło'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));

    expect(await screen.findByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Mam konto' }));

    expect(screen.queryByText('Sprawdź skrzynkę: parent@example.com')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Kliknij link potwierdzający w e-mailu. Potem zalogujesz się tym samym e-mailem i hasłem.'
      )
    ).not.toBeInTheDocument();
  });

  it('blocks parent login until the email is verified', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/api/kangur/auth/learner-signout') {
        return {
          json: vi.fn().mockResolvedValue({ ok: true }),
          ok: true,
          status: 200,
        };
      }
      if (url === '/api/auth/verify-credentials') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: false,
            code: 'EMAIL_UNVERIFIED',
            message: 'Email verification is required.',
          }),
          ok: true,
          status: 200,
        };
      }
      if (url === '/api/kangur/auth/parent-account/resend') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: true,
            email: 'parent@example.com',
            created: false,
            emailVerified: false,
            hasPassword: true,
            retryAfterMs: 60_000,
            debug: {
              verificationUrl:
                'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-signin-resend',
            },
            message:
              'Wysłaliśmy nowy e-mail potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.',
          }),
          ok: true,
          status: 200,
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'parent@example.com');
    await user.type(screen.getByLabelText('Hasło'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    expect(
      await screen.findByText(
        'Potwierdź e-mail rodzica, zanim się zalogujesz. Możesz też wysłać nowy e-mail potwierdzający.'
      )
    ).toBeVisible();
    expect(await screen.findByText('Sprawdź skrzynkę: parent@example.com')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/auth/callback/credentials',
      expect.anything()
    );
    expect(routerPushMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Wyślij e-mail ponownie' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/parent-account/resend',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'parent@example.com',
          callbackUrl: '/tests?focus=division',
        }),
        credentials: 'same-origin',
        method: 'POST',
      })
    );
    expect(
      await screen.findByText(
        'Wysłaliśmy nowy e-mail potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.'
      )
    ).toBeVisible();
  });

  it('switches legacy parent accounts without a password into create-account recovery mode', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/api/kangur/auth/learner-signout') {
        return {
          json: vi.fn().mockResolvedValue({ ok: true }),
          ok: true,
          status: 200,
        };
      }
      if (url === '/api/auth/verify-credentials') {
        return {
          json: vi.fn().mockResolvedValue({
            ok: false,
            code: 'PASSWORD_SETUP_REQUIRED',
            message: 'Password setup is required before email verification can continue.',
          }),
          ok: true,
          status: 200,
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'parent@example.com');
    await user.type(screen.getByLabelText('Hasło'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    expect(
      await screen.findByText(
        'To starsze konto rodzica nie ma jeszcze hasła. Ustaw hasło poniżej, a wyślemy e-mail potwierdzający.'
      )
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Utwórz konto' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('parent@example.com');
    expect(screen.getByLabelText('Hasło')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Utwórz konto rodzica' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/auth/callback/credentials',
      expect.anything()
    );
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('verifies parent email from the confirmation link and prefills the parent email', async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-1'
      )
    );

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await waitFor(() => {
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByDisplayValue('parent@example.com')).toBeVisible();
    expect(
      screen.getByText(
        'E-mail został zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i możesz zalogować się e-mailem oraz hasłem.'
      )
    ).toBeVisible();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('shows a deprecation error when an old parent magic link is opened', async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'callbackUrl=%2Ftests%3Ffocus%3Ddivision&magicLinkToken=magic-link-1'
      )
    );

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(
      await screen.findByText(
        'Logowanie linkiem z e-maila nie jest już dostępne. Zaloguj się e-mailem i hasłem albo utwórz konto.'
      )
    ).toBeVisible();
  });

  it('submits student nick credentials after clearing any parent session', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/api/kangur/auth/learner-signout') {
        return {
          json: vi.fn().mockResolvedValue({ ok: true }),
          ok: true,
          status: 200,
        };
      }
      if (url === '/api/kangur/auth/learner-signin') {
        return {
          json: vi.fn().mockResolvedValue({ learnerId: 'learner-7' }),
          ok: true,
          status: 200,
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'janek123');
    await user.type(screen.getByLabelText('Hasło'), 'tajnehaslo');
    await user.click(screen.getByRole('button', { name: 'Zaloguj' }));

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/kangur/auth/learner-signin',
      expect.objectContaining({
        body: JSON.stringify({
          loginName: 'janek123',
          password: 'tajnehaslo',
        }),
        credentials: 'same-origin',
        method: 'POST',
      })
    );
    await waitFor(() => {
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
      expect(routerPushMock).toHaveBeenCalledWith('/tests?focus=division', {
        scroll: false,
      });
    });
  });

  it('rejects learner nicks with special characters before calling the learner endpoint', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    renderWithIntl(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'janek#123');
    await user.type(screen.getByLabelText('Hasło'), 'tajnehaslo');
    await user.click(screen.getByRole('button', { name: 'Zaloguj' }));

    expect(
      await screen.findByText('Nick ucznia może zawierać tylko litery, cyfry i myślniki.')
    ).toBeVisible();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/kangur/auth/learner-signin',
      expect.anything()
    );
  });
});
