import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useQuerySync } from './useQuerySync';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useQuerySync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays dormant when every sync config is disabled', () => {
    const queryClient = createQueryClient();
    const subscribeSpy = vi.spyOn(queryClient.getQueryCache(), 'subscribe');
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useQuerySync([{ queryKey: ['products'], enabled: false }]), {
      wrapper,
    });

    expect(subscribeSpy).not.toHaveBeenCalled();
    expect(
      addEventListenerSpy.mock.calls.some(([eventName]) => eventName === 'storage')
    ).toBe(false);
  });

  it('subscribes to cache updates and storage events when an enabled config exists', () => {
    const queryClient = createQueryClient();
    const subscribeSpy = vi.spyOn(queryClient.getQueryCache(), 'subscribe');
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useQuerySync([{ queryKey: ['products'], enabled: true }]), {
      wrapper,
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(
      addEventListenerSpy.mock.calls.some(([eventName]) => eventName === 'storage')
    ).toBe(true);
  });
});
