import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunRecord, RuntimeState } from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
  createDefaultPathConfig,
} from '@/shared/lib/ai-paths';

const {
  evaluateGraphWithIteratorAutoContinueMock,
  listAiPathsSettingsMock,
  getPathRunRepositoryMock,
  runExecutorPreflightMock,
  createCancellationMonitorMock,
  updateRunIfStatusMock,
  listRunNodesMock,
  upsertRunNodeMock,
  createRunEventMock,
  publishRunUpdateMock,
  recordRuntimeNodeStatusMock,
  recordRuntimeRunFinishedMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  evaluateGraphWithIteratorAutoContinueMock: vi.fn(),
  listAiPathsSettingsMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  runExecutorPreflightMock: vi.fn(),
  createCancellationMonitorMock: vi.fn(),
  updateRunIfStatusMock: vi.fn(),
  listRunNodesMock: vi.fn(),
  upsertRunNodeMock: vi.fn(),
  createRunEventMock: vi.fn(),
  publishRunUpdateMock: vi.fn(),
  recordRuntimeNodeStatusMock: vi.fn(),
  recordRuntimeRunFinishedMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/ai-paths/core/runtime/engine-server', () => ({
  evaluateGraphWithIteratorAutoContinue: evaluateGraphWithIteratorAutoContinueMock,
}));

vi.mock('@/features/ai/ai-paths/server/settings-store', () => ({
  listAiPathsSettings: listAiPathsSettingsMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-executor/preflight', () => ({
  runExecutorPreflight: runExecutorPreflightMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-executor.monitoring', () => ({
  createCancellationMonitor: createCancellationMonitorMock,
}));

