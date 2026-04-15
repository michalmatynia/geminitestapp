import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';

const { evaluateRunPreflightMock, evaluateLocalExecutionSecurityMock, brainModelOptionsMock } = vi.hoisted(() => ({
  evaluateRunPreflightMock: vi.fn(),
  evaluateLocalExecutionSecurityMock: vi.fn(),
  brainModelOptionsMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/core/utils', async () => {
  const actual =
    await vi.importActual<typeof import('@/shared/lib/ai-paths/core/utils')>('@/shared/lib/ai-paths/core/utils');
  return {
    ...actual,
    evaluateRunPreflight: evaluateRunPreflightMock,
  };
});

vi.mock('../local-execution-security', () => ({
  evaluateLocalExecutionSecurity: evaluateLocalExecutionSecurityMock,
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => brainModelOptionsMock(),
}));

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

const buildPreflightResult = () => ({
  validationReport: {
    blocked: false,
    shouldWarn: false,
    score: 100,
    policy: 'block_below_threshold' as const,
    warnThreshold: 70,
    blockThreshold: 60,
    failedRules: 0,
    findings: [],
  },
  compileReport: {
    ok: true,
    errors: 0,
    warnings: 0,
    findings: [],
  },
  dependencyReport: {
    errors: 0,
    warnings: 0,
    risks: [],
  },
  dataContractReport: {
    errors: 0,
    warnings: 0,
    issues: [],
  },
  nodeValidationEnabled: true,
});

const createArgs = ({
  normalizedNodes,
  sanitizedEdges,
  executionMode = 'local',
  persistPendingNodeConfigBeforeRun = vi.fn(async () => true),
}: {
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  executionMode?: LocalExecutionArgs['executionMode'];
  persistPendingNodeConfigBeforeRun?: NonNullable<
    LocalExecutionArgs['persistPendingNodeConfigBeforeRun']
  >;
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
    nodeConfigDirty: false,
    nodeConfigDraft: null,
    persistPendingNodeConfigBeforeRun,
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
  beforeEach(() => {
    vi.clearAllMocks();
    evaluateRunPreflightMock.mockReturnValue(buildPreflightResult());
    evaluateLocalExecutionSecurityMock.mockReturnValue([]);
    brainModelOptionsMock.mockReturnValue({
      models: [],
      descriptors: {},
      isLoading: false,
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: '',
        agentId: '',
        notes: null,
      },
      effectiveModelId: '',
      sourceWarnings: [],
      refresh: vi.fn(),
    });
  });

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
    expect(args.runInFlightRef.current).toBe(false);
    expect(args.currentRunIdRef.current).toBeNull();
    expect(args.currentRunStartedAtRef.current).toBeNull();
    expect(args.currentRunStartedAtMsRef.current).toBe(0);
    expect(args.triggerContextRef.current).toBeNull();
    expect(args.setRunStatus).toHaveBeenCalledWith('idle');
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

  it('resets local run state when the loop throws during a simulation-backed run', async () => {
    const triggerNode = buildTriggerNode();
    const simulationNode = buildSimulationNode();
    const edges: Edge[] = [
      {
        id: 'edge-simulation-trigger',
        from: simulationNode.id,
        to: triggerNode.id,
        fromPort: 'context',
        toPort: 'context',
      },
    ];
    const { args, runtimeStateRef, fetchEntityByType } = createArgs({
      normalizedNodes: [triggerNode, simulationNode],
      sanitizedEdges: edges,
      executionMode: 'local',
    });
    const loopFailure = new Error('loop exploded');
    const runLocalLoop = vi.fn(async () => {
      throw loopFailure;
    });
    const finalizeLocalRunOutcome = vi.fn();

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    expect(fetchEntityByType).toHaveBeenCalledWith('product', 'product-123');
    expect(args.runInFlightRef.current).toBe(false);
    expect(args.currentRunIdRef.current).toBeNull();
    expect(args.currentRunStartedAtRef.current).toBeNull();
    expect(args.currentRunStartedAtMsRef.current).toBe(0);
    expect(args.triggerContextRef.current).toBeNull();
    expect(args.abortControllerRef.current).toBeNull();
    expect(args.pauseRequestedRef.current).toBe(false);
    expect(args.setRunStatus).toHaveBeenCalledWith('idle');
    expect(finalizeLocalRunOutcome).toHaveBeenCalledWith(
      {
        status: 'error',
        error: loopFailure,
        state: runtimeStateRef.current,
      },
      expect.objectContaining({
        triggerContext: expect.objectContaining({
          entityId: 'product-123',
          entityType: 'product',
          productId: 'product-123',
          source: 'simulation',
        }),
      })
    );
  });

  it('persists pending node config before entering the run loop', async () => {
    const triggerNode = buildTriggerNode();
    const callOrder: string[] = [];
    const persistPendingNodeConfigBeforeRun = vi.fn(async () => {
      callOrder.push('persist');
      return true;
    });
    const { args, runtimeStateRef } = createArgs({
      normalizedNodes: [triggerNode],
      sanitizedEdges: [],
      executionMode: 'local',
      persistPendingNodeConfigBeforeRun,
    });
    const runLocalLoop = vi.fn(async () => {
      callOrder.push('run');
      return {
        status: 'completed' as const,
        state: runtimeStateRef.current,
      };
    });
    const finalizeLocalRunOutcome = vi.fn();

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    expect(persistPendingNodeConfigBeforeRun).toHaveBeenCalledTimes(1);
    expect(runLocalLoop).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['persist', 'run']);
  });

  it('aborts the run when pending node config persistence fails', async () => {
    const triggerNode = buildTriggerNode();
    const persistPendingNodeConfigBeforeRun = vi.fn(async () => false);
    const { args } = createArgs({
      normalizedNodes: [triggerNode],
      sanitizedEdges: [],
      executionMode: 'local',
      persistPendingNodeConfigBeforeRun,
    });
    const runLocalLoop = vi.fn();
    const finalizeLocalRunOutcome = vi.fn();

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    expect(persistPendingNodeConfigBeforeRun).toHaveBeenCalledTimes(1);
    expect(runLocalLoop).not.toHaveBeenCalled();
    expect(finalizeLocalRunOutcome).not.toHaveBeenCalled();
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

    console.log('runLocalLoop calls:', runLocalLoop.mock.calls);
    console.log('appendRuntimeEvent calls:', appendRuntimeEvent.mock.calls);

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

  it('blocks local execution when inline credentials are detected', async () => {
    const triggerNode = buildTriggerNode();
    const { args, appendRuntimeEvent, setNodeStatus, toast } = createArgs({
      normalizedNodes: [triggerNode],
      sanitizedEdges: [],
      executionMode: 'local',
    });
    const runLocalLoop = vi.fn();
    const finalizeLocalRunOutcome = vi.fn();

    evaluateLocalExecutionSecurityMock.mockReturnValue([
      {
        nodeId: 'api-node',
        kind: 'inline_credential',
      },
    ]);

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    console.log('runLocalLoop calls:', runLocalLoop.mock.calls);
    console.log('appendRuntimeEvent calls:', appendRuntimeEvent.mock.calls);

    expect(runLocalLoop).not.toHaveBeenCalled();
    expect(finalizeLocalRunOutcome).not.toHaveBeenCalled();
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_blocked',
        metadata: expect.objectContaining({
          localExecutionSecurityBlocked: true,
          issueCount: 1,
        }),
      })
    );
    expect(setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
        metadata: expect.objectContaining({
          localExecutionSecurityBlocked: true,
          issueCount: 1,
        }),
      })
    );
    expect(toast).toHaveBeenCalledWith(
      'Local run blocked: inline credentials detected. Switch execution mode to Server or use connection-based auth.',
      { variant: 'error' }
    );
  });

  it('blocks runs when validation preflight fails', async () => {
    const triggerNode = buildTriggerNode();
    const { args, appendRuntimeEvent, setNodeStatus, toast } = createArgs({
      normalizedNodes: [triggerNode],
      sanitizedEdges: [],
      executionMode: 'local',
    });
    const runLocalLoop = vi.fn();
    const finalizeLocalRunOutcome = vi.fn();

    evaluateRunPreflightMock.mockReturnValue({
      ...buildPreflightResult(),
      validationReport: {
        blocked: true,
        shouldWarn: false,
        score: 25,
        policy: 'block_below_threshold',
        warnThreshold: 70,
        blockThreshold: 60,
        failedRules: 2,
        findings: [
          {
            ruleId: 'rule-1',
            ruleTitle: 'Rule 1',
            severity: 'error',
            message: 'Broken validation',
          },
        ],
      },
    });

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_blocked',
        message: 'Validation blocked run: Rule 1.',
      })
    );
    expect(setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
        metadata: expect.objectContaining({
          validationBlocked: true,
          validationScore: 25,
          validationBlockThreshold: 60,
        }),
      })
    );
    expect(toast).toHaveBeenCalledWith(
      'Validation blocked run (score 25). Fix validation findings in Path Settings.',
      { variant: 'error' }
    );
  });

  it('blocks local runs when a vision-enabled model resolves to a text-only Brain model', async () => {
    const triggerNode = buildTriggerNode();
    const modelNode = buildNode({
      id: 'model-1',
      type: 'model',
      title: 'Normalize Model',
      inputs: ['prompt', 'images'],
      outputs: ['result'],
      config: {
        model: {
          modelId: '',
          temperature: 0.1,
          maxTokens: 800,
          vision: true,
          waitForResult: true,
        },
      },
    });
    const { args, appendRuntimeEvent, setNodeStatus, toast } = createArgs({
      normalizedNodes: [triggerNode, modelNode],
      sanitizedEdges: [],
      executionMode: 'local',
    });
    const runLocalLoop = vi.fn();
    const finalizeLocalRunOutcome = vi.fn();

    brainModelOptionsMock.mockReturnValue({
      models: ['brain-default-text'],
      descriptors: {
        'brain-default-text': {
          id: 'brain-default-text',
          family: 'chat',
          modality: 'text',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
      },
      isLoading: false,
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'brain-default-text',
        agentId: '',
        notes: null,
      },
      effectiveModelId: 'brain-default-text',
      sourceWarnings: [],
      refresh: vi.fn(),
    });

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode);
    });

    console.log('runLocalLoop calls:', runLocalLoop.mock.calls);
    console.log('appendRuntimeEvent calls:', appendRuntimeEvent.mock.calls);

    expect(runLocalLoop).not.toHaveBeenCalled();
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_blocked',
        metadata: expect.objectContaining({
          modelCapability: expect.objectContaining({
            issues: [
              expect.objectContaining({
                nodeId: 'model-1',
                modelId: 'brain-default-text',
                modality: 'text',
              }),
            ],
          }),
        }),
      })
    );
    expect(setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
        metadata: expect.objectContaining({
          modelCapabilityBlocked: true,
          issueCount: 1,
        }),
      })
    );
    expect(toast).toHaveBeenCalledWith(
      'Model node "Normalize Model" has Accepts Images enabled but effective AI Brain model "brain-default-text" is text. Choose a multimodal model or disable image input for this node.',
      { variant: 'error' }
    );
  });

  it('warns for validation and compile issues, normalizes canonical edges, and can pause a run', async () => {
    const triggerNode = buildTriggerNode();
    const nonCanonicalEdges: Edge[] = [
      {
        id: 'edge-1',
        from: triggerNode.id,
        to: 'viewer-1',
        fromPort: ' trigger ',
        toPort: ' trigger ',
      },
    ];
    const sanitizedEdges: Edge[] = [
      {
        id: 'edge-1',
        from: triggerNode.id,
        to: 'viewer-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];
    const viewerNode = buildNode({
      id: 'viewer-1',
      type: 'viewer',
      title: 'Viewer',
      inputs: ['trigger'],
    });
    const { args, appendRuntimeEvent, toast } = createArgs({
      normalizedNodes: [triggerNode, viewerNode],
      sanitizedEdges,
      executionMode: 'local',
    });
    const onCanonicalEdgesDetected = vi.fn();
    args.edges = nonCanonicalEdges;
    args.onCanonicalEdgesDetected = onCanonicalEdgesDetected;
    const runLocalLoop = vi.fn(async () => ({
      status: 'paused' as const,
      state: buildRuntimeState(),
    }));
    const finalizeLocalRunOutcome = vi.fn();

    evaluateRunPreflightMock.mockReturnValue({
      ...buildPreflightResult(),
      validationReport: {
        blocked: false,
        shouldWarn: true,
        score: 72,
        policy: 'warn_below_threshold',
        warnThreshold: 80,
        blockThreshold: 60,
        failedRules: 1,
        findings: [],
      },
      compileReport: {
        ok: true,
        errors: 0,
        warnings: 2,
        findings: [{ message: 'Warn' }],
      },
      dataContractReport: {
        errors: 0,
        warnings: 1,
        issues: [{ id: 'issue-1', severity: 'warn', message: 'Data contract warning' }],
      },
    });

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode, {} as React.MouseEvent);
    });

    expect(onCanonicalEdgesDetected).toHaveBeenCalledWith(sanitizedEdges);
    expect(runLocalLoop).toHaveBeenCalledWith('run');
    expect(finalizeLocalRunOutcome).not.toHaveBeenCalled();
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_warning',
        message: 'Validation warning: score 72 with 1 failed rule(s).',
      })
    );
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_warning',
        message: 'Graph compile reported 2 warning(s).',
      })
    );
    expect(appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'run_paused',
      })
    );
    expect(toast).toHaveBeenCalledWith('Validation warning: score 72 with 1 failed rule(s).', {
      variant: 'warning',
    });
    expect(toast).toHaveBeenCalledWith('Graph compile reported 2 warning(s).', {
      variant: 'warning',
    });
    expect(toast).toHaveBeenCalledWith('Workflow started from Trigger.', { variant: 'info' });
  });

  it('delegates to server execution and cancels stale local state first', async () => {
    const triggerNode = buildTriggerNode();
    const { args, runServerStream, toast } = createArgs({
      normalizedNodes: [triggerNode],
      sanitizedEdges: [],
      executionMode: 'server',
    });
    const abortController = new AbortController();
    const abortSpy = vi.spyOn(abortController, 'abort');
    const runLocalLoop = vi.fn();
    const finalizeLocalRunOutcome = vi.fn();

    args.runInFlightRef.current = true;
    args.abortControllerRef.current = abortController;

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode, {} as React.MouseEvent);
    });

    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(args.setRunStatus).toHaveBeenCalledWith('idle');
    expect(runServerStream).toHaveBeenCalledWith(
      triggerNode,
      'manual',
      expect.objectContaining({
        source: expect.objectContaining({
          pathId: 'path-1',
          pathName: 'Path',
          tab: 'runtime',
        }),
        extras: expect.objectContaining({
          triggerLabel: 'manual',
        }),
      })
    );
    expect(toast).toHaveBeenCalledWith(
      'Canceled in-progress local run and switched to server execution.',
      { variant: 'warning' }
    );
    expect(toast).toHaveBeenCalledWith('Launching workflow from Trigger...', {
      variant: 'info',
    });
  });

  it('queues automatic reruns when local execution is already in flight', async () => {
    const triggerNode = buildTriggerNode();
    const { args, setNodeStatus, toast } = createArgs({
      normalizedNodes: [triggerNode],
      sanitizedEdges: [],
      executionMode: 'local',
    });
    const runLocalLoop = vi.fn();
    const finalizeLocalRunOutcome = vi.fn();

    args.runMode = 'automatic';
    args.runInFlightRef.current = true;

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.runGraphForTrigger(triggerNode, undefined, {
        entityId: 'product-1',
      });
    });

    expect(runLocalLoop).not.toHaveBeenCalled();
    expect(args.queuedRunsRef.current).toHaveLength(1);
    expect(args.queuedRunsRef.current[0]).toEqual(
      expect.objectContaining({
        triggerNodeId: triggerNode.id,
        pathId: 'path-1',
        contextOverride: expect.objectContaining({
          entityId: 'product-1',
        }),
      })
    );
    expect(setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
      })
    );
    expect(toast).toHaveBeenCalledWith('Run queued.', { variant: 'info' });
    expect(finalizeLocalRunOutcome).not.toHaveBeenCalled();
  });

  it('clears local runtime state and syncs connected simulations from fallback context', async () => {
    const triggerNode = buildTriggerNode();
    const simulationNode = buildNode({
      id: 'simulation-entity',
      type: 'simulation',
      title: 'Simulation Entity',
      outputs: ['context', 'entityId', 'entityType'],
      config: {
        simulation: {
          entityType: 'collection',
        },
      },
    });
    const edges: Edge[] = [
      {
        id: 'edge-simulation-trigger',
        from: simulationNode.id,
        to: triggerNode.id,
        fromPort: 'context',
        toPort: 'context',
      },
    ];
    const { args, runtimeStateRef, fetchEntityByType, setNodeStatus, setRuntimeState } = createArgs({
      normalizedNodes: [triggerNode, simulationNode],
      sanitizedEdges: edges,
      executionMode: 'local',
    });
    const runLocalLoop = vi.fn();
    const finalizeLocalRunOutcome = vi.fn();

    fetchEntityByType.mockResolvedValue({
      id: 'collection-42',
      title: 'Collection 42',
    });
    runtimeStateRef.current = {
      ...buildRuntimeState(),
      currentRun: {
        id: 'run-1',
        status: 'running',
        startedAt: '2026-03-11T12:00:00.000Z',
      },
      outputs: {
        stale: {
          status: 'completed',
        },
      },
    } as RuntimeState;
    args.runtimeStateRef.current = runtimeStateRef.current;
    args.currentRunIdRef.current = 'run-1';
    args.currentRunStartedAtRef.current = '2026-03-11T12:00:00.000Z';
    args.currentRunStartedAtMsRef.current = 1;
    args.triggerContextRef.current = { entityId: 'stale' };
    args.lastTriggerNodeIdRef.current = triggerNode.id;
    args.lastTriggerEventRef.current = 'manual';

    const { result } = renderHook(() =>
      useLocalExecutionTriggers(args, { runLocalLoop }, { finalizeLocalRunOutcome })
    );

    await act(async () => {
      await result.current.handleTriggerConnectedSimulation(triggerNode, {
        entityId: 'collection-42',
        entityType: 'collection',
      });
    });

    await waitFor(() => {
      expect(fetchEntityByType).toHaveBeenCalledWith('collection', 'collection-42');
    });

    expect(setNodeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: simulationNode.id,
        status: 'completed',
        kind: 'node_finished',
      })
    );
    expect(args.runtimeStateRef.current.outputs?.[simulationNode.id]).toEqual(
      expect.objectContaining({
        entityId: 'collection-42',
        entityType: 'collection',
      })
    );

    act(() => {
      result.current.handleClearLocalRun();
    });

    expect(setRuntimeState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentRun: null,
        outputs: {},
      })
    );
    expect(args.currentRunIdRef.current).toBeNull();
    expect(args.currentRunStartedAtRef.current).toBeNull();
    expect(args.currentRunStartedAtMsRef.current).toBe(0);
    expect(args.triggerContextRef.current).toBeNull();
    expect(args.lastTriggerNodeIdRef.current).toBeNull();
    expect(args.lastTriggerEventRef.current).toBeNull();
  });
});
