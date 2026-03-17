/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { setStoredActiveLearnerId } from '@/features/kangur/services/kangur-active-learner';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
  routerPushMock,
  useRouterMock,
  useSearchParamsMock,
  usePathnameMock,
} = vi.hoisted(() => ({
  trackKangurClientEventMock: vi.fn(),
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  routerPushMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  usePathnameMock: vi.fn(),
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
  usePathname: usePathnameMock,
}));

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/services/kangur-active-learner', () => ({
  setStoredActiveLearnerId: vi.fn(),
}));
const setStoredActiveLearnerIdMock = vi.mocked(setStoredActiveLearnerId);

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: () => null,
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: (headers?: HeadersInit) => new Headers(headers),
}));

import {
  KangurLoginPage,
  resolveKangurLoginCallbackNavigation,
} from '@/features/kangur/ui/KangurLoginPage';

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
    usePathnameMock.mockReturnValue('/kangur/login');
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  });

  it('uses the shared Kangur surface and keeps the parent auth controls visible by default', () => {
    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    expect(screen.getByTestId('kangur-login-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-panel-padding-xl',
      'overflow-hidden'
    );
    expect(screen.getByTestId('kangur-login-form')).toHaveAttribute('data-login-kind', 'unknown');
    expect(screen.getByRole('button', { name: 'Mam konto' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Utwórz konto' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('falls back to the default Kangur callback when none is provided', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ learnerId: 'learner-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'adachild');
    const passwordInput = screen
      .getByTestId('kangur-login-form')
      .querySelector<HTMLInputElement>('input[name="password"]');
    expect(passwordInput).not.toBeNull();
    await user.type(passwordInput!, 'secret');
    await user.click(screen.getByRole('button', { name: 'Zaloguj' }));

    await waitFor(() => {
      expect(setStoredActiveLearnerIdMock).toHaveBeenCalledWith('learner-1');
      expect(routerPushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
    });
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

    render(<KangurLoginPage defaultCallbackUrl='/kangur' />);

    await user.type(screen.getByTestId('kangur-login-identifier-input'), 'adachild');
    const passwordInput = screen
      .getByTestId('kangur-login-form')
      .querySelector<HTMLInputElement>('input[name="password"]');
    expect(passwordInput).not.toBeNull();
    await user.type(passwordInput!, 'secret');
    await user.click(screen.getByRole('button', { name: 'Zaloguj' }));

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
      expect(routerPushMock).toHaveBeenCalledWith('/kangur/profile?tab=summary#hero', {
        scroll: false,
      });
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
