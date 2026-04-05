import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AI_PATHS_VALIDATION_CONFIG, type AiNode, type Edge, type PathConfig, type PathMeta, type RuntimeState } from '@/shared/lib/ai-paths';

import { useAiPathsSettingsCleanupActions } from '../useAiPathsSettingsCleanupActions';

type CleanupActionsInput = Parameters<typeof useAiPathsSettingsCleanupActions>[0];

type ConfirmPayload = {
  title: string;
  message: string;
  confirmText: string;
  isDangerous: boolean;
  onConfirm: () => void | Promise<void>;
};

const setEdgesGraphMock = vi.fn();
const setPathConfigsGraphMock = vi.fn();
const setRuntimeStateMock = vi.fn();
const logClientErrorMock = vi.fn();
const graphActionsMock = {
  setEdges: setEdgesGraphMock,
  setPathConfigs: setPathConfigsGraphMock,
};

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => graphActionsMock,
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => ({
    setRuntimeState: setRuntimeStateMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

const baseNodes: AiNode[] = [
  {
    id: 'node-1',
    type: 'trigger',
    data: {},
    position: { x: 0, y: 0 },
  } as AiNode,
  {
    id: 'node-2',
    type: 'parser',
    data: {},
    position: { x: 1, y: 1 },
  } as AiNode,
];

const baseEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
  } as Edge,
];

const basePaths: PathMeta[] = [
  {
    id: 'path-1',
    name: 'Path One',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
  },
];

const buildRuntimeState = (overrides: Partial<RuntimeState> = {}): RuntimeState =>
  ({
    status: 'running',
    nodeStatuses: { 'node-1': 'completed' },
    nodeOutputs: { 'node-1': { ok: true } },
    variables: { token: 'abc' },
    events: [{ id: 'event-1' }],
    currentRun: { id: 'run-1' },
    inputs: { 'node-2': { from: 'node-1' } },
    outputs: { 'node-1': { status: 'completed', result: 1 } },
    ...overrides,
  }) as RuntimeState;

const buildInput = (overrides: Partial<CleanupActionsInput> = {}): CleanupActionsInput => ({
  activePathId: 'path-1',
  isPathLocked: false,
  toast: vi.fn(),
  confirm: vi.fn(),
  runtimeState: buildRuntimeState(),
  resetRuntimeDiagnostics: vi.fn(),
  edges: baseEdges,
  nodes: baseNodes,
  pathName: 'Path One',
  pathDescription: 'Primary path',
  activeTrigger: 'manual-trigger',
  executionMode: 'server',
  flowIntensity: 'medium',
  runMode: 'manual',
  strictFlowMode: true,
  blockedRunPolicy: 'fail_run',
  aiPathsValidation: DEFAULT_AI_PATHS_VALIDATION_CONFIG,
  isPathActive: true,
  parserSamples: {},
  updaterSamples: {},
  lastRunAt: '2026-03-19T09:00:00.000Z',
  selectedNodeId: 'node-1',
  configOpen: true,
  pathConfigs: {
    'path-1': {
      id: 'path-1',
      runCount: 2.7,
    } as PathConfig,
  },
  paths: basePaths,
  persistPathSettings: vi.fn().mockResolvedValue(undefined),
  reportAiPathsError: vi.fn(),
  pruneRuntimeInputs: vi.fn((state: RuntimeState) => state),
  ...overrides,
});

