import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validationError } from '@/shared/errors/app-error';

const { loadTriggerSettingsDataMock, logClientErrorMock, logClientCatchMock, toastMock } = vi.hoisted(() => ({
  loadTriggerSettingsDataMock: vi.fn(),
  logClientErrorMock: vi.fn(),
  logClientCatchMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/hooks/trigger-event-settings', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/hooks/trigger-event-settings')
  >('@/shared/lib/ai-paths/hooks/trigger-event-settings');
  return {
    ...actual,
    loadTriggerSettingsData: (...args: unknown[]) => loadTriggerSettingsDataMock(...args),
  };
});

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  enqueueAiPathRun: vi.fn(),
  listAiPathRuns: vi.fn(),
  mergeEnqueuedAiPathRunForCache: vi.fn(),
  resolveAiPathRunFromEnqueueResponseData: vi.fn(),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAiPathSettings: vi.fn(),
  notifyAiPathRunEnqueued: vi.fn(),
  optimisticallyInsertAiPathRunInQueueCache: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  invalidateAiPathsSettingsCache: vi.fn(),
  updateAiPathsSetting: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
}));

import { useAiPathTriggerEvent } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';

const createWrapper = (): ((props: PropsWithChildren) => ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useAiPathTriggerEvent settings-load failures', () => {
  beforeEach(() => {
    loadTriggerSettingsDataMock.mockReset();
    logClientErrorMock.mockReset();
    toastMock.mockReset();
  });

  it('surfaces missing preferred-path settings errors without collapsing them into a generic toast', async () => {
    const message =
      'Trigger button is bound to missing AI Path "path-missing". Update the button configuration.';
    loadTriggerSettingsDataMock.mockRejectedValue(
      validationError(message, {
        source: 'ai_paths.trigger_payload',
        reason: 'preferred_path_config_missing',
        preferredPathId: 'path-missing',
      })
    );
    const onProgress = vi.fn();

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        triggerEventId: 'button-product-row',
        triggerLabel: 'Trigger',
        preferredPathId: 'path-missing',
        entityType: 'product',
        entityId: 'product-1',
        onProgress,
      });
    });

    expect(toastMock).toHaveBeenNthCalledWith(1, 'Preparing AI Path run: Trigger', {
      variant: 'info',
    });
    expect(toastMock).toHaveBeenNthCalledWith(2, message, {
      variant: 'error',
    });
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'error',
        error: 'preferred_path_missing',
        message,
      })
    );
  });
});
