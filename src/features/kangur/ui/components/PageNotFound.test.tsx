/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMeMock, sessionMock, useKangurRoutingMock, usePathnameMock, routerPushMock } =
  vi.hoisted(() => ({
    authMeMock: vi.fn(),
    useKangurRoutingMock: vi.fn(),
    usePathnameMock: vi.fn(),
    routerPushMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
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
  useOptionalKangurRouting: () => useKangurRoutingMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
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
    usePathnameMock.mockReturnValue('/kangur/missing-page');
    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      pageKey: null,
      requestedPath: '/kangur/missing-page',
    });
  });

  it('renders the home action as a hallmark pill CTA', async () => {
    render(<PageNotFound />, { wrapper: createWrapper() });

    const homeButton = await screen.findByRole('button', { name: 'Wróć do strony głównej' });

    expect(screen.getByTestId('page-not-found-shell')).toHaveClass('kangur-premium-bg');
    expect(homeButton).toHaveClass(
      'kangur-cta-pill',
      'primary-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByTestId('page-not-found-divider')).toHaveClass('h-0.5', 'w-16', 'bg-slate-200');
    expect(screen.getByRole('heading', { name: 'Nie znaleziono strony' })).toBeInTheDocument();
  });

  it('routes home through the app router instead of forcing a document reload', async () => {
    render(<PageNotFound />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByRole('button', { name: 'Wróć do strony głównej' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
  });

  it('uses shared Kangur summary and dot primitives for the admin note', async () => {
    authMeMock.mockResolvedValue({ role: 'admin' });

    render(<PageNotFound />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('page-not-found-admin-note')).toHaveClass(
      'soft-card',
      'border',
      'mt-8',
      'text-left'
    );
    expect(screen.getByTestId('page-not-found-admin-dot')).toHaveClass('bg-amber-400');
    expect(screen.getByText('Notatka administratora').parentElement).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );
  });

  it('uses the sanitized routing state instead of exposing a blocked GamesLibrary path', async () => {
    usePathnameMock.mockReturnValue('/kangur');
    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      pageKey: 'Game',
      requestedPath: '/kangur',
    });

    render(<PageNotFound />, { wrapper: createWrapper() });

    expect(
      await screen.findByText('Nie udało się znaleźć strony "nieznana" w tej aplikacji.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Nie udało się znaleźć strony "games" w tej aplikacji.')
    ).not.toBeInTheDocument();
  });
});
