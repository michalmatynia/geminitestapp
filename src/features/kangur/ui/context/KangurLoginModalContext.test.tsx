/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPushMock, sessionMock, usePathnameMock, useRouterMock, useSearchParamsMock } =
  vi.hoisted(() => ({
    routerPushMock: vi.fn(),
    sessionMock: vi.fn(),
    usePathnameMock: vi.fn(),
    useRouterMock: vi.fn(),
    useSearchParamsMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('next-auth/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-auth/react')>();
  return {
    ...actual,
    useSession: () => sessionMock(),
  };
});

type KangurRoutingProviderType =
  typeof import('@/features/kangur/ui/context/KangurRoutingContext')['KangurRoutingProvider'];
type KangurLoginModalProviderType =
  typeof import('@/features/kangur/ui/context/KangurLoginModalContext')['KangurLoginModalProvider'];
type UseKangurLoginModalType =
  typeof import('@/features/kangur/ui/context/KangurLoginModalContext')['useKangurLoginModal'];

let KangurRoutingProvider: KangurRoutingProviderType;
let KangurLoginModalProvider: KangurLoginModalProviderType;
let useKangurLoginModal: UseKangurLoginModalType;

function LoginModalProbe(): JSX.Element {
  const {
    authMode,
    callbackUrl,
    closeLoginModal,
    dismissLoginModal,
    homeHref,
    isOpen,
    isRouteDriven,
    openLoginModal,
    showParentAuthModeTabs,
  } = useKangurLoginModal();

  return (
    <div>
      <div data-testid='kangur-login-modal-auth-mode'>{authMode}</div>
      <div data-testid='kangur-login-modal-callback'>{callbackUrl}</div>
      <div data-testid='kangur-login-modal-home'>{homeHref}</div>
      <div data-testid='kangur-login-modal-open'>{String(isOpen)}</div>
      <div data-testid='kangur-login-modal-route-driven'>{String(isRouteDriven)}</div>
      <div data-testid='kangur-login-modal-show-tabs'>{String(showParentAuthModeTabs)}</div>
      <button type='button' onClick={() => openLoginModal('/lessons?focus=division')}>
        Open lessons modal
      </button>
      <button
        type='button'
        onClick={() =>
          openLoginModal('/lessons?focus=division', { authMode: 'create-account' })
        }
      >
        Open create-account modal
      </button>
      <button
        type='button'
        onClick={() =>
          openLoginModal('/lessons?focus=division', {
            authMode: 'create-account',
            showParentAuthModeTabs: false,
          })
        }
      >
        Open create-account modal without tabs
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

async function renderHarness({
  basePath = '/kangur',
  pageKey = 'Lessons',
  pathname = '/kangur/lessons',
  requestedPath = '/kangur/lessons',
  search = '',
}: {
  basePath?: string;
  pageKey?: string;
  pathname?: string;
  requestedPath?: string;
  search?: string;
}) {
  usePathnameMock.mockReturnValue(pathname);
  useSearchParamsMock.mockReturnValue(new URLSearchParams(search));

  const RoutingProvider = KangurRoutingProvider;
  const LoginModalProvider = KangurLoginModalProvider;

  return render(
    <RoutingProvider basePath={basePath} pageKey={pageKey} requestedPath={requestedPath}>
      <LoginModalProvider>
        <LoginModalProbe />
      </LoginModalProvider>
    </RoutingProvider>
  );
}

describe('KangurLoginModalProvider', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.resetModules();
    useRouterMock.mockReturnValue({
      push: routerPushMock,
    });
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    window.history.replaceState({}, '', '/kangur/lessons?focus=division');

    ({ KangurRoutingProvider } = await import(
      '@/features/kangur/ui/context/KangurRoutingContext'
    ));
    ({ KangurLoginModalProvider, useKangurLoginModal } = await import(
      '@/features/kangur/ui/context/KangurLoginModalContext'
    ));
  });

  it('treats the compatibility login route as an open route-driven modal and closes back to home', async () => {
    await renderHarness({
      pageKey: 'Game',
      pathname: '/kangur/login',
      requestedPath: '/kangur',
      search: 'callbackUrl=%2Flessons%3Ffocus%3Ddivision',
    });

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-auth-mode')).toHaveTextContent('sign-in');
    expect(screen.getByTestId('kangur-login-modal-home')).toHaveTextContent('/kangur');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/lessons?focus=division'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
  });

  it('opens inline with an explicit callback target and dismisses without navigation', async () => {
    await renderHarness({});

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-login-modal-auth-mode')).toHaveTextContent('sign-in');
    expect(screen.getByTestId('kangur-login-modal-show-tabs')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/kangur/lessons'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open lessons modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/lessons?focus=division'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('false');
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('opens inline in create-account mode when requested explicitly', async () => {
    await renderHarness({});

    fireEvent.click(screen.getByRole('button', { name: 'Open create-account modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-auth-mode')).toHaveTextContent(
      'create-account'
    );
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/lessons?focus=division'
    );
    expect(screen.getByTestId('kangur-login-modal-show-tabs')).toHaveTextContent('true');
  });

  it('can open inline in create-account mode with the parent auth tabs hidden', async () => {
    await renderHarness({});

    fireEvent.click(screen.getByRole('button', { name: 'Open create-account modal without tabs' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-auth-mode')).toHaveTextContent(
      'create-account'
    );
    expect(screen.getByTestId('kangur-login-modal-show-tabs')).toHaveTextContent('false');
  });

  it('falls back to the current browser URL when opening inline without an explicit callback', async () => {
    await renderHarness({});

    fireEvent.click(screen.getByRole('button', { name: 'Open current page modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/kangur/lessons?focus=division'
    );
  });

  it('reads create-account mode from the compatibility login route query', async () => {
    await renderHarness({
      pageKey: 'Game',
      pathname: '/kangur/login',
      requestedPath: '/kangur',
      search: 'callbackUrl=%2Flessons%3Ffocus%3Ddivision&authMode=create-account',
    });

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-auth-mode')).toHaveTextContent(
      'create-account'
    );
  });

  it('sanitizes blocked games callbacks to home for non-super-admin sessions', async () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    await renderHarness({
      pageKey: 'Game',
      pathname: '/kangur/login',
      requestedPath: '/kangur',
      search: 'callbackUrl=%2Fkangur%2Fgames',
    });

    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent('/kangur');
  });

  it('closes the canonical public login route back to root when Kangur owns the front page', async () => {
    await renderHarness({
      basePath: '/',
      pageKey: 'Game',
      pathname: '/login',
      requestedPath: '/',
      search: 'callbackUrl=%2Fkangur%2Fprofile',
    });

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-home')).toHaveTextContent('/');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent('/profile');

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(routerPushMock).toHaveBeenCalledWith('/', { scroll: false });
  });

  it('treats the localized canonical public login route as route-driven when Kangur owns the front page', async () => {
    await renderHarness({
      basePath: '/',
      pageKey: 'Game',
      pathname: '/en/login',
      requestedPath: '/',
      search: 'callbackUrl=%2Fkangur%2Fprofile',
    });

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-home')).toHaveTextContent('/');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent('/en/profile');
  });

  it('canonicalizes the current-page callback when opening an inline modal in root-owned mode', async () => {
    window.history.replaceState({}, '', '/en/kangur/profile?tab=stats#summary');

    await renderHarness({
      basePath: '/',
      pageKey: 'LearnerProfile',
      pathname: '/en/profile',
      requestedPath: '/profile',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open current page modal' }));

    expect(screen.getByTestId('kangur-login-modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('kangur-login-modal-route-driven')).toHaveTextContent('false');
    expect(screen.getByTestId('kangur-login-modal-callback')).toHaveTextContent(
      '/en/profile?tab=stats#summary'
    );
  });
});
