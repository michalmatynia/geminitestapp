/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

import { buildDefaultKangurPageContentStore } from '@/features/kangur/page-content-catalog';
import { useKangurPageContentStore } from '@/features/kangur/ui/hooks/useKangurPageContent';

const STALE_TIME_MS = 5 * 60_000;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
};

describe('useKangurPageContentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue(buildDefaultKangurPageContentStore('pl'));
  });

  afterEach(() => {
    vi.useRealTimers();
    focusManager.setFocused(undefined);
  });

  it('does not refetch stale page content when Kangur widgets remount', () => {
    vi.useFakeTimers();

    const { wrapper } = createWrapper();
    const firstMount = renderHook(() => useKangurPageContentStore(), { wrapper });

    expect(firstMount.result.current.data?.entries.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();

    firstMount.unmount();

    vi.advanceTimersByTime(STALE_TIME_MS + 1);

    const secondMount = renderHook(() => useKangurPageContentStore(), { wrapper });

    expect(secondMount.result.current.data?.entries.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('does not refetch stale page content when the window regains focus', () => {
    vi.useFakeTimers();

    const { wrapper } = createWrapper();
    const query = renderHook(() => useKangurPageContentStore(), { wrapper });

    expect(query.result.current.data?.entries.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(STALE_TIME_MS + 1);

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    expect(query.result.current.data?.entries.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });
});
