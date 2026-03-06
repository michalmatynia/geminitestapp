import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  AiNode,
  AiPathRuntimeNodeStatus,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/lib/ai-paths';
import { normalizeAiPathRuntimeNodeStatus } from '@/shared/contracts/ai-paths-runtime';

const enqueueAiPathRunMock = vi.hoisted(() => vi.fn());
const streamAiPathRunMock = vi.hoisted(() => vi.fn());

const invalidateAiPathQueueMock = vi.hoisted(() => vi.fn());
const invalidateAiPathRunsMock = vi.hoisted(() => vi.fn());
const notifyAiPathRunEnqueuedMock = vi.hoisted(() => vi.fn());
const optimisticallyInsertAiPathRunInQueueCacheMock = vi.hoisted(() => vi.fn());

const setPathConfigsMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/ai-paths', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths')>(
    '@/shared/lib/ai-paths'
  );
  return {
    ...actual,
    enqueueAiPathRun: enqueueAiPathRunMock,
    streamAiPathRun: streamAiPathRunMock,
  };
});

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAiPathQueue: invalidateAiPathQueueMock,
  invalidateAiPathRuns: invalidateAiPathRunsMock,
  notifyAiPathRunEnqueued: notifyAiPathRunEnqueuedMock,
  optimisticallyInsertAiPathRunInQueueCache: optimisticallyInsertAiPathRunInQueueCacheMock,
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => ({
    setPathConfigs: setPathConfigsMock,
  }),
}));

import { useAiPathsServerExecution } from '../useAiPathsServerExecution';

const createWrapper = (): React.ComponentType<{ children: React.ReactNode }> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

const buildTriggerNode = (): AiNode =>
  ({
    id: 'node-trigger',
    type: 'trigger',
    title: 'Trigger',
    description: '',
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: ['trigger'],
    data: {},
    config: {
      trigger: { event: 'manual' },
    },
    createdAt: '2026-03-05T00:00:00.000Z',
    updatedAt: null,
  }) as AiNode;

const buildFetcherNode = (): AiNode =>
  ({
    id: 'node-fetcher',
    type: 'fetcher',
    title: 'Fetcher',
    description: '',
    position: { x: 200, y: 0 },
    inputs: ['trigger'],
    outputs: ['status', 'value'],
    data: {},
    config: {},
    createdAt: '2026-03-05T00:00:00.000Z',
    updatedAt: null,
  }) as AiNode;

const normalizeNodeStatus = normalizeAiPathRuntimeNodeStatus;

describe('useAiPathsServerExecution history streaming', () => {
  it('appends node history entries when SSE node updates arrive', async () => {
    let runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    };
    const runtimeStateRef = { current: runtimeState };
    const currentRunIdRef = { current: null as string | null };
    const currentRunStartedAtRef = { current: null as string | null };

    const setRuntimeState = vi.fn(
      (
        next:
          | RuntimeState
          | ((prev: RuntimeState) => RuntimeState)
      ): void => {
        runtimeState = typeof next === 'function' ? next(runtimeState) : next;
        runtimeStateRef.current = runtimeState;
      }
    );

    const listeners = new Map<string, Array<(event: Event) => void>>();
    const eventSource = {
      addEventListener: (type: string, listener: (event: Event) => void): void => {
        const existing = listeners.get(type) ?? [];
        existing.push(listener);
        listeners.set(type, existing);
      },
      close: vi.fn(),
      readyState: 1,
      onerror: null,
    } as unknown as EventSource;

    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          id: 'run_server_1',
          status: 'queued',
          createdAt: '2026-03-05T07:10:00.000Z',
          updatedAt: '2026-03-05T07:10:00.000Z',
          pathId: 'path-main',
        },
      },
    });
    streamAiPathRunMock.mockReturnValue(eventSource);

    const triggerNode = buildTriggerNode();
    const fetcherNode = buildFetcherNode();

    const { result } = renderHook(
      () =>
        useAiPathsServerExecution({
          activePathId: 'path-main',
          pathName: 'Main Path',
          pathDescription: '',
          runtimeKernelConfig: {
            mode: 'auto',
            pilotNodeTypes: ['template'],
            codeObjectResolverIds: ['resolver.path'],
          },
          activeTrigger: 'manual',
          executionMode: 'server',
          runMode: 'manual',
          strictFlowMode: true,
          blockedRunPolicy: 'fail_run',
          aiPathsValidation: { enabled: false },
          historyRetentionPasses: 5,
          normalizedNodes: [triggerNode, fetcherNode],
          sanitizedEdges: [],
          parserSamples: {},
          updaterSamples: {},
          runtimeStateRef,
          resetRuntimeNodeStatuses: vi.fn(),
          setRuntimeState,
          setRuntimeEvents: vi.fn(),
          appendRuntimeEvent: vi.fn(),
          setNodeStatus: vi.fn(),
          normalizeNodeStatus,
          formatStatusLabel: (status: AiPathRuntimeNodeStatus) => status,
          settleTransientNodeStatuses: vi.fn(),
          setRunStatus: vi.fn(),
          setLastRunAt: vi.fn(),
          toast: vi.fn(),
          currentRunIdRef,
          currentRunStartedAtRef,
          setCurrentRunId: vi.fn(),
          openRunDetail: vi.fn(),
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.runServerStream(triggerNode, 'manual', {});
    });
    expect(enqueueAiPathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          runtimeKernelConfig: {
            mode: 'auto',
            pilotNodeTypes: ['template'],
            codeObjectResolverIds: ['resolver.path'],
          },
        }),
      })
    );

    const nodePayload = [
      {
        id: 'run_node_1',
        runId: 'run_server_1',
        nodeId: fetcherNode.id,
        nodeType: fetcherNode.type,
        nodeTitle: fetcherNode.title,
        status: 'completed',
        attempt: 1,
        inputs: {
          trigger: true,
        } as RuntimePortValues,
        outputs: {
          status: 'completed',
          value: 42,
        } as RuntimePortValues,
      },
    ];

    act(() => {
      const nodeHandlers = listeners.get('nodes') ?? [];
      const event = new MessageEvent('nodes', {
        data: JSON.stringify(nodePayload),
      });
      nodeHandlers.forEach((handler) => handler(event));
    });

    const nodeHistory = runtimeStateRef.current.history?.[fetcherNode.id] ?? [];
    expect(nodeHistory).toHaveLength(1);
    expect(nodeHistory[0]?.nodeType).toBe('fetcher');
    expect(nodeHistory[0]?.status).toBe('completed');
    expect(nodeHistory[0]?.outputs?.['value']).toBe(42);
    expect(invalidateAiPathRunsMock).toHaveBeenCalled();
  });
});
