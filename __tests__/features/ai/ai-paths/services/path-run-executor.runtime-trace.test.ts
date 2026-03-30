import { describe, it, expect, beforeEach, vi } from 'vitest';

import { evaluateGraphWithIteratorAutoContinue } from '@/shared/lib/ai-paths/core/runtime/engine-server';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import type {
  AiNode,
  Edge,
  AiPathRunRecord,
  AiPathRunRepository,
  AiPathRunUpdate,
  AiPathRunStatus,
} from '@/shared/contracts/ai-paths';
import type { EvaluateGraphArgs } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';

vi.mock('@/shared/lib/ai-paths/core/runtime/engine-server', () => ({
  evaluateGraphWithIteratorAutoContinue: vi.fn(),
}));

let runStore: Record<string, AiPathRunRecord> = {};

const mockRepo = vi.hoisted(() => {
  const repo: Partial<AiPathRunRepository> = {
    createRun: vi.fn().mockImplementation((args: any) => {
      const id = args.id || 'mock-run-id';
      const run: AiPathRunRecord = {
        id,
        status: (args.status as AiPathRunStatus) || 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: args.userId || null,
        pathId: args.pathId,
        requestId: args.requestId || null,
        source: args.source || 'api',
        triggerEvent: args.triggerEvent || null,
        triggerNodeId: args.triggerNodeId || null,
        triggerContext: args.triggerContext || null,
        graph: args.graph || null,
        meta: args.meta || {},
        runtimeState: args.runtimeState || null,
      } as any;
      runStore[id] = run;
      return Promise.resolve(run);
    }),
    listRunNodes: vi.fn().mockResolvedValue([]),
    listRunEvents: vi.fn().mockResolvedValue([]),
    findRunById: vi.fn().mockImplementation((id: string) => Promise.resolve(runStore[id] || null)),
    createRunNodes: vi.fn().mockResolvedValue(undefined),
    createRunEvent: vi.fn().mockResolvedValue({ id: 'mock-event-id' } as any),
    updateRun: vi.fn().mockImplementation((id: string, data: AiPathRunUpdate) => {
      if (runStore[id]) {
        runStore[id] = { ...runStore[id], ...data, updatedAt: new Date().toISOString() };
      }
      return Promise.resolve(runStore[id]);
    }),
    updateRunIfStatus: vi
      .fn()
      .mockImplementation((id: string, statuses: AiPathRunStatus[], data: AiPathRunUpdate) => {
        const run = runStore[id];
        if (run && statuses.includes(run.status)) {
          runStore[id] = { ...run, ...data, updatedAt: new Date().toISOString() };
          return Promise.resolve(runStore[id]);
        }
        return Promise.resolve(null);
      }),
    upsertRunNode: vi.fn().mockResolvedValue(undefined as any),
  };
  return repo as AiPathRunRepository;
});

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn().mockResolvedValue(mockRepo),
}));

