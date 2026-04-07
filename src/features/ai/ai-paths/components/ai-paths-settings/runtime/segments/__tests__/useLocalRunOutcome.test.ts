import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  graphActions: {
    setPathConfigs: vi.fn(),
  },
  runtimeActions: {
    setPathDebugSnapshots: vi.fn(),
  },
  appendLocalRun: vi.fn(),
  updateAiPathsSetting: vi.fn(),
  logClientError: vi.fn(), logClientCatch: vi.fn(),
  buildActivePathConfig: vi.fn(),
  buildDebugSnapshot: vi.fn(),
  safeJsonStringify: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => mockState.graphActions,
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => mockState.runtimeActions,
}));

vi.mock('@/shared/lib/ai-paths/local-runs', () => ({
  appendLocalRun: (...args: unknown[]) => mockState.appendLocalRun(...args),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  PATH_DEBUG_PREFIX: 'path-debug:',
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSetting: (...args: unknown[]) => mockState.updateAiPathsSetting(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: (...args: unknown[]) => mockState.logClientCatch(...args),
}));

vi.mock('../../utils', () => ({
  buildActivePathConfig: (...args: unknown[]) => mockState.buildActivePathConfig(...args),
  buildDebugSnapshot: (...args: unknown[]) => mockState.buildDebugSnapshot(...args),
  safeJsonStringify: (...args: unknown[]) => mockState.safeJsonStringify(...args),
}));

import { useLocalRunOutcome } from '../useLocalRunOutcome';

const createArgs = (overrides: Record<string, unknown> = {}) =>
  ({
    activePathId: 'path-1',
    activeTab: 'canvas',
    activeTrigger: 'Product Modal - Context Filter',
    executionMode: 'server',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: { enabled: true },
    historyRetentionPasses: 1,
    isPathActive: true,
    edges: [{ id: 'edge-1' }],
    normalizedNodes: [{ id: 'node-1' }, { id: 'node-2' }],
    sanitizedEdges: [{ id: 'edge-1' }],
    pathName: 'Primary Path',
    pathDescription: 'Main path',
    parserSamples: {},
    updaterSamples: {},
    sessionUser: null,
    runtimeStateRef: { current: {} },
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
    setRuntimeState: vi.fn(),
    setLastRunAt: vi.fn(),
    settleTransientNodeStatuses: vi.fn(),
    resetRuntimeNodeStatuses: vi.fn(),
    normalizeNodeStatus: vi.fn(),
    formatStatusLabel: vi.fn(),
    hasPendingIteratorAdvance: vi.fn(),
    fetchEntityByType: vi.fn(),
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    stopServerRunStream: vi.fn(),
    runServerStream: vi.fn(),
    ...overrides,
  }) as never;

describe('useLocalRunOutcome', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T17:00:00.000Z'));

    mockState.graphActions.setPathConfigs.mockReset();
    mockState.runtimeActions.setPathDebugSnapshots.mockReset();
    mockState.appendLocalRun.mockReset().mockResolvedValue(undefined);
    mockState.updateAiPathsSetting.mockReset().mockResolvedValue(undefined);
    mockState.logClientCatch.mockReset();
    mockState.buildActivePathConfig.mockReset().mockImplementation((args: Record<string, unknown>) => ({
      id: args.activePathId,
      built: true,
      runCount: args.runCount,
      lastRunAt: args.lastRunAt,
      runtimeState: args.runtimeState,
    }));
    mockState.buildDebugSnapshot.mockReset().mockImplementation((args: Record<string, unknown>) => ({
      pathId: args.pathId,
      runAt: args.runAt,
      state: args.state,
      entries: [],
    }));
    mockState.safeJsonStringify.mockReset().mockImplementation((value: unknown) => JSON.stringify(value));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists debug snapshots and updates runtime debug state', async () => {
    const args = createArgs();
    const state = { nodeDurations: { 'node-1': 12 } };
    const { result } = renderHook(() => useLocalRunOutcome(args));

    await act(async () => {
      await result.current.persistDebugSnapshot('path-1', '2026-03-19T16:59:00.000Z', state as never);
    });

    expect(mockState.buildDebugSnapshot).toHaveBeenCalledWith({
      pathId: 'path-1',
      runAt: '2026-03-19T16:59:00.000Z',
      state,
      nodes: args.normalizedNodes,
    });
    expect(mockState.safeJsonStringify).toHaveBeenCalledWith({
      pathId: 'path-1',
      runAt: '2026-03-19T16:59:00.000Z',
      state,
      entries: [],
    });
    expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
      'path-debug:path-1',
      JSON.stringify({
        pathId: 'path-1',
        runAt: '2026-03-19T16:59:00.000Z',
        state,
        entries: [],
      })
    );

    const updater = mockState.runtimeActions.setPathDebugSnapshots.mock.calls[0]?.[0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>;
    expect(updater({ existing: { id: 'keep' } })).toEqual({
      existing: { id: 'keep' },
      'path-1': {
        pathId: 'path-1',
        runAt: '2026-03-19T16:59:00.000Z',
        state,
        entries: [],
      },
    });
  });

  it('skips unusable snapshot inputs and logs persistence failures', async () => {
    const args = createArgs();
    const failure = new Error('snapshot store failed');
    const { result } = renderHook(() => useLocalRunOutcome(args));

    await act(async () => {
      await result.current.persistDebugSnapshot(null, '2026-03-19T16:59:00.000Z', {} as never);
    });
    expect(mockState.buildDebugSnapshot).not.toHaveBeenCalled();

    mockState.buildDebugSnapshot.mockReturnValueOnce(null);
    await act(async () => {
      await result.current.persistDebugSnapshot('path-1', '2026-03-19T16:59:00.000Z', {} as never);
    });
    expect(mockState.safeJsonStringify).not.toHaveBeenCalled();

    mockState.buildDebugSnapshot.mockReturnValueOnce({ pathId: 'path-1' });
    mockState.safeJsonStringify.mockReturnValueOnce('');
    await act(async () => {
      await result.current.persistDebugSnapshot('path-1', '2026-03-19T16:59:00.000Z', {} as never);
    });
    expect(mockState.updateAiPathsSetting).not.toHaveBeenCalled();

    mockState.buildDebugSnapshot.mockReturnValueOnce({ pathId: 'path-1', entries: [] });
    mockState.safeJsonStringify.mockReturnValueOnce('{"pathId":"path-1"}');
    mockState.updateAiPathsSetting.mockRejectedValueOnce(failure);
    await act(async () => {
      await result.current.persistDebugSnapshot('path-1', '2026-03-19T16:59:00.000Z', {} as never);
    });

    expect(mockState.logClientCatch).toHaveBeenCalledWith(failure, {
      source: 'useAiPathsLocalExecution',
      action: 'persistDebugSnapshot',
      pathId: 'path-1',
    });
  });

  it('finalizes completed runs, persists debug state, and increments existing run counts', async () => {
    const args = createArgs();
    const state = { nodeDurations: { 'node-1': 7 } };
    const meta = {
      startedAt: '2026-03-19T16:59:57.500Z',
      startedAtMs: Date.parse('2026-03-19T16:59:57.500Z'),
      triggerEvent: 'manual.fire',
      triggerContext: { entityId: 'prod-1', entityType: 'product' },
    };
    const { result } = renderHook(() => useLocalRunOutcome(args));

    await act(async () => {
      result.current.finalizeLocalRunOutcome(
        { status: 'completed', state: state as never },
        meta
      );
      await Promise.resolve();
    });

    expect(args.settleTransientNodeStatuses).toHaveBeenCalledWith('completed');
    expect(args.appendRuntimeEvent).toHaveBeenCalledWith({
      source: 'local',
      kind: 'run_completed',
      level: 'info',
      timestamp: '2026-03-19T17:00:00.000Z',
      message: 'Run completed.',
    });
    expect(args.setLastRunAt).toHaveBeenCalledWith('2026-03-19T17:00:00.000Z');
    expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
      'path-debug:path-1',
      JSON.stringify({
        pathId: 'path-1',
        runAt: '2026-03-19T17:00:00.000Z',
        state,
        entries: [],
      })
    );

    const updater = mockState.graphActions.setPathConfigs.mock.calls[0]?.[0] as (
      prev: Record<string, Record<string, unknown>>
    ) => Record<string, Record<string, unknown>>;
    expect(
      updater({
        'path-1': {
          keep: true,
          runCount: 2,
        },
      })
    ).toEqual({
      'path-1': {
        keep: true,
        runtimeState: state,
        lastRunAt: '2026-03-19T17:00:00.000Z',
        runCount: 3,
      },
    });
    expect(mockState.buildActivePathConfig).not.toHaveBeenCalled();
    expect(mockState.appendLocalRun).toHaveBeenCalledWith({
      pathId: 'path-1',
      pathName: 'Primary Path',
      triggerEvent: 'manual.fire',
      triggerLabel: 'Product Modal - Context Filter',
      entityId: 'prod-1',
      entityType: 'product',
      status: 'success',
      startedAt: '2026-03-19T16:59:57.500Z',
      finishedAt: '2026-03-19T17:00:00.000Z',
      durationMs: 2500,
      nodeCount: 2,
      nodeDurations: { 'node-1': 7 },
      source: 'ai_paths_ui',
    });
  });

  it('finalizes error runs with fallback config creation and logged error payload', () => {
    const args = createArgs({ activePathId: 'path-2' });
    const state = { nodeDurations: { 'node-2': 5 } };
    const meta = {
      startedAt: '2026-03-19T16:59:55.000Z',
      startedAtMs: Date.parse('2026-03-19T16:59:55.000Z'),
      triggerEvent: 'manual.error',
      triggerContext: null,
    };
    const error = new Error('Runner exploded');
    const { result } = renderHook(() => useLocalRunOutcome(args));

    act(() => {
      result.current.finalizeLocalRunOutcome({ status: 'error', error, state: state as never }, meta);
    });

    expect(args.settleTransientNodeStatuses).toHaveBeenCalledWith('failed');
    expect(args.appendRuntimeEvent).toHaveBeenCalledWith({
      source: 'local',
      kind: 'run_failed',
      level: 'error',
      timestamp: '2026-03-19T17:00:00.000Z',
      message: 'Run failed: Runner exploded',
    });
    expect(args.setLastRunAt).toHaveBeenCalledWith('2026-03-19T17:00:00.000Z');

    const updater = mockState.graphActions.setPathConfigs.mock.calls[0]?.[0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>;
    expect(updater({})).toEqual({
      'path-2': {
        id: 'path-2',
        built: true,
        runCount: 1,
        lastRunAt: '2026-03-19T17:00:00.000Z',
        runtimeState: state,
      },
    });
    expect(mockState.buildActivePathConfig).toHaveBeenCalledTimes(1);
    expect(mockState.appendLocalRun).toHaveBeenCalledWith({
      pathId: 'path-2',
      pathName: 'Primary Path',
      triggerEvent: 'manual.error',
      triggerLabel: 'Product Modal - Context Filter',
      status: 'error',
      startedAt: '2026-03-19T16:59:55.000Z',
      finishedAt: '2026-03-19T17:00:00.000Z',
      durationMs: 5000,
      nodeCount: 2,
      nodeDurations: { 'node-2': 5 },
      error: 'Runner exploded',
      source: 'ai_paths_ui',
    });
  });

  it('handles canceled and paused outcomes without forcing config updates for missing paths', () => {
    const args = createArgs({ activePathId: null, toast: vi.fn() });
    const state = { nodeDurations: { 'node-1': 3 } };
    const meta = {
      startedAt: '2026-03-19T16:59:58.000Z',
      startedAtMs: Date.parse('2026-03-19T16:59:58.000Z'),
      triggerEvent: 'manual.cancel',
      triggerContext: null,
    };
    const { result } = renderHook(() => useLocalRunOutcome(args));

    act(() => {
      result.current.finalizeLocalRunOutcome({ status: 'paused', state: state as never }, meta);
      result.current.finalizeLocalRunOutcome({ status: 'canceled', state: state as never }, meta);
    });

    expect(args.settleTransientNodeStatuses).toHaveBeenCalledTimes(1);
    expect(args.settleTransientNodeStatuses).toHaveBeenCalledWith('canceled');
    expect(args.appendRuntimeEvent).toHaveBeenCalledWith({
      source: 'local',
      kind: 'run_canceled',
      level: 'info',
      timestamp: '2026-03-19T17:00:00.000Z',
      message: 'Run canceled.',
    });
    expect(args.toast).toHaveBeenCalledWith('Run canceled.', { variant: 'info' });
    expect(args.setLastRunAt).toHaveBeenCalledWith('2026-03-19T17:00:00.000Z');
    expect(mockState.graphActions.setPathConfigs).not.toHaveBeenCalled();
    expect(mockState.appendLocalRun).toHaveBeenCalledWith({
      pathId: null,
      pathName: 'Primary Path',
      triggerEvent: 'manual.cancel',
      triggerLabel: 'Product Modal - Context Filter',
      status: 'error',
      startedAt: '2026-03-19T16:59:58.000Z',
      finishedAt: '2026-03-19T17:00:00.000Z',
      durationMs: 2000,
      nodeCount: 2,
      nodeDurations: { 'node-1': 3 },
      error: 'Run canceled',
      source: 'ai_paths_ui',
    });
  });
});