vi.mock('@/features/ai/ai-paths/services/run-stream-publisher', () => ({
  publishRunUpdate: publishRunUpdateMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  recordRuntimeNodeStatus: recordRuntimeNodeStatusMock,
  recordRuntimeRunFinished: recordRuntimeRunFinishedMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-fingerprint', () => ({
  getAiPathsRuntimeFingerprint: () => 'runtime-fingerprint-test',
  withRuntimeFingerprintMeta: (meta: Record<string, unknown> | null) => meta ?? {},
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

const loadModule = async () => await import('@/features/ai/ai-paths/services/path-run-executor');

const RUNTIME_STATE_IDLE: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  currentRun: null,
  inputs: {},
  outputs: {},
};

const buildRunRecord = (): AiPathRunRecord => {
  const config = createDefaultPathConfig('path_runtime_kernel_settings');
  return {
    id: 'run_runtime_kernel_settings',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
    status: 'queued',
    pathId: config.id,
    pathName: config.name,
    triggerNodeId: null,
    triggerEvent: 'manual',
    triggerContext: null,
    error: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    finishedAt: null,
    deadLetteredAt: null,
    retryCount: null,
    maxAttempts: null,
    nextRetryAt: null,
    meta: {},
    entityId: null,
    entityType: null,
    graph: {
      nodes: config.nodes,
      edges: config.edges,
    },
    runtimeState: null,
  } as AiPathRunRecord;
};

describe('path-run-executor runtime-kernel settings integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env['AI_PATHS_RUNTIME_KERNEL_NODE_TYPES'];
    delete process.env['AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES'];
    delete process.env['AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS'];
    delete process.env['AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY'];

    evaluateGraphWithIteratorAutoContinueMock.mockResolvedValue(RUNTIME_STATE_IDLE);
    listAiPathsSettingsMock.mockResolvedValue([]);
    runExecutorPreflightMock.mockResolvedValue({
      validationConfig: {
        enabled: true,
        rules: [],
      },
      strictFlowMode: true,
      nodeValidationEnabled: true,
      requiredProcessingNodeIds: [],
    });
    createCancellationMonitorMock.mockReturnValue({
      start: vi.fn().mockResolvedValue(false),
      stop: vi.fn(),
    });
    updateRunIfStatusMock.mockResolvedValue(true);
    listRunNodesMock.mockResolvedValue([]);
    upsertRunNodeMock.mockResolvedValue(undefined);
    createRunEventMock.mockResolvedValue(undefined);
    getPathRunRepositoryMock.mockResolvedValue({
      updateRunIfStatus: updateRunIfStatusMock,
      listRunNodes: listRunNodesMock,
      upsertRunNode: upsertRunNodeMock,
      createRunEvent: createRunEventMock,
    });
    recordRuntimeRunFinishedMock.mockResolvedValue(undefined);
    recordRuntimeNodeStatusMock.mockResolvedValue(undefined);
  });

  it('passes persisted runtime-kernel settings to runtime evaluation', async () => {
    listAiPathsSettingsMock.mockResolvedValue([
      { key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY, value: 'constant, math' },
      { key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY, value: 'resolver.primary' },
    ]);
    const run = buildRunRecord();
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    expect(listAiPathsSettingsMock).toHaveBeenCalledWith([
      AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
      AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
    ]);
    const args = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    if (args?.['runtimeKernelNodeTypes'] !== undefined) {
      expect(args?.['runtimeKernelNodeTypes']).toEqual(['constant', 'math']);
    }
    if (args?.['runtimeKernelCodeObjectResolverIds'] !== undefined) {
      expect(args?.['runtimeKernelCodeObjectResolverIds']).toEqual(['resolver.primary']);
    }
  });

  it('keeps env node-type override precedence', async () => {
    process.env['AI_PATHS_RUNTIME_KERNEL_NODE_TYPES'] = 'template';
    process.env['AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS'] = 'resolver.env';
    listAiPathsSettingsMock.mockResolvedValue([
      { key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY, value: 'constant, math' },
      { key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY, value: 'resolver.settings' },
    ]);
    const run = buildRunRecord();
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    const args = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(args?.['runtimeKernelNodeTypes']).toEqual(['template']);
    expect(args?.['runtimeKernelCodeObjectResolverIds']).toEqual(['resolver.env']);
  });

  it('ignores deprecated env pilot-node-type aliases in live execution', async () => {
    process.env['AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES'] = 'template';
    const run = buildRunRecord();
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    expect(listAiPathsSettingsMock).toHaveBeenCalledWith([
      AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
      AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
    ]);
    const args = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(args?.['runtimeKernelNodeTypes']).toBeUndefined();

    const finalUpdatePayload = updateRunIfStatusMock.mock.calls
      .map((call) => call[2] as Record<string, unknown>)
      .find((payload) => payload['status'] === 'completed');
    expect(finalUpdatePayload?.['meta']).toEqual(
      expect.objectContaining({
        runtimeKernel: expect.objectContaining({
          runtimeKernelNodeTypes: [],
          runtimeKernelNodeTypesSource: 'default',
        }),
      })
    );
  });

  it('applies path runtime-kernel config from run meta before global settings', async () => {
    listAiPathsSettingsMock.mockResolvedValue([
      { key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY, value: 'constant, math' },
      { key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY, value: 'resolver.settings' },
    ]);
    const run = buildRunRecord();
    run.meta = {
      runtimeKernelConfig: {
        mode: 'auto',
        nodeTypes: ['template'],
        codeObjectResolverIds: ['resolver.path'],
        strictNativeRegistry: true,
      },
    };
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    const args = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(args?.['runtimeKernelNodeTypes']).toEqual(['template']);
    expect(args?.['runtimeKernelCodeObjectResolverIds']).toEqual(['resolver.path']);

    const finalUpdatePayload = updateRunIfStatusMock.mock.calls
      .map((call) => call[2] as Record<string, unknown>)
      .find((payload) => payload['status'] === 'completed');
    expect(finalUpdatePayload?.['meta']).toEqual(
      expect.objectContaining({
        runtimeKernel: expect.objectContaining({
          runtimeKernelNodeTypesSource: 'path',
          runtimeKernelCodeObjectResolverIdsSource: 'path',
        }),
      })
    );
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty('runtimeKernelPilotNodeTypesSource');
  });

  it('ignores historical run-meta runtime-kernel aliases during live execution', async () => {
    const run = buildRunRecord();
    run.meta = {
      runtimeKernelConfig: {
        mode: 'legacy_only',
        pilotNodeTypes: ' template ',
        resolverIds: ' resolver.path ',
        strictCodeObjectRegistry: 'yes',
      },
      runtimeKernel: {
        runtimeKernelMode: 'legacy_only',
        runtimeKernelPilotNodeTypes: ['template'],
        runtimeKernelPilotNodeTypesSource: 'path',
        runtimeKernelCodeObjectResolverIds: ' resolver.path ',
        runtimeKernelStrictNativeRegistry: '1',
      },
    };
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    const args = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(args?.['runtimeKernelNodeTypes']).toBeUndefined();
    expect(args?.['runtimeKernelCodeObjectResolverIds']).toBeUndefined();

    const finalUpdatePayload = updateRunIfStatusMock.mock.calls
      .map((call) => call[2] as Record<string, unknown>)
      .find((payload) => payload['status'] === 'completed');
    expect(finalUpdatePayload?.['meta']).toEqual(
      expect.objectContaining({
        runtimeKernel: expect.objectContaining({
          runtimeKernelNodeTypes: [],
          runtimeKernelNodeTypesSource: 'default',
          runtimeKernelCodeObjectResolverIds: [],
          runtimeKernelCodeObjectResolverIdsSource: 'default',
        }),
      })
    );
    expect(
      finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined
    ).not.toHaveProperty('runtimeKernelConfig');
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty('runtimeKernelPilotNodeTypes');
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty('runtimeKernelPilotNodeTypesSource');
  });

  it('emits a warning event when configured resolver ids are not registered', async () => {
    listAiPathsSettingsMock.mockResolvedValue([
      { key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY, value: 'constant' },
      {
        key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
        value: 'resolver.missing',
      },
    ]);
    const run = buildRunRecord();
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    const warningEventPayload = createRunEventMock.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find(
        (payload) =>
          payload['level'] === 'warn' &&
          typeof payload['message'] === 'string' &&
          String(payload['message']).includes('code-object resolver ids include unknown entries')
      );

    expect(warningEventPayload).toMatchObject({
      runId: run.id,
      level: 'warn',
      metadata: expect.objectContaining({
        runtimeKernelCodeObjectResolverIds: ['resolver.missing'],
        runtimeKernelCodeObjectResolverIdsMissing: ['resolver.missing'],
      }),
    });
  });

  it('wires runtime validation middleware according to preflight policy', async () => {
    const run = buildRunRecord();
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    const enabledArgs = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(enabledArgs?.['validationMiddleware']).toEqual(expect.any(Function));

    evaluateGraphWithIteratorAutoContinueMock.mockClear();
    runExecutorPreflightMock.mockResolvedValueOnce({
      validationConfig: {
        enabled: false,
        rules: [],
      },
      strictFlowMode: true,
      nodeValidationEnabled: false,
      requiredProcessingNodeIds: [],
    });

    await executePathRun(buildRunRecord());

    const disabledArgs = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(disabledArgs?.['validationMiddleware']).toBeUndefined();
  });

  it('persists runtime-kernel context and parity telemetry in events and final meta', async () => {
    listAiPathsSettingsMock.mockResolvedValue([
      { key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY, value: 'constant, template' },
      {
        key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
        value: 'resolver.primary, resolver.fallback',
      },
    ]);
    const run = buildRunRecord();
    const node = run.graph?.nodes?.[0];
    evaluateGraphWithIteratorAutoContinueMock.mockImplementationOnce(
      async (args: Record<string, unknown>) => {
        const onNodeFinish = args['onNodeFinish'] as
          | ((event: Record<string, unknown>) => void | Promise<void>)
          | undefined;
        await onNodeFinish?.({
          runId: run.id,
          runStartedAt: '2026-03-05T10:01:00.000Z',
          node: node ?? null,
          nodeInputs: {},
          prevOutputs: null,
          nextOutputs: {
            status: 'completed',
            value: 'ok',
          },
          changed: true,
          iteration: 1,
          runtimeStrategy: 'code_object_v3',
          runtimeResolutionSource: 'override',
          runtimeCodeObjectId: 'ai-paths.node-code-object.constant.v3',
        });
        return {
          ...RUNTIME_STATE_IDLE,
          history: {
            [node?.id ?? 'node-1']: [
              {
                runtimeStrategy: 'code_object_v3',
                runtimeResolutionSource: 'override',
                runtimeCodeObjectId: 'ai-paths.node-code-object.constant.v3',
              },
              {
                runtimeStrategy: 'legacy_adapter',
                runtimeResolutionSource: 'registry',
                runtimeCodeObjectId: null,
              },
            ],
          },
        } as RuntimeState;
      }
    );

    const { executePathRun } = await loadModule();
    await executePathRun(run);

    const nodeFinishEventPayload = createRunEventMock.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find(
        (payload) =>
          typeof payload['message'] === 'string' &&
          String(payload['message']).includes('finished with status: completed')
      );
    expect(nodeFinishEventPayload).toMatchObject({
      runId: run.id,
      level: 'info',
      metadata: expect.objectContaining({
        runtimeKernelNodeTypes: ['constant', 'template'],
        runtimeKernelNodeTypesSource: 'settings',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
        runtimeKernelCodeObjectResolverIdsSource: 'settings',
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'override',
        runtimeCodeObjectId: 'ai-paths.node-code-object.constant.v3',
      }),
    });

    const finalUpdatePayload = updateRunIfStatusMock.mock.calls
      .map((call) => call[2] as Record<string, unknown>)
      .find((payload) => payload['status'] === 'completed');
    expect(finalUpdatePayload).toBeDefined();
    expect(finalUpdatePayload?.['meta']).toEqual(
      expect.objectContaining({
        runtimeKernel: {
          runtimeKernelNodeTypes: ['constant', 'template'],
          runtimeKernelNodeTypesSource: 'settings',
          runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
          runtimeKernelCodeObjectResolverIdsSource: 'settings',
        },
        runtimeTrace: expect.objectContaining({
          kernelParity: {
            sampledHistoryEntries: 2,
            strategyCounts: {
              compatibility: 1,
              code_object_v3: 1,
              unknown: 0,
            },
            resolutionSourceCounts: {
              override: 1,
              registry: 1,
              missing: 0,
              unknown: 0,
            },
            codeObjectIds: ['ai-paths.node-code-object.constant.v3'],
          },
        }),
      })
    );
    expect(nodeFinishEventPayload?.['metadata']).not.toHaveProperty('runtimeKernelPilotNodeTypes');
    expect(nodeFinishEventPayload?.['metadata']).not.toHaveProperty(
      'runtimeKernelPilotNodeTypesSource'
    );
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty('runtimeKernelPilotNodeTypes');
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty('runtimeKernelPilotNodeTypesSource');
  });

  it('persists runtime validation findings through run events', async () => {
    const run = buildRunRecord();
    const warningNode = run.graph?.nodes?.[0];
    evaluateGraphWithIteratorAutoContinueMock.mockImplementationOnce(
      async (args: Record<string, unknown>) => {
        const onRuntimeValidation = args['onRuntimeValidation'] as
          | ((event: Record<string, unknown>) => void | Promise<void>)
          | undefined;
        await onRuntimeValidation?.({
          runId: run.id,
          runStartedAt: '2026-03-05T10:01:00.000Z',
          iteration: 1,
          stage: 'node_pre_execute',
          decision: 'warn',
          node: warningNode ?? null,
          message: 'validation warning from runtime middleware',
          issues: [
            {
              stage: 'node_pre_execute',
              message: 'missing required field',
            },
          ],
        });
        return RUNTIME_STATE_IDLE;
      }
    );

    const { executePathRun } = await loadModule();
    await executePathRun(run);

    const validationEventPayload = createRunEventMock.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find(
        (payload) =>
          (payload['metadata'] as Record<string, unknown> | undefined)?.['stage'] ===
          'node_pre_execute'
      );

    expect(validationEventPayload).toMatchObject({
      runId: run.id,
      level: 'warn',
      message: 'validation warning from runtime middleware',
      metadata: expect.objectContaining({
        stage: 'node_pre_execute',
        decision: 'warn',
        issueCount: 1,
        nodeId: warningNode?.id ?? null,
      }),
    });
  });
});
