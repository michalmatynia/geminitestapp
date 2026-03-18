/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/features/auth/context/AuthContext';
import SignInPage, {
  resolveSignInCallbackNavigation,
} from '@/features/auth/pages/public/SignInPage';
import enMessages from '@/i18n/messages/en.json';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

const searchParamsGetMock = vi.fn<(key: string) => string | null>();
const routerPushMock = vi.fn<(href: string) => void>();

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: searchParamsGetMock,
  })),
  useRouter: vi.fn(() => ({
    push: routerPushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: PropsWithChildren<{ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
  useUpdateSetting: vi.fn(),
  useLiteSettingsMap: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('SignInPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    routerPushMock.mockReset();
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'callbackUrl') return null;
      if (key === 'error') return null;
      return null;
    });

    vi.mocked(useSettingsMap).mockReturnValue({
      isLoading: false,
      data: new Map([['auth_user_pages', JSON.stringify({ allowSignup: true })]]),
    } as ReturnType<typeof useSettingsMap>);
  });

  const renderPage = () =>
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SignInPage />
            </AuthProvider>
          </QueryClientProvider>
        </SessionProvider>
      </NextIntlClientProvider>
    );

  it('renders correctly', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i, { selector: 'input' });
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i }).closest('form')).toHaveAttribute(
      'aria-busy',
      'false'
    );
  });

  it('has no obvious accessibility violations in the sign-in form shell', async () => {
    const { container } = renderPage();

    await screen.findByRole('heading', { name: /sign in/i });
    await expectNoAxeViolations(container);
  });

  it('handles successful sign in', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: '/admin',
    });

    renderPage();

    const emailInput = await screen.findByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: '/admin',
          redirect: false,
        })
      );
    });
    expect(routerPushMock).toHaveBeenCalledWith('/admin');
  });

  it('routes same-origin absolute callback URLs through the Next router', async () => {
    const user = userEvent.setup();
    const callbackUrl = `${window.location.origin}/admin?tab=users#section`;
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'callbackUrl') return callbackUrl;
      return null;
    });
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: callbackUrl,
    });

    renderPage();

    await user.type(await screen.findByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/admin?tab=users#section');
    });
  });

  it('shows error message when sign in returns an error result', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      error: 'CredentialsSignin',
      status: 401,
      url: null,
    });

    renderPage();

    await user.type(await screen.findByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('shows a generic error message when sign in throws unexpectedly', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockRejectedValue(new Error('Network down'));

    renderPage();

    await user.type(await screen.findByLabelText(/email/i), 'x@example.com');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText('An unexpected error occurred. Please try again.')
    ).toBeInTheDocument();
  });

  it('shows URL error state when auth error query param is present', async () => {
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'error') return 'CredentialsSignin';
      return null;
    });

    renderPage();

    expect(await screen.findByText('Invalid credentials.')).toBeInTheDocument();
  });

  it('supports keyboard tab order across sign-in controls', async () => {
    renderPage();

    const emailInput = await screen.findByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i, { selector: 'input' });
    const togglePasswordButton = screen.getByRole('button', { name: /show password/i });
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    const form = submitButton.closest('form');

    expect(form).not.toBeNull();
    const tabbableControls = Array.from(form?.elements ?? []).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.hasAttribute('disabled') &&
        element.tabIndex >= 0
    );

    expect(tabbableControls).toEqual([
      emailInput,
      passwordInput,
      togglePasswordButton,
      submitButton,
    ]);
  });
});

describe('resolveSignInCallbackNavigation', () => {
  it('normalizes same-origin absolute callback URLs into router navigation', () => {
    expect(
      resolveSignInCallbackNavigation(
        'http://localhost/admin?tab=users#section',
        'http://localhost'
      )
    ).toEqual({
      kind: 'router',
      href: '/admin?tab=users#section',
    });
  });

  it('preserves external callback URLs for full document navigation', () => {
    expect(
      resolveSignInCallbackNavigation(
        'https://accounts.example.test/continue',
        'http://localhost'
      )
    ).toEqual({
      kind: 'location',
      href: 'https://accounts.example.test/continue',
    });
  });
});
