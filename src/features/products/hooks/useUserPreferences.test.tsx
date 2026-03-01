import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, apiPatchMock, mutateAsyncMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    patch: (...args: unknown[]) => apiPatchMock(...args),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('@/shared/hooks/offline/useOfflineMutation', () => ({
  useOfflineMutation: () => ({
    mutateAsync: (...args: unknown[]) => mutateAsyncMock(...args),
  }),
}));

import { useUserPreferences } from './useUserPreferences';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useUserPreferences page size normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue({
      productListNameLocale: 'name_en',
      productListCatalogFilter: 'all',
      productListCurrencyCode: 'PLN',
      productListPageSize: 96,
      productListThumbnailSource: 'file',
      productListFiltersCollapsedByDefault: false,
      productListAdvancedFilterPresets: [],
      productListAppliedAdvancedFilter: '',
      productListAppliedAdvancedFilterPresetId: null,
    });
    mutateAsyncMock.mockResolvedValue(undefined);
  });

  it('clamps loaded page size to 48', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preferences.pageSize).toBe(48);
  });

  it('clamps saved page size to 48', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.setPageSize(96);
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({ pageSize: 48 });
  });
});
