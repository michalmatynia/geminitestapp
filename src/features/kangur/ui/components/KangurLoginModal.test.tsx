/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';

const { useKangurLoginModalMock } = vi.hoisted(() => ({
  useKangurLoginModalMock: vi.fn(),
}));
const kangurLoginPagePropsMock = vi.hoisted(() => vi.fn());

vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({
    children,
    onOpenChange,
    open,
  }: {
    children: React.ReactNode;
    onOpenChange?: (value: boolean) => void;
    open?: boolean;
  }) => {
    if (open && onOpenChange) {
      onOpenChange(false);
    }
    return <div data-testid='dialog-root'>{children}</div>;
  },
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='dialog-portal'>{children}</div>
  ),
  Trigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='dialog-trigger'>{children}</div>
  ),
  Close: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='dialog-close'>{children}</div>
  ),
  Overlay: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid='dialog-overlay' {...props} />
  ),
  Content: ({
    children,
    onEscapeKeyDown: _onEscapeKeyDown,
    onInteractOutside: _onInteractOutside,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
    onEscapeKeyDown?: (event: Event) => void;
    onInteractOutside?: (event: Event) => void;
  }) => (
    <div data-testid='dialog-content' {...props}>
      {children}
    </div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Description: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: useKangurLoginModalMock,
  useKangurLoginModalActions: useKangurLoginModalMock,
  useKangurLoginModalState: useKangurLoginModalMock,
}));

vi.mock('@/features/kangur/ui/KangurLoginPage', () => ({
  __esModule: true,
  default: (props: unknown) => {
    kangurLoginPagePropsMock(props);
    return <div data-testid='kangur-login-page' />;
  },
}));

import { KangurLoginModal } from '@/features/kangur/ui/components/KangurLoginModal';

describe('KangurLoginModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('ignores immediate close signals when the modal is route-driven', () => {
    const closeLoginModal = vi.fn();

    useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      closeLoginModal,
      dismissLoginModal: vi.fn(),
      homeHref: '/kangur',
      isOpen: true,
      isRouteDriven: true,
      openLoginModal: vi.fn(),
      showParentAuthModeTabs: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KangurLoginModal />
      </QueryClientProvider>
    );

    expect(closeLoginModal).not.toHaveBeenCalled();
    expect(kangurLoginPagePropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        callbackUrl: '/kangur',
        onClose: undefined,
        parentAuthMode: 'sign-in',
        showParentAuthModeTabs: true,
      })
    );
  });

  it('closes inline when the dialog requests a close', () => {
    const closeLoginModal = vi.fn();
    const dismissLoginModal = vi.fn();

    useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      closeLoginModal,
      dismissLoginModal,
      homeHref: '/kangur',
      isOpen: true,
      isRouteDriven: false,
      openLoginModal: vi.fn(),
      showParentAuthModeTabs: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KangurLoginModal />
      </QueryClientProvider>
    );

    expect(closeLoginModal).toHaveBeenCalledTimes(1);
    expect(kangurLoginPagePropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        callbackUrl: '/kangur',
        onClose: dismissLoginModal,
        parentAuthMode: 'sign-in',
        showParentAuthModeTabs: true,
      })
    );
  });

  it('passes the requested callback and create-account mode through to the login page', () => {
    useKangurLoginModalMock.mockReturnValue({
      authMode: 'create-account',
      callbackUrl: '/lessons?focus=division',
      closeLoginModal: vi.fn(),
      dismissLoginModal: vi.fn(),
      homeHref: '/kangur',
      isOpen: true,
      isRouteDriven: false,
      openLoginModal: vi.fn(),
      showParentAuthModeTabs: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KangurLoginModal />
      </QueryClientProvider>
    );

    expect(kangurLoginPagePropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        callbackUrl: '/lessons?focus=division',
        parentAuthMode: 'create-account',
        showParentAuthModeTabs: false,
      })
    );
  });
});
