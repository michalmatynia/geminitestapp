import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';

import { useLocalExecutionTriggers } from '../segments/useLocalExecutionTriggers';
import type { LocalExecutionArgs } from '../types';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    type: 'viewer',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    createdAt: '2026-03-11T00:00:00.000Z',
    updatedAt: null,
    ...patch,
  }) as AiNode;

const buildTriggerNode = (): AiNode =>
  buildNode({
    id: 'trigger-1',
    type: 'trigger',
    title: 'Trigger',
    inputs: ['context'],
    outputs: ['trigger', 'context'],
    config: {
      trigger: {
        event: 'manual',
      },
    },
  });

const buildSimulationNode = (): AiNode =>
  buildNode({
    id: 'simulation-1',
    type: 'simulation',
    title: 'Simulation',
    outputs: ['context', 'entityId', 'entityType', 'entityJson', 'productId'],
    config: {
      simulation: {
        entityId: 'product-123',
        entityType: 'product',
      },
    },
  });

const buildFetcherNode = (): AiNode =>
  buildNode({
    id: 'fetcher-1',
    type: 'fetcher',
    title: 'Fetcher',
    inputs: ['trigger', 'context', 'entityId', 'entityType'],
    outputs: ['context', 'meta', 'entityId', 'entityType'],
    config: {
      fetcher: {
        sourceMode: 'live_context',
      },
    },
  });

const buildRuntimeState = (): RuntimeState =>
  ({
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: {},
    variables: {},
    events: [],
    currentRun: null,
    inputs: {},
    outputs: {},
    history: {},
    hashes: {},
    hashTimestamps: {},
  }) as RuntimeState;

