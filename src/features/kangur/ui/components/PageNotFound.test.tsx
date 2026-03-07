/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMeMock, useKangurRoutingMock } = vi.hoisted(() => ({
  authMeMock: vi.fn(),
  useKangurRoutingMock: vi.fn(),
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
    authMeMock.mockResolvedValue({ role: 'student' });
    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      requestedPath: '/kangur/missing-page',
    });
  });

  it('renders the home action as a hallmark pill CTA', async () => {
    render(<PageNotFound />, { wrapper: createWrapper() });

    const homeButton = await screen.findByRole('button', { name: 'Go Home' });

    expect(homeButton).toHaveClass('kangur-cta-pill', 'play-cta');
  });
});
