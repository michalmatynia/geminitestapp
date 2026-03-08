/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useRouterMock,
  useSearchParamsMock,
  signOutMock,
  trackKangurClientEventMock,
  locationAssignMock,
  routerPushMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  signOutMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  locationAssignMock: vi.fn(),
  routerPushMock: vi.fn(),
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
  signOut: signOutMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
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
        origin: originalLocation.origin,
      },
      configurable: true,
    });
    useRouterMock.mockReturnValue({
      push: routerPushMock,
    });
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision')
    );
    signOutMock.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === '/api/kangur/auth/learner-signout') {
          return {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ ok: true }),
          };
        }

        if (url === '/api/auth/csrf') {
          return {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ csrfToken: 'kangur-parent-csrf' }),
          };
        }

        if (url === '/api/auth/callback/credentials') {
          return {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ url: '/kangur/tests?focus=division' }),
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
      })
    );
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });

  it('renders a single Kangur login form in parent mode by default', () => {
    render(<KangurLoginPage defaultCallbackUrl='/kangur' backHref='/kangur' />);

    expect(screen.getByTestId('kangur-login-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true');
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-login-mode', 'parent');
    expect(screen.getByRole('tab', { name: 'Rodzic' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Uczen' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText('Email rodzica')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nick ucznia')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Przejdz do logowania rodzica/i })
    ).not.toBeInTheDocument();
  });

  it('switches the shared login form into student mode', async () => {
    const user = userEvent.setup();

    render(<KangurLoginPage defaultCallbackUrl='/kangur' backHref='/kangur' />);

    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true');
    await user.click(screen.getByRole('tab', { name: 'Uczen' }));

    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-login-mode', 'student');
    expect(screen.getByRole('tab', { name: 'Rodzic' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Uczen' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Nick ucznia')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email rodzica')).not.toBeInTheDocument();
  });

  it('submits parent credentials from the Kangur login screen and stays on the shared callback flow', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' backHref='/kangur' />);

    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true');
    await user.type(screen.getByLabelText('Email rodzica'), 'parent@example.com');
    await user.type(screen.getByLabelText(/^Haslo$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Zaloguj rodzica' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/learner-signout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      })
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/csrf', {
      credentials: 'same-origin',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/callback/credentials',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: expect.any(URLSearchParams),
      })
    );
    await waitFor(() => {
      expect(locationAssignMock).toHaveBeenCalledWith('/kangur/tests?focus=division');
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

    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-hydrated', 'true');
    await user.click(screen.getByRole('tab', { name: 'Uczen' }));
    await user.type(screen.getByLabelText('Nick ucznia'), 'janek');
    await user.type(screen.getByLabelText(/^Haslo$/i), 'tajnehaslo');
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
      expect(locationAssignMock).toHaveBeenCalledWith('/kangur/tests?focus=division');
    });
  });
});