const createArgs = ({
  normalizedNodes,
  sanitizedEdges,
  executionMode = 'local',
}: {
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  executionMode?: LocalExecutionArgs['executionMode'];
}): {
  args: LocalExecutionArgs;
  runtimeStateRef: { current: RuntimeState };
  setRuntimeState: ReturnType<typeof vi.fn>;
  runServerStream: ReturnType<typeof vi.fn>;
  fetchEntityByType: ReturnType<typeof vi.fn>;
  appendRuntimeEvent: ReturnType<typeof vi.fn>;
  setNodeStatus: ReturnType<typeof vi.fn>;
  toast: ReturnType<typeof vi.fn>;
} => {
  let runtimeState = buildRuntimeState();
  const runtimeStateRef = { current: runtimeState };
  const setRuntimeState = vi.fn((next: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => {
    runtimeState = typeof next === 'function' ? next(runtimeState) : next;
    runtimeStateRef.current = runtimeState;
  });
  const runServerStream = vi.fn(async () => undefined);
  const fetchEntityByType = vi.fn(async () => ({
    id: 'product-123',
    title: 'Product 123',
  }));
  const appendRuntimeEvent = vi.fn();
  const setNodeStatus = vi.fn();
  const toast = vi.fn();

  const args: LocalExecutionArgs = {
    activePathId: 'path-1',
    activeTab: 'runtime',
    activeTrigger: 'manual',
    contextRegistry: null,
    executionMode,
    runMode: 'manual',
    strictFlowMode: false,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: { enabled: false },
    historyRetentionPasses: 5,
    isPathActive: true,
    edges: sanitizedEdges,
    normalizedNodes,
    sanitizedEdges,
    onCanonicalEdgesDetected: undefined,
    pathName: 'Path',
    pathDescription: '',
    runtimeKernelConfig: undefined,
    parserSamples: {},
    updaterSamples: {},
    sessionUser: {
      id: 'user-1',
      name: 'User',
      email: 'user@example.com',
    },
    runtimeStateRef,
    currentRunIdRef: { current: null },
    currentRunStartedAtRef: { current: null },
    currentRunStartedAtMsRef: { current: null },
    lastTriggerNodeIdRef: { current: null },
    lastTriggerEventRef: { current: null },
    triggerContextRef: { current: null },
    runLoopActiveRef: { current: false },
    runInFlightRef: { current: false },
    abortControllerRef: { current: null },
    pauseRequestedRef: { current: false },
    queuedRunsRef: { current: [] },
    serverRunActiveRef: { current: false },
    setRunStatus: vi.fn(),
    appendRuntimeEvent,
    setNodeStatus,
    setRuntimeState,
    setLastRunAt: vi.fn(),
    settleTransientNodeStatuses: vi.fn(),
    resetRuntimeNodeStatuses: vi.fn(),
    normalizeNodeStatus: vi.fn(),
    formatStatusLabel: vi.fn((status: string) => status),
    hasPendingIteratorAdvance: vi.fn(() => false),
    fetchEntityByType,
    reportAiPathsError: vi.fn(),
    toast,
    stopServerRunStream: vi.fn(),
    runServerStream,
  };

  return {
    args,
    runtimeStateRef,
    setRuntimeState,
    runServerStream,
    fetchEntityByType,
    appendRuntimeEvent,
    setNodeStatus,
    toast,
  };
};

describe('useLocalExecutionTriggers', () => {
  it('hydrates connected simulation context before running a local fetcher-first graph', async () => {
    const triggerNode = buildTriggerNode();
    const simulationNode = buildSimulationNode();
    const fetcherNode = buildFetcherNode();
    const edges: Edge[] = [
      {
        id: 'edge-simulation-trigger',
        from: simulationNode.id,
        to: triggerNode.id,
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-trigger-fetcher',
        from: triggerNode.id,
        to: fetcherNode.id,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];
    const {
      args,
      runtimeStateRef,
      fetchEntityByType,
      appendRuntimeEvent,
      setNodeStatus,
      toast,
    } = createArgs({
      normalizedNodes: [triggerNode, simulationNode, fetcherNode],
      sanitizedEdges: edges,
      executionMode: 'local',
    });
    const runLocalLoop = vi.fn(async () => ({
      status: 'completed' as const,
      state: runtimeStateRef.current,
    }));
    const finalizeLocalRunOutcome = vi.fn();

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    expect(fetchEntityByType).toHaveBeenCalledWith('product', 'product-123');
    expect(runLocalLoop).toHaveBeenCalledTimes(1);
    expect(runtimeStateRef.current.outputs?.[simulationNode.id]).toEqual(
      expect.objectContaining({
        entityId: 'product-123',
        entityType: 'product',
        productId: 'product-123',
        entityJson: {
          id: 'product-123',
          title: 'Product 123',
        },
      })
    );
    expect(finalizeLocalRunOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
      }),
      expect.objectContaining({
        triggerContext: expect.objectContaining({
          entityId: 'product-123',
          entityType: 'product',
          productId: 'product-123',
          entityJson: {
            id: 'product-123',
            title: 'Product 123',
          },
          source: 'simulation',
        }),
      })
    );
    expect(appendRuntimeEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_blocked',
      })
    );
    expect(setNodeStatus).not.toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
      })
    );
    expect(toast).not.toHaveBeenCalledWith(
      expect.stringContaining('Canvas run blocked'),
      expect.anything()
    );
  });

  it('blocks a fetcher-first graph without entity context instead of entering execution', async () => {
    const triggerNode = buildTriggerNode();
    const fetcherNode = buildFetcherNode();
    const edges: Edge[] = [
      {
        id: 'edge-trigger-fetcher',
        from: triggerNode.id,
        to: fetcherNode.id,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];
    const { args, appendRuntimeEvent, setNodeStatus, toast } = createArgs({
      normalizedNodes: [triggerNode, fetcherNode],
      sanitizedEdges: edges,
      executionMode: 'local',
    });
    const runLocalLoop = vi.fn(async () => ({
      status: 'completed' as const,
      state: buildRuntimeState(),
    }));
    const finalizeLocalRunOutcome = vi.fn();

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    expect(runLocalLoop).not.toHaveBeenCalled();
    expect(finalizeLocalRunOutcome).not.toHaveBeenCalled();
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_blocked',
        metadata: expect.objectContaining({
          reason: 'missing_entity_context',
        }),
      })
    );
    expect(setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: triggerNode.id,
        status: 'blocked',
        metadata: expect.objectContaining({
          reason: 'missing_entity_context',
          fetcherNodeTitles: ['Fetcher'],
        }),
      })
    );
    expect(toast).toHaveBeenCalledWith(
      'Canvas run blocked: connected Fetcher nodes require entity context. Connect a Simulation node or run this workflow from the product surface.',
      { variant: 'error' }
    );
  });
});