describe('PathRunExecutor runtime trace and validation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    runStore = {};
    vi.mocked(mockRepo.findRunById).mockImplementation((id: string) =>
      Promise.resolve(runStore[id] || null)
    );
    vi.mocked(mockRepo.listRunNodes).mockResolvedValue([]);
    vi.mocked(mockRepo.listRunEvents).mockResolvedValue([]);
  });

  const mockNodes: AiNode[] = [
    {
      id: 'node-111111111111111111111111',
      type: 'constant',
      title: 'Const',
      description: '',
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: ['value'],
      config: { constant: { valueType: 'string', value: 'test' } },
    },
  ];

  const mockEdges: Edge[] = [];
  const disconnectedCompileNodes: AiNode[] = [
    {
      id: 'node-trigger-111111111111111111111111',
      type: 'trigger',
      title: 'Trigger',
      description: '',
      position: { x: 0, y: 0 },
      inputs: ['context'],
      outputs: ['trigger', 'context'],
      config: { trigger: { event: 'manual' } },
    },
    {
      id: 'node-model-111111111111111111111111',
      type: 'model',
      title: 'Model',
      description: '',
      position: { x: 180, y: 0 },
      inputs: ['prompt', 'context', 'images'],
      outputs: ['result'],
      inputContracts: {
        prompt: { required: true },
        images: { required: false },
      },
      config: {},
    },
    {
      id: 'node-viewer-111111111111111111111111',
      type: 'viewer',
      title: 'Viewer',
      description: '',
      position: { x: 360, y: 0 },
      inputs: ['result'],
      outputs: [],
      config: {},
    },
  ];
  const disconnectedCompileEdges: Edge[] = [
    {
      id: 'edge-model-viewer',
      from: 'node-model-111111111111111111111111',
      to: 'node-viewer-111111111111111111111111',
      fromPort: 'result',
      toPort: 'result',
    },
  ];

  it('should persist runtime trace profile summary for completed runs', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        if (options.profile?.onSummary) {
          options.profile.onSummary({
            runId: 'mock-run-id',
            durationMs: 1200,
            iterationCount: 1,
            nodeCount: 1,
            edgeCount: 0,
            nodes: [],
            hottestNodes: [],
          });
        }
        return {
          status: 'completed',
          outputs: { 'node-111111111111111111111111': { value: 'trace-ok' } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    expect(mockRepo.updateRunIfStatus).toHaveBeenCalledWith(
      run.id,
      expect.anything(),
      expect.objectContaining({
        meta: expect.objectContaining({
          runtimeTrace: expect.objectContaining({
            profile: expect.objectContaining({
              summary: expect.objectContaining({
                durationMs: 1200,
              }),
            }),
          }),
        }),
      })
    );
  });

  it('should persist structured node spans in runtime trace metadata', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        const node = options.nodes[0]!;
        const spanId = `${node.id}:1:1`;
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: {},
            prevOutputs: {},
            iteration: 1,
            attempt: 1,
          });
        }
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: {},
            prevOutputs: {},
            nextOutputs: { value: 'span-ok' },
            iteration: 1,
            attempt: 1,
            changed: true,
          });
        }

        return {
          status: 'completed',
          outputs: { [node.id]: { value: 'span-ok' } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    const updateCall = vi
      .mocked(mockRepo.updateRunIfStatus)
      .mock.calls.find((c) => (c[2] as any).meta?.runtimeTrace);
    const runtimeTrace = (updateCall?.[2] as any).meta.runtimeTrace;
    const nodeSpans = runtimeTrace?.spans ?? [];
    expect(nodeSpans.length).toBeGreaterThan(0);
    expect(nodeSpans[0]).toMatchObject({
      nodeId: mockNodes[0]!.id,
      status: 'completed',
    });
  });

  it('should persist effect metadata in runtime trace spans', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        const node = {
          ...options.nodes[0]!,
          type: 'http',
          config: {
            runtime: {
              sideEffectPolicy: 'per_activation',
            },
          },
        } as AiNode;
        const spanId = `${node.id}:1:1`;
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: { url: 'https://example.test/items' },
            prevOutputs: {},
            iteration: 1,
            attempt: 1,
          });
        }
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: { url: 'https://example.test/items' },
            prevOutputs: {},
            nextOutputs: { value: { ok: true } },
            iteration: 1,
            attempt: 1,
            changed: false,
            cached: true,
            cacheDecision: 'seed',
            sideEffectPolicy: 'per_activation',
            sideEffectDecision: 'skipped_duplicate',
            activationHash: 'activation-hash-1',
            idempotencyKey: 'http-node:activation-hash-1',
            effectSourceSpanId: 'node-111111111111111111111111:1:1',
          });
        }

        return {
          status: 'completed',
          outputs: { [node.id]: { value: { ok: true } } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    const updateCall = vi
      .mocked(mockRepo.updateRunIfStatus)
      .mock.calls.find((c) => (c[2] as any).meta?.runtimeTrace);
    const runtimeTrace = (updateCall?.[2] as any).meta.runtimeTrace;
    expect(runtimeTrace?.spans?.[0]).toMatchObject({
      nodeId: mockNodes[0]!.id,
      cache: {
        decision: 'seed',
      },
      effect: {
        policy: 'per_activation',
        decision: 'skipped_duplicate',
        sourceSpanId: 'node-111111111111111111111111:1:1',
      },
      activationHash: 'activation-hash-1',
    });

    const finishEventCall = vi.mocked(mockRepo.createRunEvent).mock.calls.find((call) => {
      const metadata = call[0]?.metadata as Record<string, unknown> | undefined;
      return metadata?.['effectSourceSpanId'] === 'node-111111111111111111111111:1:1';
    });
    expect(finishEventCall?.[0]).toMatchObject({
      metadata: expect.objectContaining({
        cacheDecision: 'seed',
        sideEffectPolicy: 'per_activation',
        sideEffectDecision: 'skipped_duplicate',
        activationHash: 'activation-hash-1',
        idempotencyKey: 'http-node:activation-hash-1',
        effectSourceSpanId: 'node-111111111111111111111111:1:1',
      }),
    });
  });

  it('should materialize resume reuse and re-execution provenance in runtime trace spans', async () => {
    const resumeNodes: AiNode[] = [
      {
        id: 'node-upstream',
        type: 'constant',
        title: 'Upstream',
        description: '',
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: ['value'],
        config: { constant: { valueType: 'string', value: 'seeded' } },
      },
      {
        id: 'node-failed',
        type: 'template',
        title: 'Recover',
        description: '',
        position: { x: 240, y: 0 },
        inputs: ['value'],
        outputs: ['value'],
        config: { template: { template: '{{value}}-recovered' } },
      },
    ];
    const resumeEdges: Edge[] = [
      {
        id: 'edge-upstream-failed',
        from: 'node-upstream',
        to: 'node-failed',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    vi.mocked(mockRepo.listRunNodes).mockResolvedValue([
      {
        id: 'rn-upstream',
        runId: 'mock-run-id',
        nodeId: 'node-upstream',
        nodeType: 'constant',
        nodeTitle: 'Upstream',
        status: 'completed',
        attempt: 1,
        inputs: {},
        outputs: { value: 'seeded' },
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      } as any,
      {
        id: 'rn-failed',
        runId: 'mock-run-id',
        nodeId: 'node-failed',
        nodeType: 'template',
        nodeTitle: 'Recover',
        status: 'failed',
        attempt: 1,
        inputs: { value: 'seeded' },
        outputs: { status: 'failed', error: 'boom' },
        errorMessage: 'boom',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      } as any,
    ]);

    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        expect(options.skipNodeIds).toEqual(['node-upstream']);
        const node = options.nodes.find((entry) => entry.id === 'node-failed')!;
        const spanId = `${node.id}:2:1`;
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: { value: 'seeded' },
            prevOutputs: {},
            iteration: 1,
            attempt: 2,
          });
        }
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: { value: 'seeded' },
            prevOutputs: {},
            nextOutputs: { value: 'seeded-recovered' },
            iteration: 1,
            attempt: 2,
            changed: true,
          });
        }

        return {
          status: 'completed',
          nodeStatuses: {
            'node-upstream': 'skipped',
            'node-failed': 'completed',
          },
          nodeOutputs: {
            'node-upstream': { value: 'seeded' },
            'node-failed': { value: 'seeded-recovered' },
          },
          variables: {},
          events: [],
          inputs: {
            'node-upstream': {},
            'node-failed': { value: 'seeded' },
          },
          outputs: {
            'node-upstream': { value: 'seeded' },
            'node-failed': { value: 'seeded-recovered' },
          },
          history: {
            'node-upstream': [
              {
                timestamp: '2026-03-07T06:00:00.000Z',
                pathId: 'test',
                pathName: null,
                traceId: 'mock-run-id',
                spanId: 'node-upstream:1:1',
                nodeId: 'node-upstream',
                nodeType: 'constant',
                nodeTitle: 'Upstream',
                status: 'executed',
                iteration: 1,
                attempt: 1,
                inputs: {},
                outputs: { value: 'seeded' },
                inputHash: 'hash-upstream',
              },
            ],
            'node-failed': [
              {
                timestamp: '2026-03-07T06:00:01.000Z',
                pathId: 'test',
                pathName: null,
                traceId: 'mock-run-id',
                spanId: 'node-failed:1:1',
                nodeId: 'node-failed',
                nodeType: 'template',
                nodeTitle: 'Recover',
                status: 'failed',
                iteration: 1,
                attempt: 1,
                inputs: { value: 'seeded' },
                outputs: { status: 'failed', error: 'boom' },
                inputHash: 'hash-failed',
                error: 'boom',
              },
              {
                timestamp: '2026-03-07T06:00:02.000Z',
                pathId: 'test',
                pathName: null,
                traceId: 'mock-run-id',
                spanId: 'node-failed:2:1',
                nodeId: 'node-failed',
                nodeType: 'template',
                nodeTitle: 'Recover',
                status: 'executed',
                iteration: 1,
                attempt: 2,
                inputs: { value: 'seeded' },
                outputs: { value: 'seeded-recovered' },
                inputHash: 'hash-failed-2',
                resumeMode: 'resume',
                resumeDecision: 'reexecuted',
                resumeReason: 'failed_node',
                resumeSourceTraceId: 'mock-run-id',
                resumeSourceSpanId: 'node-failed:1:1',
                resumeSourceRunStartedAt: '2026-03-07T06:00:00.000Z',
                resumeSourceStatus: 'failed',
              },
            ],
          },
          hashes: {
            'node-upstream': 'hash-upstream',
            'node-failed': 'hash-failed-2',
          },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      status: 'failed',
      graph: { nodes: resumeNodes, edges: resumeEdges },
      meta: {
        aiPathsValidation: { enabled: false },
        resumeMode: 'resume',
      },
      runtimeState: {
        status: 'failed',
        currentRun: {
          id: 'mock-run-id',
          status: 'failed',
          startedAt: '2026-03-07T06:00:00.000Z',
        },
        nodeStatuses: {
          'node-upstream': 'completed',
          'node-failed': 'failed',
        },
        nodeOutputs: {
          'node-upstream': { value: 'seeded' },
          'node-failed': { status: 'failed', error: 'boom' },
        },
        variables: {},
        events: [],
        inputs: {
          'node-upstream': {},
          'node-failed': { value: 'seeded' },
        },
        outputs: {
          'node-upstream': { value: 'seeded' },
        },
        history: {
          'node-upstream': [
            {
              timestamp: '2026-03-07T06:00:00.000Z',
              pathId: 'test',
              pathName: null,
              traceId: 'mock-run-id',
              spanId: 'node-upstream:1:1',
              nodeId: 'node-upstream',
              nodeType: 'constant',
              nodeTitle: 'Upstream',
              status: 'executed',
              iteration: 1,
              attempt: 1,
              inputs: {},
              outputs: { value: 'seeded' },
              inputHash: 'hash-upstream',
            },
          ],
          'node-failed': [
            {
              timestamp: '2026-03-07T06:00:01.000Z',
              pathId: 'test',
              pathName: null,
              traceId: 'mock-run-id',
              spanId: 'node-failed:1:1',
              nodeId: 'node-failed',
              nodeType: 'template',
              nodeTitle: 'Recover',
              status: 'failed',
              iteration: 1,
              attempt: 1,
              inputs: { value: 'seeded' },
              outputs: { status: 'failed', error: 'boom' },
              inputHash: 'hash-failed',
              error: 'boom',
            },
          ],
        },
        hashes: {
          'node-upstream': 'hash-upstream',
          'node-failed': 'hash-failed',
        },
      } as any,
    });

    await executePathRun(run);

    const runtimeTraceUpdates = vi
      .mocked(mockRepo.updateRunIfStatus)
      .mock.calls.filter((call) => (call[2] as any).meta?.runtimeTrace);
    const runtimeTrace = (runtimeTraceUpdates.at(-1)?.[2] as any).meta.runtimeTrace;

    expect(runtimeTrace?.spans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'node-upstream',
          spanId: 'resume-node-upstream-2-1',
          status: 'cached',
          cache: expect.objectContaining({
            decision: 'seed',
          }),
          resume: expect.objectContaining({
            mode: 'resume',
            decision: 'reused',
            reason: 'completed_upstream',
            sourceSpanId: 'node-upstream:1:1',
            sourceStatus: 'completed',
          }),
        }),
        expect.objectContaining({
          nodeId: 'node-failed',
          spanId: 'node-failed:2:1',
          status: 'completed',
          resume: expect.objectContaining({
            mode: 'resume',
            decision: 'reexecuted',
            reason: 'failed_node',
            sourceSpanId: 'node-failed:1:1',
            sourceStatus: 'failed',
          }),
        }),
      ])
    );

    const updatedRun = await mockRepo.findRunById(run.id);
    expect((updatedRun?.runtimeState as any)?.nodeStatuses?.['node-upstream']).toBe('cached');
    expect((updatedRun?.runtimeState as any)?.history?.['node-upstream']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spanId: 'resume-node-upstream-2-1',
          status: 'cached',
          cacheDecision: 'seed',
          resumeMode: 'resume',
          resumeDecision: 'reused',
          resumeReason: 'completed_upstream',
          resumeSourceSpanId: 'node-upstream:1:1',
          resumeSourceStatus: 'completed',
        }),
      ])
    );
    expect((updatedRun?.runtimeState as any)?.history?.['node-failed']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spanId: 'node-failed:2:1',
          status: 'executed',
          resumeMode: 'resume',
          resumeDecision: 'reexecuted',
          resumeReason: 'failed_node',
          resumeSourceSpanId: 'node-failed:1:1',
          resumeSourceStatus: 'failed',
        }),
      ])
    );

    const reuseEvent = vi.mocked(mockRepo.createRunEvent).mock.calls.find((call) => {
      const metadata = call[0]?.metadata as Record<string, unknown> | undefined;
      return metadata?.['resumeDecision'] === 'reused';
    });
    expect(reuseEvent?.[0]).toMatchObject({
      metadata: expect.objectContaining({
        resumeMode: 'resume',
        resumeDecision: 'reused',
        resumeReason: 'completed_upstream',
        resumeSourceSpanId: 'node-upstream:1:1',
      }),
    });
  });

  it('should persist skipped node finishes as skipped trace spans', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockImplementation(
      async (options: EvaluateGraphArgs) => {
        const node = options.nodes[0]!;
        const spanId = `${node.id}:1:1`;
        if (options.onNodeStart) {
          await options.onNodeStart({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: {},
            prevOutputs: {},
            iteration: 1,
            attempt: 1,
          });
        }
        if (options.onNodeFinish) {
          await options.onNodeFinish({
            runId: options.runId!,
            traceId: options.runId!,
            spanId,
            runStartedAt: new Date().toISOString(),
            node,
            nodeInputs: {},
            prevOutputs: {},
            nextOutputs: { status: 'skipped', reason: 'upstream_skipped' },
            iteration: 1,
            attempt: 1,
            changed: false,
          });
        }

        return {
          status: 'completed',
          outputs: { [node.id]: { status: 'skipped', reason: 'upstream_skipped' } },
        } as any;
      }
    );

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: mockNodes, edges: mockEdges },
      meta: { aiPathsValidation: { enabled: false } },
    });

    await executePathRun(run);

    const updateCall = vi
      .mocked(mockRepo.updateRunIfStatus)
      .mock.calls.find((c) => (c[2] as any).meta?.runtimeTrace);
    const runtimeTrace = (updateCall?.[2] as any).meta.runtimeTrace;
    expect(runtimeTrace?.spans?.[0]).toMatchObject({
      nodeId: mockNodes[0]!.id,
      status: 'skipped',
    });
  });

  it('should block execution when disabled node policy is violated', async () => {
    const previous = process.env['AI_PATHS_DISABLED_NODE_TYPES'];
    process.env['AI_PATHS_DISABLED_NODE_TYPES'] = 'constant';

    try {
      const run = await mockRepo.createRun({
        pathId: 'test',
        graph: { nodes: mockNodes, edges: mockEdges },
        meta: { aiPathsValidation: { enabled: false } },
      });

      await expect(executePathRun(run)).rejects.toThrow('Path blocked by node policy');
    } finally {
      if (previous === undefined) {
        delete process.env['AI_PATHS_DISABLED_NODE_TYPES'];
      } else {
        process.env['AI_PATHS_DISABLED_NODE_TYPES'] = previous;
      }
    }
  });

  it('should block strict runs when dependency inspector reports errors and node validation is enabled', async () => {
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: true,
        aiPathsValidation: { enabled: true },
      },
    });

    await expect(executePathRun(run)).rejects.toThrow(
      /is missing required input wiring for port "prompt"/
    );
  });

  it('should bypass strict-flow preflight when node validation is disabled', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockResolvedValue({
      status: 'completed',
      outputs: {},
    } as any);

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: true,
        aiPathsValidation: { enabled: false },
      },
    });

    await executePathRun(run);
    expect(evaluateGraphWithIteratorAutoContinue).toHaveBeenCalledTimes(1);
  });

  it('should bypass compile blockers when node validation is disabled', async () => {
    vi.mocked(evaluateGraphWithIteratorAutoContinue).mockResolvedValue({
      status: 'completed',
      outputs: {},
    } as any);

    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: false,
        aiPathsValidation: { enabled: false },
      },
    });

    await executePathRun(run);
    expect(evaluateGraphWithIteratorAutoContinue).toHaveBeenCalledTimes(1);
  });

  it('should block compile errors when node validation is enabled', async () => {
    const run = await mockRepo.createRun({
      pathId: 'test',
      graph: { nodes: disconnectedCompileNodes, edges: disconnectedCompileEdges },
      meta: {
        strictFlowMode: false,
        aiPathsValidation: { enabled: true },
      },
    });

    await expect(executePathRun(run)).rejects.toThrow(
      /is missing required input wiring for port "prompt"/
    );
    expect(evaluateGraphWithIteratorAutoContinue).not.toHaveBeenCalled();
  });

  it('should block run when AI Paths validation preflight policy fails', async () => {
    const invalidNodes: AiNode[] = [
      {
        id: 'node-trigger-111111111111111111111111',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: ['trigger'],
        config: { trigger: { event: 'manual' } },
      },
      {
        id: 'node-db-111111111111111111111111',
        type: 'database',
        title: 'Database',
        description: '',
        position: { x: 300, y: 0 },
        inputs: ['trigger'],
        outputs: [],
        config: {
          database: {
            operation: 'query',
            query: {
              provider: 'auto',
              collection: '',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{}',
              limit: 1,
              sort: '{}',
              projection: '{}',
              single: false,
            },
          },
        },
      },
    ];

    const invalidEdges: Edge[] = [
      {
        id: 'edge-1',
        from: 'node-trigger-111111111111111111111111',
        to: 'node-db-111111111111111111111111',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const run = await mockRepo.createRun({
      pathId: 'test-validation-failure',
      graph: { nodes: invalidNodes, edges: invalidEdges },
      meta: {
        aiPathsValidation: {
          enabled: true,
          blockThreshold: 80,
        },
      },
    });

    await expect(executePathRun(run)).rejects.toThrow('Validation blocked run');
  });
});