describe('useAiPathsSettingsCleanupActions', () => {
  beforeEach(() => {
    setEdgesGraphMock.mockReset();
    setPathConfigsGraphMock.mockReset();
    setRuntimeStateMock.mockReset();
    logClientErrorMock.mockReset();
  });

  it('returns early when there is no active path', async () => {
    const input = buildInput({ activePathId: null });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearWires();
      await result.current.handleClearConnectorData();
      await result.current.handleClearHistory();
      await result.current.handleClearNodeHistory('node-1');
    });

    expect(input.confirm).not.toHaveBeenCalled();
    expect(input.toast).not.toHaveBeenCalled();
    expect(setEdgesGraphMock).not.toHaveBeenCalled();
    expect(setPathConfigsGraphMock).not.toHaveBeenCalled();
    expect(setRuntimeStateMock).not.toHaveBeenCalled();
  });

  it('shows lock toasts for every cleanup action when the path is locked', async () => {
    const input = buildInput({ isPathLocked: true });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearWires();
      await result.current.handleClearConnectorData();
      await result.current.handleClearHistory();
      await result.current.handleClearNodeHistory('node-1');
    });

    expect(input.confirm).not.toHaveBeenCalled();
    expect(input.toast).toHaveBeenNthCalledWith(
      1,
      'This path is locked. Unlock it to edit nodes or connections.',
      { variant: 'info' }
    );
    expect(input.toast).toHaveBeenNthCalledWith(
      2,
      'This path is locked. Unlock it to edit nodes or connections.',
      { variant: 'info' }
    );
    expect(input.toast).toHaveBeenNthCalledWith(
      3,
      'This path is locked. Unlock it to clear history.',
      { variant: 'info' }
    );
    expect(input.toast).toHaveBeenNthCalledWith(
      4,
      'This path is locked. Unlock it to clear history.',
      { variant: 'info' }
    );
  });

  it('clears wires, prunes runtime inputs, and persists the updated config', async () => {
    const prunedRuntimeState = buildRuntimeState({
      inputs: { 'node-2': { from: 'pruned' } },
    });
    const input = buildInput({
      pruneRuntimeInputs: vi.fn(() => prunedRuntimeState),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearWires();
    });

    expect(input.confirm).toHaveBeenCalledTimes(1);
    const confirmConfig = (input.confirm as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ConfirmPayload;
    expect(confirmConfig.title).toBe('Clear All Wires?');
    expect(confirmConfig.confirmText).toBe('Clear Wires');
    expect(confirmConfig.isDangerous).toBe(true);

    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(input.pruneRuntimeInputs).toHaveBeenCalledWith(input.runtimeState, baseEdges, []);
    expect(setRuntimeStateMock).toHaveBeenCalledWith(prunedRuntimeState);
    expect(setEdgesGraphMock).toHaveBeenCalledWith([]);

    const nextConfigs = setPathConfigsGraphMock.mock.calls[0]?.[0] as Record<string, PathConfig>;
    expect(nextConfigs['path-1']).toMatchObject({
      id: 'path-1',
      trigger: 'manual-trigger',
      edges: [],
      runtimeState: prunedRuntimeState,
      runCount: 2,
      blockedRunPolicy: 'fail_run',
      uiState: {
        selectedNodeId: 'node-1',
        configOpen: true,
      },
    });
    expect(input.persistPathSettings).toHaveBeenCalledWith(basePaths, 'path-1', nextConfigs['path-1']);
    expect(input.toast).toHaveBeenCalledWith('Wires cleared.', { variant: 'success' });
  });

  it('reports wire-clearing persistence failures and skips runtime updates when pruning is unchanged', async () => {
    const failure = new Error('wire save failed');
    const input = buildInput({
      persistPathSettings: vi.fn().mockRejectedValue(failure),
      pruneRuntimeInputs: vi.fn((state: RuntimeState) => state),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearWires();
    });

    const confirmConfig = (input.confirm as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ConfirmPayload;
    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(setRuntimeStateMock).not.toHaveBeenCalled();
    expect(setEdgesGraphMock).toHaveBeenCalledWith([]);
    expect(logClientErrorMock).toHaveBeenCalledWith(failure);
    expect(input.reportAiPathsError).toHaveBeenCalledWith(
      failure,
      { action: 'clearWires' },
      'Failed to clear wires:'
    );
    expect(input.toast).toHaveBeenCalledWith('Failed to clear wires.', { variant: 'error' });
  });

  it('clears connector data, resets diagnostics, and persists an empty runtime state', async () => {
    const input = buildInput({
      pathConfigs: {
        'path-1': {
          id: 'path-1',
          runCount: Number.NaN,
        } as PathConfig,
      },
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearConnectorData();
    });

    const confirmConfig = (input.confirm as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ConfirmPayload;
    expect(confirmConfig.title).toBe('Clear Connector Data?');

    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(input.resetRuntimeDiagnostics).toHaveBeenCalledTimes(1);
    expect(setRuntimeStateMock).toHaveBeenCalledWith({
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
    });

    const nextConfigs = setPathConfigsGraphMock.mock.calls[0]?.[0] as Record<string, PathConfig>;
    expect(nextConfigs['path-1']).toMatchObject({
      runtimeState: {
        status: 'idle',
        nodeStatuses: {},
        nodeOutputs: {},
        variables: {},
        events: [],
        currentRun: null,
        inputs: {},
        outputs: {},
      },
      runCount: 0,
      blockedRunPolicy: 'fail_run',
    });
    expect(input.persistPathSettings).toHaveBeenCalledWith(basePaths, 'path-1', nextConfigs['path-1']);
    expect(input.toast).toHaveBeenCalledWith('Connector data cleared for current path.', {
      variant: 'success',
    });
  });

  it('reports connector-data persistence failures', async () => {
    const failure = new Error('connector cleanup failed');
    const input = buildInput({
      persistPathSettings: vi.fn().mockRejectedValue(failure),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearConnectorData();
    });

    const confirmConfig = (input.confirm as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ConfirmPayload;
    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(failure);
    expect(input.reportAiPathsError).toHaveBeenCalledWith(
      failure,
      { action: 'clearConnectorData', pathId: 'path-1' },
      'Failed to clear connector data:'
    );
    expect(input.toast).toHaveBeenCalledWith('Failed to clear connector data.', {
      variant: 'error',
    });
  });

  it('shows an info toast instead of clearing history when no history exists', async () => {
    const input = buildInput({
      runtimeState: buildRuntimeState({ history: {} }),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearHistory();
    });

    expect(input.confirm).not.toHaveBeenCalled();
    expect(input.toast).toHaveBeenCalledWith('No history recorded for this path yet.', {
      variant: 'info',
    });
  });

  it('clears execution history and strips status ports from runtime outputs', async () => {
    const input = buildInput({
      runtimeState: buildRuntimeState({
        history: {
          'node-1': [{ id: 'h-1' }],
        },
        outputs: {
          'node-1': { status: 'completed', result: 1 },
          'node-2': ['keep-array'],
          'node-3': null,
        } as RuntimeState['outputs'],
      }),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearHistory();
    });

    const confirmConfig = (input.confirm as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ConfirmPayload;
    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(input.resetRuntimeDiagnostics).toHaveBeenCalledTimes(1);
    const nextRuntimeState = setRuntimeStateMock.mock.calls[0]?.[0] as RuntimeState;
    expect(nextRuntimeState).toMatchObject({
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      events: [],
      outputs: {
        'node-1': { result: 1 },
      },
    });
    expect('history' in nextRuntimeState).toBe(false);
    const persistedConfig = (input.persistPathSettings as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as PathConfig;
    expect(persistedConfig.runtimeState).toMatchObject({
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      events: [],
      outputs: {
        'node-1': { result: 1 },
      },
    });
    expect('history' in (persistedConfig.runtimeState as RuntimeState)).toBe(false);
    expect(input.toast).toHaveBeenCalledWith('History cleared for the current path.', {
      variant: 'success',
    });
  });

  it('reports history-clearing persistence failures', async () => {
    const failure = new Error('history cleanup failed');
    const input = buildInput({
      runtimeState: buildRuntimeState({ history: { 'node-1': [{ id: 'h-1' }] } }),
      persistPathSettings: vi.fn().mockRejectedValue(failure),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearHistory();
    });

    const confirmConfig = (input.confirm as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ConfirmPayload;
    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(failure);
    expect(input.reportAiPathsError).toHaveBeenCalledWith(
      failure,
      { action: 'clearHistory', pathId: 'path-1' },
      'Failed to clear history:'
    );
    expect(input.toast).toHaveBeenCalledWith('Failed to clear history.', { variant: 'error' });
  });

  it('shows an info toast when the selected node has no history', async () => {
    const input = buildInput({
      runtimeState: buildRuntimeState({ history: { 'node-2': [{ id: 'h-2' }] } }),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearNodeHistory('node-1');
    });

    expect(input.toast).toHaveBeenCalledWith('No history recorded for this node yet.', {
      variant: 'info',
    });
    expect(input.persistPathSettings).not.toHaveBeenCalled();
  });

  it('clears one node history entry while keeping other node histories intact', async () => {
    const input = buildInput({
      runtimeState: buildRuntimeState({
        history: {
          'node-1': [{ id: 'h-1' }],
          'node-2': [{ id: 'h-2' }],
        },
      }),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearNodeHistory('node-1');
    });

    expect(setRuntimeStateMock).toHaveBeenCalledWith({
      ...input.runtimeState,
      history: {
        'node-2': [{ id: 'h-2' }],
      },
    });
    const persistedConfig = (input.persistPathSettings as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as PathConfig;
    expect((persistedConfig.runtimeState as RuntimeState).history).toEqual({
      'node-2': [{ id: 'h-2' }],
    });
    expect(input.toast).toHaveBeenCalledWith('Node history cleared.', { variant: 'success' });
  });

  it('reports node-history persistence failures and removes empty history containers', async () => {
    const failure = new Error('node history cleanup failed');
    const input = buildInput({
      runtimeState: buildRuntimeState({ history: { 'node-1': [{ id: 'h-1' }] } }),
      persistPathSettings: vi.fn().mockRejectedValue(failure),
    });
    const { result } = renderHook(() => useAiPathsSettingsCleanupActions(input));

    await act(async () => {
      await result.current.handleClearNodeHistory('node-1');
    });

    const nextRuntimeState = setRuntimeStateMock.mock.calls[0]?.[0] as RuntimeState;
    expect('history' in nextRuntimeState).toBe(false);
    expect(logClientErrorMock).toHaveBeenCalledWith(failure);
    expect(input.reportAiPathsError).toHaveBeenCalledWith(
      failure,
      { action: 'clearNodeHistory', pathId: 'path-1', nodeId: 'node-1' },
      'Failed to clear node history:'
    );
    expect(input.toast).toHaveBeenCalledWith('Failed to clear node history.', {
      variant: 'error',
    });
  });
});
