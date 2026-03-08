/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPushMock, usePathnameMock, useRouterMock, useSearchParamsMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurLoginModalProvider,
  useKangurLoginModal,
} from '@/features/kangur/ui/context/KangurLoginModalContext';

function LoginModalProbe(): JSX.Element {
  const {
    callbackUrl,
    closeLoginModal,
    dismissLoginModal,
    homeHref,
    isOpen,
    isRouteDriven,
    openLoginModal,
  } = useKangurLoginModal();

  return (
    <div>
      <div data-testid='kangur-login-modal-callback'>{callbackUrl}</div>
      <div data-testid='kangur-login-modal-home'>{homeHref}</div>
      <div data-testid='kangur-login-modal-open'>{String(isOpen)}</div>
      <div data-testid='kangur-login-modal-route-driven'>{String(isRouteDriven)}</div>
      <button type='button' onClick={() => openLoginModal('/kangur/tests?focus=division')}>
        Open tests modal
      </button>
      <button type='button' onClick={() => openLoginModal()}>
        Open current page modal
      </button>
      <button type='button' onClick={dismissLoginModal}>
        Dismiss modal
      </button>
      <button type='button' onClick={closeLoginModal}>
        Close modal
      </button>
    </div>
  );
}

function renderHarness({
  pageKey = 'Lessons',
  pathname = '/kangur/lessons',
  requestedPath = '/kangur/lessons',
  search = '',
}: {
  pageKey?: string;
  pathname?: string;
  requestedPath?: string;
  search?: string;
}) {
  usePathnameMock.mockReturnValue(pathname);
  useSearchParamsMock.mockReturnValue(new URLSearchParams(search));

  return render(
    <KangurRoutingProvider basePath='/kangur' pageKey={pageKey} requestedPath={requestedPath}>
      <KangurLoginModalProvider>
        <LoginModalProbe />
      </KangurLoginModalProvider>
    </KangurRoutingProvider>
  );
}

describe('KangurLoginModalProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({
      push: routerPushMock,
    });
    window.history.replaceState({}, '', '/kangur/lessons?focus=division');
  });

  it('treats the compatibility login route as an open route-driven modal and closes back to home', () => {
    renderHarness({
      pageKey: 'Game',
      pathname: '/kangur/login',
      requestedPath: '/kangur',
      search: 'callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision',
    });

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-home')).toHaveTextContent('/kangur');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/kangur/tests?focus=division'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
  });

  it('opens inline with an explicit callback target and dismisses without navigation', () => {
    renderHarness({});

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/kangur/lessons'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open tests modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/kangur/tests?focus=division'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('false');
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('falls back to the current browser URL when opening inline without an explicit callback', () => {
    renderHarness({
      pageKey: 'Tests',
      pathname: '/kangur/tests',
      requestedPath: '/kangur/tests',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open current page modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      window.location.href
    );
  });
});
