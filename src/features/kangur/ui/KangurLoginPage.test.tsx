/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS } from '@/features/kangur/settings';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

const {
  checkAppStateMock,
  locationAssignMock,
  routerPushMock,
  routerRefreshMock,
  signOutMock,
  trackKangurClientEventMock,
  useOptionalKangurAuthMock,
  useRouterMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  checkAppStateMock: vi.fn(),
  locationAssignMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  signOutMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', () => ({
  signOut: signOutMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
}));

import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';

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
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('callbackUrl=%2Ftests%3Ffocus%3Ddivision')
    );
    signOutMock.mockResolvedValue(undefined);
    checkAppStateMock.mockResolvedValue(undefined);
    useOptionalKangurAuthMock.mockReturnValue({
      checkAppState: checkAppStateMock,
      isAuthenticated: false,
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
                'Sprawdz email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje sie po weryfikacji.',
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
                'Wyslalismy nowy email potwierdzajacy. Konto rodzica uaktywni sie po weryfikacji adresu.',
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
                'Email zostal zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i mozesz zalogowac sie emailem oraz haslem.',
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
    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(screen.getByRole('heading', { name: 'Zaloguj się' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-hero')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-hero-logo').querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Konto StudiQ')).toBeVisible();
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true');
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'unknown');
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('aria-busy', 'false');
    expect(
      screen.getByText('Rodzic loguje się emailem i hasłem. Uczeń loguje się nickiem i hasłem.')
    ).toBeVisible();
    expect(screen.getByText('Rodzic lub uczen')).toBeVisible();
    expect(screen.getByLabelText('Email rodzica albo nick ucznia')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mam konto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tworzę konto rodzica' })).toBeInTheDocument();
    expect(screen.queryByText('Jesli loguje sie rodzic')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Rodzic' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Uczen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /magiczny link/i })).not.toBeInTheDocument();
  });

  it('has no obvious accessibility violations in the login shell', async () => {
    const { container } = render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await screen.findByRole('heading', { name: 'Zaloguj się' });
    await expectNoAxeViolations(container);
  });

  it('switches the parent form into explicit create-account mode with a minimal create-account layout', async () => {
    const user = userEvent.setup();

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.click(screen.getByRole('button', { name: 'Tworzę konto rodzica' }));

    expect(
      screen.getByText(
        'Zakładasz konto rodzica emailem i hasłem. Po potwierdzeniu adresu zalogujesz się tak samo za każdym razem.'
      )
    ).toBeVisible();
    expect(
      screen.queryByText('Po potwierdzeniu emaila zalogujesz sie tym samym emailem i haslem.')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email rodzica')).toBeInTheDocument();
    expect(screen.getByLabelText('Ustaw hasło rodzica')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();
    expect(screen.queryByText('Jak zalozyc konto rodzica')).not.toBeInTheDocument();
  });

  it('starts in create-account mode when the route requests it explicitly', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'callbackUrl=%2Ftests%3Ffocus%3Ddivision&authMode=create-account'
      )
    );

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(
      screen.getByText(
        'Zakładasz konto rodzica emailem i hasłem. Po potwierdzeniu adresu zalogujesz się tak samo za każdym razem.'
      )
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();
    expect(screen.getByText('Nowe konto rodzica')).toBeVisible();
  });

  it('submits parent email credentials through the shared login form', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica albo nick ucznia'), 'parent@example.com');
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' onClose={onClose} />);

    await user.type(screen.getByLabelText('Email rodzica albo nick ucznia'), 'parent@example.com');
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    expect(
      screen.getByText(
        'Zakładasz konto rodzica emailem i hasłem. Po potwierdzeniu adresu zalogujesz się tak samo za każdym razem.'
      )
    ).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Ustaw hasło rodzica'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

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
    expect(await screen.findByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText('Kliknij link potwierdzajacy w emailu. Potem zalogujesz sie tym samym emailem i haslem.')
    ).toBeVisible();
    expect(
      screen.queryByText(
        'Sprawdz email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje sie po weryfikacji.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Potwierdz email teraz' })).toHaveAttribute(
      'href',
      'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-1'
    );
    expect(screen.getByRole('link', { name: 'Potwierdz email teraz' })).toHaveClass(
      'cursor-pointer'
    );
    expect(
      screen.getByRole('button', { name: 'Wyslij email ponownie za 1 min' })
    ).toBeDisabled();
    expect(screen.getByText('Nowy email bedzie mozna wyslac za 1 min.')).toBeVisible();
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
              'Sprawdz email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje sie po weryfikacji.',
          }),
          ok: true,
          status: 200,
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Ustaw hasło rodzica'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(await screen.findByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Wyslij email ponownie za 20 s' })).toBeDisabled();
  });

  it('re-enables resend after the default cooldown expires', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T11:30:00.000Z'));

      render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Ustaw hasło rodzica'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: 'Wyslij email ponownie za 1 min' })).toBeDisabled();
      expect(screen.getByText('Nowy email bedzie mozna wyslac za 1 min.')).toBeVisible();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });

      expect(screen.getByRole('button', { name: 'Wyslij email ponownie' })).toBeEnabled();
      expect(screen.queryByText('Nowy email bedzie mozna wyslac za 1 min.')).not.toBeInTheDocument();
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
                'Sprawdz email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje sie po weryfikacji.',
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
                'Wyslalismy nowy email potwierdzajacy. Konto rodzica uaktywni sie po weryfikacji adresu.',
            }),
            ok: true,
            status: 200,
          };
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Ustaw hasło rodzica'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Wyslij email ponownie za 12 s' })).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(12_000);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyslij email ponownie' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: 'Wyslij email ponownie za 7 s' })).toBeDisabled();
      expect(screen.getByRole('link', { name: 'Potwierdz email teraz' })).toHaveAttribute(
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
                'Sprawdz email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje sie po weryfikacji.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/resend') {
          return {
            json: vi.fn().mockResolvedValue({
              error:
                'Email potwierdzajacy zostal juz wyslany. Poczekaj 30 s i sprobuj ponownie.',
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

      render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Ustaw hasło rodzica'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyslij email ponownie' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByRole('button', { name: 'Wyslij email ponownie za 30 s' })).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(screen.getByRole('button', { name: 'Wyslij email ponownie' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resends the parent verification email from the compact confirmation card', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T11:30:00.000Z'));
      const fetchMock = vi.mocked(fetch);

      render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Ustaw hasło rodzica'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyslij email ponownie' }));
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
          'Wyslalismy nowy email potwierdzajacy. Konto rodzica uaktywni sie po weryfikacji adresu.'
        )
      ).toBeVisible();
      expect(screen.getByRole('link', { name: 'Potwierdz email teraz' })).toHaveAttribute(
        'href',
        'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-2'
      );
      expect(
        screen.getByRole('button', { name: 'Wyslij email ponownie za 1 min' })
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
                'Sprawdz email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje sie po weryfikacji.',
            }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/resend') {
          return {
            json: vi.fn().mockResolvedValue({
              error:
                'Email potwierdzajacy zostal juz wyslany. Poczekaj 30 s i sprobuj ponownie.',
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

      render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

      fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Ustaw hasło rodzica'), {
        target: { value: 'Strong123!' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Wyslij email ponownie' }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(
        screen.getByText(
          'Email potwierdzajacy zostal juz wyslany. Poczekaj 30 s i sprobuj ponownie.'
        )
      ).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Wyslij email ponownie za 30 s' })
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
              'Email potwierdzajacy zostal juz wyslany. Poczekaj 30 s i sprobuj ponownie.',
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Ustaw hasło rodzica'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(
      await screen.findByText(
        'Email potwierdzajacy zostal juz wyslany. Poczekaj 30 s i sprobuj ponownie.'
      )
    ).toBeVisible();
    expect(await screen.findByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Wyslij email ponownie za 30 s' })
    ).toBeDisabled();
  });

  it('clears the compact create-account confirmation when switching back to sign-in mode', async () => {
    const user = userEvent.setup();

    render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Ustaw hasło rodzica'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(await screen.findByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Mam konto' }));

    expect(screen.queryByText('Sprawdz skrzynke: parent@example.com')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Kliknij link potwierdzajacy w emailu. Potem zalogujesz sie tym samym emailem i haslem.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getByText('Rodzic')).toBeVisible();
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
              'Wyslalismy nowy email potwierdzajacy. Konto rodzica uaktywni sie po weryfikacji adresu.',
          }),
          ok: true,
          status: 200,
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica albo nick ucznia'), 'parent@example.com');
    await user.type(screen.getByLabelText('Hasło'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    expect(
      await screen.findByText(
        'Potwierdz email rodzica, zanim sie zalogujesz. Mozesz tez wyslac nowy email potwierdzajacy.'
      )
    ).toBeVisible();
    expect(await screen.findByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Wyslij email ponownie' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/auth/callback/credentials',
      expect.anything()
    );
    expect(routerPushMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Wyslij email ponownie' }));

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
        'Wyslalismy nowy email potwierdzajacy. Konto rodzica uaktywni sie po weryfikacji adresu.'
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica albo nick ucznia'), 'parent@example.com');
    await user.type(screen.getByLabelText('Hasło'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    expect(
      await screen.findByText(
        'To starsze konto rodzica nie ma jeszcze hasla. Ustaw haslo ponizej, a wyslemy email potwierdzajacy.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'Zakładasz konto rodzica emailem i hasłem. Po potwierdzeniu adresu zalogujesz się tak samo za każdym razem.'
      )
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('parent@example.com');
    expect(screen.getByLabelText('Ustaw hasło rodzica')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await waitFor(() => {
      expect(checkAppStateMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByDisplayValue('parent@example.com')).toBeVisible();
    expect(
      screen.getByText(
        'Email zostal zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i mozesz zalogowac sie emailem oraz haslem.'
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(
      await screen.findByText(
        'Logowanie linkiem z emaila nie jest juz dostepne. Zaloguj sie emailem i haslem albo utworz konto.'
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica albo nick ucznia'), 'janek123');
    await user.type(screen.getByLabelText('Hasło'), 'tajnehaslo');
    await user.click(screen.getByRole('button', { name: 'Zaloguj ucznia' }));

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
      expect(routerPushMock).toHaveBeenCalledWith('/tests?focus=division', {
        scroll: false,
      });
    });
  });

  it('rejects learner nicks with special characters before calling the learner endpoint', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica albo nick ucznia'), 'janek-123');
    await user.type(screen.getByLabelText('Hasło'), 'tajnehaslo');
    await user.click(screen.getByRole('button', { name: 'Zaloguj ucznia' }));

    expect(await screen.findByText('Nick ucznia moze zawierac tylko litery i cyfry.')).toBeVisible();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/kangur/auth/learner-signin',
      expect.anything()
    );
  });
});
