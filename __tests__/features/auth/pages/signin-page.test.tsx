/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthProvider } from '@/features/auth/context/AuthContext';
import { useVerifyCredentials } from '@/features/auth/hooks/useAuthQueries';
import SignInPage from '@/features/auth/pages/public/SignInPage';
import { useSettingsMap } from '@/shared/hooks/use-settings';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn().mockReturnValue(null),
  })),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  SessionProvider: ({ children }: any) => children,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

vi.mock('@/features/auth/hooks/useAuthQueries', () => ({
  useVerifyCredentials: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(), useUpdateSetting: vi.fn(), useLiteSettingsMap: vi.fn(),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('SignInPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    
    // Default mocks for successful initial load
    vi.mocked(useSettingsMap).mockReturnValue({
      isLoading: false,
      data: new Map([
        ['auth_user_pages', JSON.stringify({ allowSocialLogin: true })]
      ]),
    } as any);

    vi.mocked(useVerifyCredentials).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
  });

  const renderPage = () => render(
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
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('handles successful sign in', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { ok: true, mfaRequired: false, challengeId: 'ch1' },
    });
    vi.mocked(useVerifyCredentials).mockReturnValue({ mutateAsync } as any);

    renderPage();

    const emailInput = await screen.findByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
        challengeId: 'ch1',
      }));
    });
  });

  it('shows error message on verification failure', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { ok: false, message: 'Invalid credentials' },
    });
    vi.mocked(useVerifyCredentials).mockReturnValue({ mutateAsync } as any);

    renderPage();

    const emailInput = await screen.findByLabelText(/email/i);
    await user.type(emailInput, 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows MFA fields if required', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { ok: true, mfaRequired: true, challengeId: 'ch-mfa' },
    });
    vi.mocked(useVerifyCredentials).mockReturnValue({ mutateAsync } as any);

    renderPage();

    const emailInput = await screen.findByLabelText(/email/i);
    await user.type(emailInput, 'mfa@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByLabelText(/one-time code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recovery code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify & sign in/i })).toBeInTheDocument();
  });

  it('calls social sign in', async () => {
    const user = userEvent.setup();
    renderPage();

    const googleBtn = await screen.findByRole('button', { name: /continue with google/i });
    await user.click(googleBtn);

    expect(signIn).toHaveBeenCalledWith('google', expect.anything());
  });
});
