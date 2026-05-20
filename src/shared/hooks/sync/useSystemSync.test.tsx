// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { logClientEventMock, processQueueMock } = vi.hoisted(() => ({
  logClientEventMock: vi.fn(),
  processQueueMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientEvent: logClientEventMock,
}));

vi.mock('../offline/useOfflineMutation', () => ({
  useOfflineSync: () => ({
    processQueue: processQueueMock,
  }),
}));

import { useSystemSync } from './useSystemSync';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('useSystemSync', () => {
  beforeEach(() => {
    logClientEventMock.mockClear();
    processQueueMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs periodic critical data refetches without reporting routine info telemetry', async () => {
    vi.useFakeTimers();
    const queryClient = createQueryClient();
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue(undefined);

    renderHook(() => useSystemSync({ enabled: true, interval: 1000 }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(refetchQueries).toHaveBeenCalledTimes(3);
    expect(logClientEventMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ action: 'periodic-sync' }),
      })
    );
  });
});
