import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  AiNode,
  AiPathRuntimeNodeStatus,
  RuntimeState,
} from '@/shared/lib/ai-paths';
import { normalizeAiPathRuntimeNodeStatus } from '@/shared/contracts/ai-paths-runtime';

import type { LocalExecutionArgs } from '../types';

const evaluateGraphClientMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/ai-paths', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths')>(
    '@/shared/lib/ai-paths'
  );
  return {
    ...actual,
    evaluateGraphClient: evaluateGraphClientMock,
  };
});

import { useLocalExecutionLoop } from '../segments/useLocalExecutionLoop';

const normalizeNodeStatus = normalizeAiPathRuntimeNodeStatus;

const buildLocalExecutionArgs = (): LocalExecutionArgs => {
  const triggerNode = {
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
  } as AiNode;
  const runtimeStateRef = {
    current: {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    } as RuntimeState,
  };

  const setRuntimeState = vi.fn(
    (
      next:
        | RuntimeState
        | ((previous: RuntimeState) => RuntimeState)
    ): void => {
      runtimeStateRef.current =
        typeof next === 'function' ? next(runtimeStateRef.current) : next;
    }
  );

  return {
    activePathId: 'path-main',
    activeTab: 'runtime',
    activeTrigger: 'manual',
    executionMode: 'local',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: {
      enabled: false,
    },
    historyRetentionPasses: 5,
    isPathActive: true,
    edges: [],
    normalizedNodes: [triggerNode],
    sanitizedEdges: [],
    pathName: 'Path Main',
    pathDescription: '',
    runtimeKernelConfig: {
      mode: 'legacy_only',
      pilotNodeTypes: 'Template Node, parser',
      codeObjectResolverIds: ' resolver.primary , resolver.fallback ',
      strictCodeObjectRegistry: 'yes',
    },
    parserSamples: {},
    updaterSamples: {},
    sessionUser: null,
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
    appendRuntimeEvent: vi.fn(),
    setNodeStatus: vi.fn(),
    setRuntimeState,
    setLastRunAt: vi.fn(),
    settleTransientNodeStatuses: vi.fn(),
    resetRuntimeNodeStatuses: vi.fn(),
    normalizeNodeStatus,
    formatStatusLabel: (status: AiPathRuntimeNodeStatus): string => status,
    hasPendingIteratorAdvance: vi.fn(() => false),
    fetchEntityByType: vi.fn(async () => null),
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    stopServerRunStream: vi.fn(),
    runServerStream: vi.fn(async () => undefined),
  };
};

describe('useLocalExecutionLoop runtime kernel forwarding', () => {
  it('forwards normalized runtime-kernel options to local graph evaluation', async () => {
    evaluateGraphClientMock.mockResolvedValue({
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    } satisfies RuntimeState);

    const args = buildLocalExecutionArgs();
    const { result } = renderHook(() => useLocalExecutionLoop(args));

    await act(async () => {
      await result.current.runLocalLoop('run');
    });

    expect(evaluateGraphClientMock).toHaveBeenCalledTimes(1);
    expect(evaluateGraphClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKernelMode: 'auto',
        runtimeKernelPilotNodeTypes: ['template_node', 'parser'],
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
        runtimeKernelStrictNativeRegistry: true,
      })
    );
  });
});
