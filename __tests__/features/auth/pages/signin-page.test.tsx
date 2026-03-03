/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/features/auth/context/AuthContext';
import SignInPage from '@/features/auth/pages/public/SignInPage';
import { useSettingsMap } from '@/shared/hooks/use-settings';

const searchParamsGetMock = vi.fn<(key: string) => string | null>();

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: searchParamsGetMock,
  })),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
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
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SignInPage />
          </AuthProvider>
        </QueryClientProvider>
      </SessionProvider>
    );

  it('renders correctly', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
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
    await user.type(screen.getByLabelText(/password/i), 'password123');
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
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('shows a generic error message when sign in throws unexpectedly', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockRejectedValue(new Error('Network down'));

    renderPage();

    await user.type(await screen.findByLabelText(/email/i), 'x@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
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
});
