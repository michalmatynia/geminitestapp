import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, logClientErrorMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import { useCatalogSync } from './useCatalogSync';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useCatalogSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/api/v2/products/entities/catalogs') {
        return Promise.resolve([
          {
            id: 'catalog-1',
            name: 'Catalog 1',
            languageIds: ['EN'],
            defaultLanguageId: 'EN',
          },
        ]);
      }
      if (url === '/api/v2/products/metadata/price-groups') {
        return Promise.resolve([
          {
            id: 'group-1',
            name: 'Retail',
            isDefault: true,
            currency: { code: 'PLN' },
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
  });

  it('loads admin products metadata queries with abort signals and derives selector options locally', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCatalogSync('catalog-1'), { wrapper });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.catalogs).toEqual([
        {
          id: 'catalog-1',
          name: 'Catalog 1',
          languageIds: ['EN'],
          defaultLanguageId: 'EN',
          priceGroupIds: [],
          defaultPriceGroupId: null,
        },
      ]);
    });

    expect(apiGetMock).toHaveBeenCalledTimes(2);
    expect(result.current.languageOptions).toEqual([{ value: 'name_en', label: 'English' }]);
    expect(result.current.fallbackNameLocale).toBe('name_en');
    expect(result.current.currencyOptions).toEqual(['PLN']);
    expect(result.current.currencyCode).toBe('PLN');
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/products/entities/catalogs',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/products/metadata/price-groups',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });
});
