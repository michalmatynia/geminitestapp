import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateListingBadges: vi.fn(),
}));

import { useIntegrationOperations } from './useIntegrationOperations';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useIntegrationOperations listing badges query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue({});
  });

  it('loads listing badges via GET with normalized productIds', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useIntegrationOperations([' product-2 ', 'product-1', 'product-2']), {
      wrapper,
    });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        '/api/v2/integrations/product-listings?productIds=product-1%2Cproduct-2',
        { cache: 'no-store' }
      );
    });
  });
});
