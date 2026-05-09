// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const mocks = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  invalidateSettingsCacheMock: vi.fn(),
  invalidateAllSettingsMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: mocks.apiPostMock,
  },
}));

vi.mock('@/shared/api/settings-client', () => ({
  fetchSettingsCached: vi.fn(),
  fetchLiteSettingsCached: vi.fn(),
  invalidateSettingsCache: mocks.invalidateSettingsCacheMock,
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAllSettings: mocks.invalidateAllSettingsMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

import { useUpdateSettingsBulk } from './use-settings';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useUpdateSettingsBulk', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
    mocks.apiPostMock.mockImplementation(async (_url: string, payload: unknown) => payload);
    mocks.invalidateAllSettingsMock.mockResolvedValue(undefined);
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('posts Tradera listing currency changes through the settings API', async () => {
    const payloads = [
      { key: TRADERA_SETTINGS_KEYS.defaultDurationHours, value: '72' },
      { key: TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode, value: 'EUR' },
    ];
    const { result } = renderHook(() => useUpdateSettingsBulk(), { wrapper });

    await expect(result.current.mutateAsync(payloads)).resolves.toEqual(payloads);

    expect(mocks.apiPostMock).toHaveBeenNthCalledWith(1, '/api/settings', payloads[0]);
    expect(mocks.apiPostMock).toHaveBeenNthCalledWith(2, '/api/settings', payloads[1]);
    expect(mocks.invalidateSettingsCacheMock).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateAllSettingsMock).toHaveBeenCalledTimes(1);
  });
});
