/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

import {
  renderWithIntl,
  setupKangurLoginPageTest,
  signInMock,
  useOptionalKangurAuthMock,
  useRouterMock,
} from './KangurLoginPage.test-support';

const KANGUR_LEARNER_SIGN_IN_ENDPOINT = '/kangur-api/auth/learner-signin';
const KANGUR_LEARNER_SIGN_OUT_ENDPOINT = '/kangur-api/auth/learner-signout';
const KANGUR_PARENT_ACCOUNT_CREATE_ENDPOINT = '/kangur-api/auth/parent-account/create';

describe('KangurLoginPage', () => {
  let KangurLoginPage: typeof import('./KangurLoginPage').KangurLoginPage;

  beforeEach(async () => {
    KangurLoginPage = await setupKangurLoginPageTest();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      if (url.endsWith(KANGUR_LEARNER_SIGN_OUT_ENDPOINT)) {
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
      if (url.endsWith(KANGUR_LEARNER_SIGN_OUT_ENDPOINT)) {
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
      if (url.endsWith(KANGUR_LEARNER_SIGN_OUT_ENDPOINT)) {
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
      if (url.endsWith(KANGUR_LEARNER_SIGN_OUT_ENDPOINT)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      }
      if (url.endsWith(KANGUR_LEARNER_SIGN_IN_ENDPOINT)) {
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
      if (url.endsWith(KANGUR_PARENT_ACCOUNT_CREATE_ENDPOINT)) {
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
      if (url.endsWith(KANGUR_PARENT_ACCOUNT_CREATE_ENDPOINT)) {
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
      screen.getByText(
        (plMessages as any).KangurLogin.checkInboxLabel.replace('{email}', 'parent@example.com')
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText((plMessages as any).KangurLogin.createAccountInstruction)
    ).not.toBeInTheDocument();
  });

  it('normalizes the parent email before account creation and verification messaging', async () => {
    const verificationMessage = 'Wysłaliśmy nowy email potwierdzający.';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith(KANGUR_PARENT_ACCOUNT_CREATE_ENDPOINT)) {
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
      return url.endsWith(KANGUR_PARENT_ACCOUNT_CREATE_ENDPOINT);
    });

    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      email: 'parent@example.com',
      password: 'sekret123',
    });
    expect(
      screen.getByText(
        (plMessages as any).KangurLogin.checkInboxLabel.replace('{email}', 'parent@example.com')
      )
    ).toBeInTheDocument();
  });

  it('lets the user reopen the parent account form and correct the email from the verification state', async () => {
    const verificationMessage = 'Wysłaliśmy nowy email potwierdzający.';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith(KANGUR_PARENT_ACCOUNT_CREATE_ENDPOINT)) {
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
      if (url.endsWith(KANGUR_PARENT_ACCOUNT_CREATE_ENDPOINT)) {
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
