import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunRecord, RuntimeState } from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
  createDefaultPathConfig,
} from '@/shared/lib/ai-paths';
import {
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_ENV,
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_ENV,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';

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

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
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

const getCompletedUpdatePayload = (): Record<string, unknown> | undefined =>
  updateRunIfStatusMock.mock.calls
    .map((call) => call[2] as Record<string, unknown>)
    .find((payload) => payload['status'] === 'completed');

const getRecordField = (
  value: Record<string, unknown> | null | undefined,
  key: string
): Record<string, unknown> | undefined => {
  const field = value?.[key];
  return field && typeof field === 'object' && !Array.isArray(field)
    ? (field as Record<string, unknown>)
    : undefined;
};

describe('path-run-executor runtime-kernel settings integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env['AI_PATHS_RUNTIME_KERNEL_NODE_TYPES'];
    delete process.env[DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_ENV];
    delete process.env['AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS'];
    delete process.env[DEPRECATED_AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_ENV];

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
  }, 15_000);

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
  }, 15_000);

  it('ignores deprecated env pilot-node-type aliases in live execution', async () => {
    process.env[DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_ENV] = 'template';
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

    const finalUpdatePayload = getCompletedUpdatePayload();
    const runtimeKernelMeta = getRecordField(
      getRecordField(finalUpdatePayload, 'meta'),
      'runtimeKernel'
    );
    expect(runtimeKernelMeta).toEqual(
      expect.objectContaining({
        runtimeKernelNodeTypes: [],
        runtimeKernelNodeTypesSource: 'default',
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
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: 'auto',
        nodeTypes: ['template'],
        codeObjectResolverIds: ['resolver.path'],
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD]: true,
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

    const finalUpdatePayload = getCompletedUpdatePayload();
    const runtimeKernelMeta = getRecordField(
      getRecordField(finalUpdatePayload, 'meta'),
      'runtimeKernel'
    );
    expect(runtimeKernelMeta).toEqual(
      expect.objectContaining({
        runtimeKernelNodeTypesSource: 'path',
        runtimeKernelCodeObjectResolverIdsSource: 'path',
      })
    );
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty(DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD);
  });

  it('ignores historical run-meta runtime-kernel aliases during live execution', async () => {
    const run = buildRunRecord();
    run.meta = {
      runtimeKernelConfig: {
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ' template ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]: ' resolver.path ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: 'yes',
      },
      runtimeKernel: {
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD]: ['template'],
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD]: 'path',
        runtimeKernelCodeObjectResolverIds: ' resolver.path ',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD]: '1',
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

    const finalUpdatePayload = getCompletedUpdatePayload();
    const runtimeKernelMeta = getRecordField(
      getRecordField(finalUpdatePayload, 'meta'),
      'runtimeKernel'
    );
    expect(runtimeKernelMeta).toEqual(
      expect.objectContaining({
        runtimeKernelNodeTypes: [],
        runtimeKernelNodeTypesSource: 'default',
        runtimeKernelCodeObjectResolverIds: [],
        runtimeKernelCodeObjectResolverIdsSource: 'default',
      })
    );
    expect(finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined).not.toHaveProperty(
      'runtimeKernelConfig'
    );
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty(DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD);
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty(DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD);
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

    const warningMetadata = getRecordField(warningEventPayload, 'metadata');
    expect(warningEventPayload?.['runId']).toBe(run.id);
    expect(warningEventPayload?.['level']).toBe('warn');
    expect(warningMetadata).toEqual(
      expect.objectContaining({
        runtimeKernelCodeObjectResolverIds: ['resolver.missing'],
        runtimeKernelCodeObjectResolverIdsMissing: ['resolver.missing'],
      })
    );
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
          traceId: run.id,
          spanId: `${node?.id ?? 'node-1'}:1:1`,
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
          attempt: 1,
          runtimeStrategy: 'code_object_v3',
          runtimeResolutionSource: 'override',
          runtimeCodeObjectId: 'ai-paths.node-code-object.constant.v3',
        });
        return {
          ...RUNTIME_STATE_IDLE,
          history: {
            [node?.id ?? 'node-1']: [
              {
                timestamp: '2026-03-05T10:01:00.000Z',
                pathId: run.pathId,
                pathName: run.pathName,
                traceId: run.id,
                spanId: `${node?.id ?? 'node-1'}:1:1`,
                runtimeStrategy: 'code_object_v3',
                runtimeResolutionSource: 'override',
                runtimeCodeObjectId: 'ai-paths.node-code-object.constant.v3',
              },
              {
                timestamp: '2026-03-05T10:01:01.000Z',
                pathId: run.pathId,
                pathName: run.pathName,
                traceId: run.id,
                spanId: `${node?.id ?? 'node-1'}:1:2`,
                runtimeStrategy: 'compatibility',
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
    const nodeFinishMetadata = getRecordField(nodeFinishEventPayload, 'metadata');
    expect(nodeFinishEventPayload?.['runId']).toBe(run.id);
    expect(nodeFinishEventPayload?.['level']).toBe('info');
    expect(nodeFinishMetadata).toEqual(
      expect.objectContaining({
        traceId: run.id,
        spanId: `${node?.id ?? 'node-1'}:1:1`,
        runtimeKernelNodeTypes: ['constant', 'template'],
        runtimeKernelNodeTypesSource: 'settings',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
        runtimeKernelCodeObjectResolverIdsSource: 'settings',
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'override',
        runtimeCodeObjectId: 'ai-paths.node-code-object.constant.v3',
      })
    );

    const finalUpdatePayload = getCompletedUpdatePayload();
    expect(finalUpdatePayload).toBeDefined();
    const finalMeta = getRecordField(finalUpdatePayload, 'meta');
    const runtimeKernelMeta = getRecordField(finalMeta, 'runtimeKernel');
    const runtimeTrace = getRecordField(finalMeta, 'runtimeTrace');
    expect(runtimeKernelMeta).toEqual({
      runtimeKernelNodeTypes: ['constant', 'template'],
      runtimeKernelNodeTypesSource: 'settings',
      runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      runtimeKernelCodeObjectResolverIdsSource: 'settings',
    });
    expect(runtimeTrace?.['version']).toBe('ai-paths.trace.v1');
    expect(runtimeTrace?.['traceId']).toBe(run.id);
    expect(runtimeTrace?.['runId']).toBe(run.id);
    expect(runtimeTrace?.['source']).toBe('server');
    expect(typeof runtimeTrace?.['finishedAt']).toBe('string');
    expect(runtimeTrace?.['spans']).toEqual([
      expect.objectContaining({
        spanId: `${node?.id ?? 'node-1'}:1:1`,
        runId: run.id,
        traceId: run.id,
        nodeId: node?.id ?? 'node-1',
        nodeType: node?.type ?? 'trigger',
        iteration: 1,
        attempt: 1,
        status: 'completed',
      }),
    ]);
    expect(getRecordField(runtimeTrace, 'kernelParity')).toEqual({
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
    });
    expect(nodeFinishEventPayload?.['metadata']).not.toHaveProperty(
      DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD
    );
    expect(nodeFinishEventPayload?.['metadata']).not.toHaveProperty(
      DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD
    );
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty(DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD);
    expect(
      (finalUpdatePayload?.['meta'] as Record<string, unknown> | undefined)?.['runtimeKernel']
    ).not.toHaveProperty(DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD);
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

    const validationMetadata = getRecordField(validationEventPayload, 'metadata');
    expect(validationEventPayload?.['runId']).toBe(run.id);
    expect(validationEventPayload?.['level']).toBe('warn');
    expect(validationEventPayload?.['message']).toBe(
      'validation warning from runtime middleware'
    );
    expect(validationMetadata).toEqual(
      expect.objectContaining({
        stage: 'node_pre_execute',
        decision: 'warn',
        issueCount: 1,
        nodeId: warningNode?.id ?? null,
      })
    );
  });
});
