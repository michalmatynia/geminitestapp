/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMeMock, useKangurRoutingMock, routerPushMock } = vi.hoisted(() => ({
  authMeMock: vi.fn(),
  useKangurRoutingMock: vi.fn(),
  routerPushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: authMeMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

import { PageNotFound } from '@/features/kangur/ui/components/PageNotFound';

const createWrapper = (): React.FC<{ children: ReactNode }> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('PageNotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMeMock.mockResolvedValue({ role: 'student' });
    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      requestedPath: '/kangur/missing-page',
    });
  });

  it('renders the home action as a hallmark pill CTA', async () => {
    render(<PageNotFound />, { wrapper: createWrapper() });

    const homeButton = await screen.findByRole('button', { name: 'Go Home' });

    expect(screen.getByTestId('page-not-found-shell')).toHaveClass('kangur-premium-bg');
    expect(homeButton).toHaveClass('kangur-cta-pill', 'primary-cta');
    expect(screen.getByTestId('page-not-found-divider')).toHaveClass('h-0.5', 'w-16', 'bg-slate-200');
  });

  it('routes home through the app router instead of forcing a document reload', async () => {
    render(<PageNotFound />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByRole('button', { name: 'Go Home' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur/game');
  });

  it('uses shared Kangur summary and dot primitives for the admin note', async () => {
    authMeMock.mockResolvedValue({ role: 'admin' });

    render(<PageNotFound />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('page-not-found-admin-note')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByTestId('page-not-found-admin-dot')).toHaveClass('bg-amber-400');
    expect(screen.getByText('Admin Note').parentElement).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
  });
});
