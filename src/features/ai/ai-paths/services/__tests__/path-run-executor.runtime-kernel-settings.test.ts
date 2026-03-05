import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunRecord, RuntimeState } from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
  AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
  createDefaultPathConfig,
} from '@/shared/lib/ai-paths';

const {
  evaluateGraphWithIteratorAutoContinueMock,
  listAiPathsSettingsMock,
  getPathRunRepositoryMock,
  runExecutorPreflightMock,
  createCancellationMonitorMock,
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

vi.mock('@/features/ai/ai-paths/server', () => ({
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
    delete process.env['AI_PATHS_RUNTIME_KERNEL_MODE'];
    delete process.env['AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES'];

    evaluateGraphWithIteratorAutoContinueMock.mockResolvedValue(RUNTIME_STATE_IDLE);
    listAiPathsSettingsMock.mockResolvedValue([]);
    runExecutorPreflightMock.mockResolvedValue({
      strictFlowMode: true,
      nodeValidationEnabled: true,
      requiredProcessingNodeIds: [],
    });
    createCancellationMonitorMock.mockReturnValue({
      start: vi.fn().mockResolvedValue(false),
      stop: vi.fn(),
    });
    getPathRunRepositoryMock.mockResolvedValue({
      updateRunIfStatus: vi.fn().mockResolvedValue(true),
      listRunNodes: vi.fn().mockResolvedValue([]),
      upsertRunNode: vi.fn().mockResolvedValue(undefined),
      createRunEvent: vi.fn().mockResolvedValue(undefined),
    });
    recordRuntimeRunFinishedMock.mockResolvedValue(undefined);
    recordRuntimeNodeStatusMock.mockResolvedValue(undefined);
  });

  it('passes persisted mode and pilot node types to runtime evaluation', async () => {
    listAiPathsSettingsMock.mockResolvedValue([
      { key: AI_PATHS_RUNTIME_KERNEL_MODE_KEY, value: 'auto' },
      { key: AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY, value: 'constant, math' },
    ]);
    const run = buildRunRecord();
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    const args = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(args?.['runtimeKernelMode']).toBe('auto');
    expect(args?.['runtimeKernelPilotNodeTypes']).toEqual(['constant', 'math']);
  });

  it('applies env kill switch over persisted runtime-kernel settings', async () => {
    process.env['AI_PATHS_RUNTIME_KERNEL_MODE'] = 'legacy_only';
    process.env['AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES'] = 'template';
    listAiPathsSettingsMock.mockResolvedValue([
      { key: AI_PATHS_RUNTIME_KERNEL_MODE_KEY, value: 'auto' },
      { key: AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY, value: 'constant, math' },
    ]);
    const run = buildRunRecord();
    const { executePathRun } = await loadModule();

    await executePathRun(run);

    expect(evaluateGraphWithIteratorAutoContinueMock).toHaveBeenCalledTimes(1);
    const args = evaluateGraphWithIteratorAutoContinueMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(args?.['runtimeKernelMode']).toBe('legacy_only');
    expect(args?.['runtimeKernelPilotNodeTypes']).toBeUndefined();
  });
});

