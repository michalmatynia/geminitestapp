import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { studioKeys } from '@/shared/lib/query-key-exports';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const prefetchQueryV2Mock = vi.fn();
const fetchStudioProjectsMock = vi.fn();
const fetchAiPathsSettingsCachedMock = vi.fn();

vi.mock('@/features/ai/image-studio/hooks/useImageStudioQueries', () => ({
  fetchStudioProjects: (...args: unknown[]) => fetchStudioProjectsMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  fetchAiPathsSettingsCached: (...args: unknown[]) => fetchAiPathsSettingsCachedMock(...args),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  prefetchQueryV2: (...args: unknown[]) => prefetchQueryV2Mock(...args),
}));

import { useAdminDataPrefetch } from './useAdminDataPrefetch';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useAdminDataPrefetch', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prefetches image studio projects with the shared projects fetcher and key', async () => {
    prefetchQueryV2Mock.mockImplementation((_queryClient: unknown, config: { queryFn: () => Promise<unknown> }) => {
      return (): Promise<unknown> => config.queryFn();
    });
    fetchStudioProjectsMock.mockResolvedValue([]);

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAdminDataPrefetch(), { wrapper });

    await act(async () => {
      result.current.prefetchByHref('/admin/image-studio');
      await Promise.resolve();
    });

    expect(prefetchQueryV2Mock).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        queryKey: normalizeQueryKey(studioKeys.projects()),
      })
    );
    expect(fetchStudioProjectsMock).toHaveBeenCalledTimes(1);
  });

  it('prefetches ai paths settings with the shared settings fetcher and key', async () => {
    prefetchQueryV2Mock.mockImplementation((_queryClient: unknown, config: { queryFn: () => Promise<unknown> }) => {
      return (): Promise<unknown> => config.queryFn();
    });
    fetchAiPathsSettingsCachedMock.mockResolvedValue([]);

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAdminDataPrefetch(), { wrapper });

    await act(async () => {
      result.current.prefetchByHref('/admin/ai-paths');
      await Promise.resolve();
    });

    expect(prefetchQueryV2Mock).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        queryKey: normalizeQueryKey(QUERY_KEYS.ai.aiPaths.settings()),
      })
    );
    expect(fetchAiPathsSettingsCachedMock).toHaveBeenCalledWith({ bypassCache: true });
  });
});
