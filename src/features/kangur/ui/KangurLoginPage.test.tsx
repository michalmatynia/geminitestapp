/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      new URLSearchParams('callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision')
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
            json: vi.fn().mockResolvedValue({ url: '/kangur/tests?focus=division' }),
            ok: true,
            status: 200,
          };
        }

        if (url === '/api/kangur/auth/parent-account/create') {
          return {
            json: vi.fn().mockResolvedValue({
              ok: true,
              created: true,
              emailVerified: false,
              hasPassword: true,
              debug: {
                verificationUrl:
                  'https://example.com/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-1',
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
              created: false,
              emailVerified: false,
              hasPassword: true,
              debug: {
                verificationUrl:
                  'https://example.com/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-2',
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
              callbackUrl: '/kangur/tests?focus=division',
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

    expect(screen.getByRole('heading', { name: 'Logowanie Kangur' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true');
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'unknown');
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByLabelText('Email rodzica lub nick ucznia')).toBeInTheDocument();
    expect(screen.getByLabelText('Haslo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mam konto rodzica' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tworze konto rodzica' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Rodzic' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Uczen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /magiczny link/i })).not.toBeInTheDocument();
  });

  it('has no obvious accessibility violations in the login shell', async () => {
    const { container } = render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await screen.findByRole('heading', { name: 'Logowanie Kangur' });
    await expectNoAxeViolations(container);
  });

  it('switches the parent form into explicit create-account mode with a minimal create-account layout', async () => {
    const user = userEvent.setup();

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.click(screen.getByRole('button', { name: 'Tworze konto rodzica' }));

    expect(screen.getByText('Podaj email rodzica i haslo. Wyslemy link potwierdzajacy.')).toBeVisible();
    expect(screen.getByLabelText('Email rodzica')).toBeInTheDocument();
    expect(screen.getByLabelText('Ustaw haslo rodzica')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();
    expect(screen.queryByText('Jak zalozyc konto rodzica')).not.toBeInTheDocument();
  });

  it('starts in create-account mode when the route requests it explicitly', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&authMode=create-account'
      )
    );

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(screen.getByText('Podaj email rodzica i haslo. Wyslemy link potwierdzajacy.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();
    expect(screen.getByText('Nowe konto rodzica')).toBeVisible();
  });

  it('submits parent email credentials through the shared login form', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica lub nick ucznia'), 'parent@example.com');
    await user.type(screen.getByLabelText('Haslo'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj haslem' }));

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
      expect(routerPushMock).toHaveBeenCalledWith('/kangur/tests?focus=division', {
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

    await user.type(screen.getByLabelText('Email rodzica lub nick ucznia'), 'parent@example.com');
    await user.type(screen.getByLabelText('Haslo'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj haslem' }));

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

    expect(screen.getByText('Podaj email rodzica i haslo. Wyslemy link potwierdzajacy.')).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Ustaw haslo rodzica'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/parent-account/create',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'parent@example.com',
          password: 'Strong123!',
          callbackUrl: '/kangur/tests?focus=division',
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
      'https://example.com/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-1'
    );
    expect(screen.getByRole('link', { name: 'Potwierdz email teraz' })).toHaveClass(
      'cursor-pointer'
    );
    expect(screen.getByRole('button', { name: 'Wyslij email ponownie' })).toBeVisible();
  });

  it('resends the parent verification email from the compact confirmation card', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Ustaw haslo rodzica'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));
    await screen.findByText('Sprawdz skrzynke: parent@example.com');

    await user.click(screen.getByRole('button', { name: 'Wyslij email ponownie' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/parent-account/resend',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'parent@example.com',
          callbackUrl: '/kangur/tests?focus=division',
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
    expect(screen.getByRole('link', { name: 'Potwierdz email teraz' })).toHaveAttribute(
      'href',
      'https://example.com/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-2'
    );
  });

  it('clears the compact create-account confirmation when switching back to sign-in mode', async () => {
    const user = userEvent.setup();

    render(<KangurLoginPage defaultCallbackUrl='/kangur' parentAuthMode='create-account' />);

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'parent@example.com' },
    });
    await user.type(screen.getByLabelText('Ustaw haslo rodzica'), 'Strong123!');
    await user.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(await screen.findByText('Sprawdz skrzynke: parent@example.com')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Mam konto rodzica' }));

    expect(screen.queryByText('Sprawdz skrzynke: parent@example.com')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Kliknij link potwierdzajacy w emailu. Potem zalogujesz sie tym samym emailem i haslem.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getByText('Logowanie rodzica')).toBeVisible();
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
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica lub nick ucznia'), 'parent@example.com');
    await user.type(screen.getByLabelText('Haslo'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj haslem' }));

    expect(
      await screen.findByText(
        'Potwierdz email rodzica, zanim sie zalogujesz. Sprawdz skrzynke i kliknij link potwierdzajacy.'
      )
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/auth/callback/credentials',
      expect.anything()
    );
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('verifies parent email from the confirmation link and prefills the parent email', async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-1'
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
        'callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&magicLinkToken=magic-link-1'
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

    await user.type(screen.getByLabelText('Email rodzica lub nick ucznia'), 'janek123');
    await user.type(screen.getByLabelText('Haslo'), 'tajnehaslo');
    await user.click(screen.getByRole('button', { name: 'Zaloguj sie' }));

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
      expect(routerPushMock).toHaveBeenCalledWith('/kangur/tests?focus=division', {
        scroll: false,
      });
    });
  });

  it('rejects learner nicks with special characters before calling the learner endpoint', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica lub nick ucznia'), 'janek-123');
    await user.type(screen.getByLabelText('Haslo'), 'tajnehaslo');
    await user.click(screen.getByRole('button', { name: 'Zaloguj sie' }));

    expect(await screen.findByText('Nick ucznia moze zawierac tylko litery i cyfry.')).toBeVisible();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/kangur/auth/learner-signin',
      expect.anything()
    );
  });
});
