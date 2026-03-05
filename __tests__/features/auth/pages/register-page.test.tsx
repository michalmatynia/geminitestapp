/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render } from '@/__tests__/test-utils';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { useRegisterUser } from '@/features/auth/hooks/useAuthQueries';
import RegisterPage from '@/features/auth/pages/public/RegisterPage';
import { useSettingsMap } from '@/shared/hooks/use-settings';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

vi.mock('@/features/auth/hooks/useAuthQueries', () => ({
  useRegisterUser: vi.fn(),
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

describe('RegisterPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();

    vi.mocked(useSettingsMap).mockReturnValue({
      isLoading: false,
      data: new Map([['auth_user_pages', JSON.stringify({ allowSignup: true })]]),
    } as ReturnType<typeof useSettingsMap>);

    vi.mocked(useRegisterUser).mockReturnValue({
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useRegisterUser>);
  });

  const renderPage = () =>
    render(
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </QueryClientProvider>
      </SessionProvider>
    );

  it('renders correctly', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(nameInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('autocomplete', 'name');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i }).closest('form')).toHaveAttribute(
      'aria-busy',
      'false'
    );
  });

  it('handles successful registration and signs in', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { id: 'u1', email: 'new@example.com' },
    });
    vi.mocked(useRegisterUser).mockReturnValue({ mutateAsync } as unknown as ReturnType<
      typeof useRegisterUser
    >);

    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        name: undefined,
      });
      expect(signIn).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          email: 'new@example.com',
          password: 'password123',
        })
      );
    });
  });

  it('shows error message if signup is disabled', () => {
    vi.mocked(useSettingsMap).mockReturnValue({
      isLoading: false,
      data: new Map([['auth_user_pages', JSON.stringify({ allowSignup: false })]]),
    } as unknown as ReturnType<typeof useSettingsMap>);

    renderPage();

    expect(screen.getByText(/self-service registration is disabled/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('shows error from registration failure', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: false,
      payload: { error: 'Email already taken' },
    });
    vi.mocked(useRegisterUser).mockReturnValue({ mutateAsync } as unknown as ReturnType<
      typeof useRegisterUser
    >);

    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'taken@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already taken/i)).toBeInTheDocument();
  });
});
