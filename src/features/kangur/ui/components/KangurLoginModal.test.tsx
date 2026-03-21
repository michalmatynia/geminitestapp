/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';


const { useKangurLoginModalMock } = vi.hoisted(() => ({
  useKangurLoginModalMock: vi.fn(),
}));

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
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div data-testid='dialog-content' {...props}>
      {children}
    </div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Description: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: useKangurLoginModalMock,
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
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KangurLoginModal />
      </QueryClientProvider>
    );

    expect(closeLoginModal).not.toHaveBeenCalled();
  });

  it('closes inline when the dialog requests a close', () => {
    const closeLoginModal = vi.fn();

    useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      closeLoginModal,
      dismissLoginModal: vi.fn(),
      homeHref: '/kangur',
      isOpen: true,
      isRouteDriven: false,
      openLoginModal: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KangurLoginModal />
      </QueryClientProvider>
    );

    expect(closeLoginModal).toHaveBeenCalledTimes(1);
  });
});
