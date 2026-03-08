/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useRouterMock,
  useSearchParamsMock,
  routerPushMock,
  signInMock,
  signOutMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  routerPushMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', () => ({
  signIn: signInMock,
  signOut: signOutMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';

describe('KangurLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    useRouterMock.mockReturnValue({
      push: routerPushMock,
    });
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision')
    );
    signInMock.mockResolvedValue({ ok: true });
    signOutMock.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: true }),
      })
    );
  });

  it('renders parent and student login forms on the same Kangur screen', () => {
    render(<KangurLoginPage defaultCallbackUrl='/kangur' backHref='/kangur' />);

    expect(screen.getByTestId('kangur-login-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-parent-form')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-student-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Email rodzica')).toBeInTheDocument();
    expect(screen.getByLabelText('Nick ucznia')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Przejdz do logowania rodzica/i })
    ).not.toBeInTheDocument();
  });

  it('submits parent credentials from the Kangur login screen and stays on the shared callback flow', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' backHref='/kangur' />);

    await user.type(screen.getByLabelText('Email rodzica'), 'parent@example.com');
    const passwordFields = screen.getAllByLabelText(/^Haslo$/i);
    await user.type(passwordFields[0]!, 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/learner-signout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      })
    );
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      email: 'parent@example.com',
      password: 'secret123',
      callbackUrl: '/kangur/tests?focus=division',
      redirect: false,
    });
    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/kangur/tests?focus=division');
    });
  });

  it('submits student nickname credentials and clears any parent session first', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === '/api/kangur/auth/learner-signout') {
        return {
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ ok: true }),
        };
      }
      if (url === '/api/kangur/auth/learner-signin') {
        return {
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ learnerId: 'learner-7' }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' backHref='/kangur' />);

    await user.type(screen.getByLabelText('Nick ucznia'), 'janek');
    const passwordFields = screen.getAllByLabelText(/^Haslo$/i);
    await user.type(passwordFields[1]!, 'tajnehaslo');
    await user.click(screen.getByRole('button', { name: 'Zaloguj ucznia' }));

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/kangur/auth/learner-signin',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({
          loginName: 'janek',
          password: 'tajnehaslo',
        }),
      })
    );
    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/kangur/tests?focus=division');
    });
  });
});
