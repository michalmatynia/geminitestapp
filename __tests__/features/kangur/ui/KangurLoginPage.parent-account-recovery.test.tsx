/**
 * @vitest-environment jsdom
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkAppStateMock,
  renderWithIntl,
  restoreKangurLoginPageWindowLocation,
  routerPushMock,
  setupKangurLoginPageTest,
  useSearchParamsMock,
} from './KangurLoginPage.test-support';

describe('KangurLoginPage', () => {
  let KangurLoginPage: typeof import('@/features/kangur/ui/KangurLoginPage').KangurLoginPage;

  beforeEach(async () => {
    KangurLoginPage = await setupKangurLoginPageTest();
  });

  afterEach(() => {
    restoreKangurLoginPageWindowLocation();
  });

  it('blocks parent login until the email is verified', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/kangur-api/auth/learner-signout') {
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
      if (url === '/kangur-api/auth/parent-account/resend') {
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
      '/kangur-api/auth/parent-account/resend',
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
      if (url === '/kangur-api/auth/learner-signout') {
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
});
