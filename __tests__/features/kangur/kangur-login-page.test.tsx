/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useRouterMock,
  useSearchParamsMock,
  routerPushMock,
  trackKangurClientEventMock,
  setStoredActiveLearnerIdMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  routerPushMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  setStoredActiveLearnerIdMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

vi.mock('@/features/kangur/services/kangur-active-learner', () => ({
  setStoredActiveLearnerId: setStoredActiveLearnerIdMock,
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: (headers?: HeadersInit) => new Headers(headers),
}));

import KangurLoginPage from '@/app/(frontend)/kangur/login/page';
import { resolveKangurLoginCallbackNavigation } from '@/app/(frontend)/kangur/login/page';

describe('KangurLoginPage', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    const locationAssignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: locationAssignMock,
        href: `${originalLocation.origin}/kangur/game?focus=clock`,
        origin: originalLocation.origin,
      },
      configurable: true,
      writable: true,
    });
    useRouterMock.mockReturnValue({
      push: routerPushMock,
    });
    useSearchParamsMock.mockReturnValue(new URLSearchParams('callbackUrl=/kangur/profile'));
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  });

  it('uses the shared Kangur surface and preserves the callback in the parent sign-in link', () => {
    render(<KangurLoginPage />);

    expect(screen.getByTestId('kangur-login-shell')).toHaveClass(
      'kangur-premium-bg',
      'min-h-screen'
    );
    expect(screen.getByRole('link', { name: 'Przejdz do logowania rodzica' })).toHaveAttribute(
      'href',
      '/auth/signin?callbackUrl=%2Fkangur%2Fprofile'
    );
    expect(screen.getByRole('link', { name: 'Wroc do Kangura' })).toHaveAttribute(
      'href',
      '/kangur'
    );
  });

  it('falls back to the default Kangur callback when none is provided', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<KangurLoginPage />);

    expect(screen.getByRole('link', { name: 'Przejdz do logowania rodzica' })).toHaveAttribute(
      'href',
      '/auth/signin?callbackUrl=%2Fkangur'
    );
  });

  it('routes learner sign-in back through the Next router for same-origin absolute callbacks', async () => {
    const callbackUrl = `${window.location.origin}/kangur/profile?tab=summary#hero`;
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ learnerId: 'learner-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    useSearchParamsMock.mockReturnValue(new URLSearchParams({ callbackUrl }));

    render(<KangurLoginPage />);

    await user.type(screen.getByPlaceholderText('Login ucznia'), 'ada-child');
    await user.type(screen.getByPlaceholderText('Haslo ucznia'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Zaloguj ucznia' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/kangur/auth/learner-signin',
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
        })
      );
    });
    await waitFor(() => {
      expect(setStoredActiveLearnerIdMock).toHaveBeenCalledWith('learner-1');
      expect(routerPushMock).toHaveBeenCalledWith('/kangur/profile?tab=summary#hero');
    });
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});

describe('resolveKangurLoginCallbackNavigation', () => {
  it('normalizes same-origin absolute callback URLs into router navigation', () => {
    expect(
      resolveKangurLoginCallbackNavigation(
        'http://localhost/kangur/profile?tab=summary#hero',
        'http://localhost'
      )
    ).toEqual({
      kind: 'router',
      href: '/kangur/profile?tab=summary#hero',
    });
  });

  it('preserves external callback URLs for full document navigation', () => {
    expect(
      resolveKangurLoginCallbackNavigation(
        'https://accounts.example.test/continue',
        'http://localhost'
      )
    ).toEqual({
      kind: 'location',
      href: 'https://accounts.example.test/continue',
    });
  });
});
