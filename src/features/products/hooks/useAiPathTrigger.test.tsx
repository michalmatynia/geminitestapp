import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const enqueueAiPathRunMock = vi.hoisted(() => vi.fn());
const resolveAiPathRunFromEnqueueResponseDataMock = vi.hoisted(() => vi.fn());
const fetchPathSettingsMock = vi.hoisted(() => vi.fn());
const findTriggerPathMock = vi.hoisted(() => vi.fn());
const invalidateAiPathQueueMock = vi.hoisted(() => vi.fn());
const notifyAiPathRunEnqueuedMock = vi.hoisted(() => vi.fn());
const optimisticallyInsertAiPathRunInQueueCacheMock = vi.hoisted(() => vi.fn());
const createAiPathTriggerRequestIdMock = vi.hoisted(() => vi.fn());
const isRecoverableTriggerEnqueueErrorMock = vi.hoisted(() => vi.fn());
const recoverEnqueuedRunByRequestIdMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const logClientErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  enqueueAiPathRun: enqueueAiPathRunMock,
  resolveAiPathRunFromEnqueueResponseData: resolveAiPathRunFromEnqueueResponseDataMock,
}));

vi.mock('@/features/products/hooks/useAiPathSettings', () => ({
  fetchPathSettings: fetchPathSettingsMock,
  findTriggerPath: findTriggerPathMock,
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAiPathQueue: invalidateAiPathQueueMock,
  notifyAiPathRunEnqueued: notifyAiPathRunEnqueuedMock,
  optimisticallyInsertAiPathRunInQueueCache: optimisticallyInsertAiPathRunInQueueCacheMock,
}));

vi.mock('@/shared/lib/ai-paths/hooks/trigger-event-utils', () => ({
  createAiPathTriggerRequestId: createAiPathTriggerRequestIdMock,
  isRecoverableTriggerEnqueueError: isRecoverableTriggerEnqueueErrorMock,
}));

vi.mock('@/shared/lib/ai-paths/hooks/trigger-event-recovery', () => ({
  recoverEnqueuedRunByRequestId: recoverEnqueuedRunByRequestIdMock,
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

import type { PathConfig } from '@/shared/contracts/ai-paths';
import { useAiPathTrigger } from './useAiPathTrigger';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const buildPathConfig = (): PathConfig =>
  ({
    id: 'path-product-trigger',
    version: 1,
    name: 'Product Trigger Path',
    description: '',
    trigger: 'path_generate_description',
    executionMode: 'server',
    strictFlowMode: true,
    nodes: [
      {
        id: 'node-trigger',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        position: { x: 0, y: 0 },
        data: {},
        inputs: [],
        outputs: ['trigger'],
        config: {
          trigger: { event: 'path_generate_description' },
        },
        createdAt: '2026-03-06T00:00:00.000Z',
        updatedAt: null,
      },
    ],
    edges: [],
    createdAt: '2026-03-06T00:00:00.000Z',
    updatedAt: '2026-03-06T00:00:00.000Z',
  }) as PathConfig;

describe('useAiPathTrigger', () => {
  beforeEach(() => {
    enqueueAiPathRunMock.mockReset();
    resolveAiPathRunFromEnqueueResponseDataMock.mockReset();
    fetchPathSettingsMock.mockReset();
    findTriggerPathMock.mockReset();
    invalidateAiPathQueueMock.mockReset();
    notifyAiPathRunEnqueuedMock.mockReset();
    optimisticallyInsertAiPathRunInQueueCacheMock.mockReset();
    createAiPathTriggerRequestIdMock
      .mockReset()
      .mockReturnValue('trigger:path-product-trigger:req-1');
    isRecoverableTriggerEnqueueErrorMock.mockReset().mockReturnValue(false);
    recoverEnqueuedRunByRequestIdMock.mockReset().mockResolvedValue(null);
    toastMock.mockReset();
    logClientErrorMock.mockReset();

    const pathConfig = buildPathConfig();
    fetchPathSettingsMock.mockResolvedValue({
      orderedConfigs: [pathConfig],
      preferredActivePathId: null,
      uiState: null,
      settingsLoadMode: 'full',
    });
    findTriggerPathMock.mockReturnValue(pathConfig);
  });

  it('recovers a product trigger run after a transport failure', async () => {
    enqueueAiPathRunMock.mockResolvedValue({
      ok: false,
      error: 'Failed to fetch',
    });
    isRecoverableTriggerEnqueueErrorMock.mockReturnValue(true);
    recoverEnqueuedRunByRequestIdMock.mockResolvedValue({
      runId: 'run-recovered-1',
      runRecord: {
        id: 'run-recovered-1',
        status: 'queued',
        pathId: 'path-product-trigger',
      },
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useAiPathTrigger(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.handlePathGenerateDescription({ id: 'product-1' });
    });

    expect(createAiPathTriggerRequestIdMock).toHaveBeenCalledWith({
      pathId: 'path-product-trigger',
      triggerEventId: 'path_generate_description',
      entityType: 'product',
      entityId: 'product-1',
    });
    expect(enqueueAiPathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: 'path-product-trigger',
        requestId: 'trigger:path-product-trigger:req-1',
        meta: expect.objectContaining({
          requestId: 'trigger:path-product-trigger:req-1',
        }),
      }),
      { timeoutMs: 90_000 }
    );
    expect(recoverEnqueuedRunByRequestIdMock).toHaveBeenCalledWith({
      pathId: 'path-product-trigger',
      requestId: 'trigger:path-product-trigger:req-1',
    });
    expect(optimisticallyInsertAiPathRunInQueueCacheMock).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        id: 'run-recovered-1',
        status: 'queued',
        pathId: 'path-product-trigger',
      })
    );
    expect(notifyAiPathRunEnqueuedMock).toHaveBeenCalledWith('run-recovered-1', {
      entityId: 'product-1',
      entityType: 'product',
    });
    expect(toastMock).toHaveBeenCalledWith('AI Path run queued.', { variant: 'success' });
  });

  it('recovers a product trigger run when the enqueue response omits run id fields', async () => {
    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          status: 'queued',
        },
      },
    });
    resolveAiPathRunFromEnqueueResponseDataMock.mockReturnValue({
      runId: null,
      runRecord: null,
    });
    recoverEnqueuedRunByRequestIdMock.mockResolvedValue({
      runId: 'run-recovered-2',
      runRecord: {
        id: 'run-recovered-2',
        status: 'queued',
        pathId: 'path-product-trigger',
      },
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useAiPathTrigger(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.handlePathGenerateDescription({ id: 'product-2' });
    });

    expect(resolveAiPathRunFromEnqueueResponseDataMock).toHaveBeenCalledWith({
      run: {
        status: 'queued',
      },
    });
    expect(recoverEnqueuedRunByRequestIdMock).toHaveBeenCalledWith({
      pathId: 'path-product-trigger',
      requestId: 'trigger:path-product-trigger:req-1',
    });
    expect(notifyAiPathRunEnqueuedMock).toHaveBeenCalledWith('run-recovered-2', {
      entityId: 'product-2',
      entityType: 'product',
    });
    expect(toastMock).toHaveBeenCalledWith('AI Path run queued.', { variant: 'success' });
  });
});
