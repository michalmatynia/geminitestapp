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

const advancedFilterPreset = {
  id: 'preset-1',
  name: 'Pinned SKU',
  filter: {
    type: 'group',
    id: 'root',
    combinator: 'and',
    not: false,
    rules: [
      {
        type: 'condition',
        id: 'condition-1',
        field: 'sku',
        operator: 'contains',
        value: 'PIN',
      },
    ],
  },
} as const;

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
    window.localStorage.clear();
    apiGetMock.mockResolvedValue({
      productListNameLocale: 'name_en',
      productListCatalogFilter: 'all',
      productListCurrencyCode: 'PLN',
      productListPageSize: 96,
      productListThumbnailSource: 'file',
      productListFiltersCollapsedByDefault: false,
      productListShowTriggerRunFeedback: true,
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

  it('loads and saves the trigger run feedback preference', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preferences.showTriggerRunFeedback).toBe(true);

    await act(async () => {
      await result.current.setShowTriggerRunFeedback(false);
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({ showTriggerRunFeedback: false });
  });

  it('hydrates immediate preferences from localStorage while the server query is still loading', () => {
    apiGetMock.mockImplementation(() => new Promise(() => undefined));
    window.localStorage.setItem('productListCatalogFilter', 'catalog-local');
    window.localStorage.setItem('productListPageSize', '36');
    window.localStorage.setItem('productListShowTriggerRunFeedback', 'false');
    window.localStorage.setItem('productListThumbnailSource', 'base64');

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.preferences.catalogFilter).toBe('catalog-local');
    expect(result.current.preferences.pageSize).toBe(36);
    expect(result.current.preferences.showTriggerRunFeedback).toBe(false);
    expect(result.current.preferences.thumbnailSource).toBe('base64');
  });

  it('passes the TanStack abort signal into the preferences request', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useUserPreferences(), { wrapper });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalled();
    });

    expect(apiGetMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('stores advanced filter presets as JSON so they can be reused on the next reload', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.setAdvancedFilterPresets([advancedFilterPreset]);
    });

    expect(window.localStorage.getItem('productListAdvancedFilterPresets')).toBe(
      JSON.stringify([advancedFilterPreset])
    );
    expect(result.current.preferences.advancedFilterPresets).toEqual([advancedFilterPreset]);
  });
});
