import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PathMeta } from '@/shared/lib/ai-paths';
import type { AiPathsSettingsProps } from '../../AiPathsSettings';
import type { UseAiPathsSettingsStateReturn } from '../types';

const mockState = vi.hoisted(() => ({
  routerPush: vi.fn(),
  setRunHistoryNodeId: vi.fn(),
  setRunFilter: vi.fn(),
  openRunDetail: vi.fn(),
  setDocsTooltipsEnabled: vi.fn(),
  evaluateDataContractPreflight: vi.fn(),
  evaluateAiPathsValidationPreflight: vi.fn(),
  listAiPathRuns: vi.fn(),
  normalizeAiPathsValidationConfig: vi.fn(),
  buildSwitchPathOptions: vi.fn(),
  sortPathMetas: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockState.routerPush,
  }),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({
    push: mockState.routerPush,
  }),
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useRunHistoryActions: () => ({
    setRunHistoryNodeId: mockState.setRunHistoryNodeId,
    setRunFilter: mockState.setRunFilter,
    openRunDetail: mockState.openRunDetail,
  }),
}));

vi.mock('@/features/ai/ai-paths/hooks/useAiPathsDocsTooltips', () => ({
  useAiPathsDocsTooltips: () => ({
    docsTooltipsEnabled: true,
    setDocsTooltipsEnabled: mockState.setDocsTooltipsEnabled,
  }),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/data-contract-preflight', () => ({
  evaluateDataContractPreflight: (...args: unknown[]) =>
    mockState.evaluateDataContractPreflight(...args),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  evaluateDataContractPreflight: (...args: unknown[]) => mockState.evaluateDataContractPreflight(...args),
  evaluateAiPathsValidationPreflight: (...args: unknown[]) =>
    mockState.evaluateAiPathsValidationPreflight(...args),
  listAiPathRuns: (...args: unknown[]) => mockState.listAiPathRuns(...args),
  normalizeAiPathsValidationConfig: (...args: unknown[]) =>
    mockState.normalizeAiPathsValidationConfig(...args),
}));

vi.mock('../ai-paths-settings-view-utils', () => ({
  buildSwitchPathOptions: (...args: unknown[]) => mockState.buildSwitchPathOptions(...args),
  sortPathMetas: (...args: unknown[]) => mockState.sortPathMetas(...args),
}));

import { useAiPathsSettingsPageValue } from '../useAiPathsSettingsPageValue';

const props: AiPathsSettingsProps = {
  activeTab: 'canvas',
  isFocusMode: false,
};

const basePaths: PathMeta[] = [
  {
    id: 'b-path',
    name: 'Beta Path',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
  },
  {
    id: 'a-path',
    name: 'Alpha Path',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
  },
];

const createState = (
  overrides: Partial<UseAiPathsSettingsStateReturn> = {}
): UseAiPathsSettingsStateReturn =>
  ({
    aiPathsValidation: { enabled: true },
    nodes: [{ id: 'node-1' }, { id: 'node-2' }],
    edges: [{ id: 'edge-1' }],
    runtimeState: { status: 'idle', nodeStatuses: {}, nodeOutputs: {}, variables: {}, events: [], inputs: {}, outputs: {} },
    paths: basePaths,
    autoSaveStatus: 'idle',
    activePathId: 'path-1',
    toast: vi.fn(),
    handleSave: vi.fn().mockResolvedValue(true),
    selectedNodeId: 'node-1',
    pathName: 'Original Path',
    updateActivePathMeta: vi.fn(),
    runtimeEvents: [{ id: 'event-1' }],
    incrementLoadNonce: vi.fn(),
    handleOpenNodeValidator: vi.fn(),
    handleRunNodeValidationCheck: vi.fn(),
    activeTrigger: 'manual',
    loading: false,
    isPathSwitching: false,
    docsOverviewSnippet: '',
    docsWiringSnippet: '',
    docsDescriptionSnippet: '',
    docsJobsSnippet: '',
    handleCopyDocsWiring: vi.fn(),
    handleCopyDocsDescription: vi.fn(),
    handleCopyDocsJobs: vi.fn(),
    autoSaveLabel: '',
    autoSaveClasses: '',
    autoSaveAt: null,
    saving: false,
    handleCreatePath: vi.fn(),
    handleCreateFromTemplate: vi.fn(),
    handleDuplicatePath: vi.fn(),
    handleReset: vi.fn(),
    handleDeletePath: vi.fn(),
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'manual',
    strictFlowMode: false,
    blockedRunPolicy: 'fail_run',
    historyRetentionPasses: 0,
    historyRetentionOptionsMax: 10,
    handleExecutionModeChange: vi.fn(),
    handleFlowIntensityChange: vi.fn(),
    handleRunModeChange: vi.fn(),
    handleStrictFlowModeChange: vi.fn(),
    handleBlockedRunPolicyChange: vi.fn(),
    updateAiPathsValidation: vi.fn(),
    handleHistoryRetentionChange: vi.fn(),
    triggers: [],
    isPathLocked: false,
    isPathActive: true,
    handleTogglePathLock: vi.fn(),
    handleTogglePathActive: vi.fn(),
    lastError: null,
    persistLastError: vi.fn(),
    lastRunAt: null,
    pathDescription: '',
    pathConfigs: {},
    pathFlagsById: {},
    handleSwitchPath: vi.fn(),
    savePathIndex: vi.fn(),
    edgePaths: [],
    view: { x: 0, y: 0, scale: 1 },
    panState: null,
    lastDrop: null,
    connecting: null,
    connectingPos: null,
    connectingFromNode: null,
    nodeConfigDirty: false,
    dragState: null,
    selectedEdgeId: null,
    palette: [],
    paletteCollapsed: false,
    setPaletteCollapsed: vi.fn(),
    expandedPaletteGroups: new Set<string>(),
    isPathTreeVisible: true,
    setIsPathTreeVisible: vi.fn(),
    togglePaletteGroup: vi.fn(),
    handleDragStart: vi.fn(),
    selectedNode: null,
    handleSelectEdge: vi.fn(),
    handleFireTrigger: vi.fn(),
    handleFireTriggerPersistent: vi.fn(),
    updateSelectedNode: vi.fn(),
    handleDeleteSelectedNode: vi.fn(),
    handleRemoveEdge: vi.fn(),
    handleClearWires: vi.fn(),
    handleClearConnectorData: vi.fn(),
    handleClearHistory: vi.fn(),
    handleClearNodeHistory: vi.fn(),
    handleDisconnectPort: vi.fn(),
    handleReconnectInput: vi.fn(),
    handleSelectNode: vi.fn(),
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
    handleStartConnection: vi.fn(),
    handleCompleteConnection: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handlePanStart: vi.fn(),
    handlePanMove: vi.fn(),
    handlePanEnd: vi.fn(),
    zoomTo: vi.fn(),
    fitToNodes: vi.fn(),
    resetView: vi.fn(),
    presetDraft: { name: '', description: '', bundlePorts: [], template: '' },
    setPresetDraft: vi.fn(),
    editingPresetId: null,
    handleResetPresetDraft: vi.fn(),
    handlePresetFromSelection: vi.fn(),
    handleSavePreset: vi.fn(),
    clusterPresets: [],
    handleLoadPreset: vi.fn(),
    handleApplyPreset: vi.fn(),
    handleDeletePreset: vi.fn(),
    handleExportPresets: vi.fn(),
    viewportRef: { current: null },
    canvasRef: { current: null },
    parserSamples: {},
    setParserSamples: vi.fn(),
    parserSampleLoading: false,
    updaterSamples: {},
    setUpdaterSamples: vi.fn(),
    updaterSampleLoading: false,
    pathDebugSnapshots: {},
    updateSelectedNodeConfig: vi.fn(),
    handleFetchParserSample: vi.fn(),
    handleFetchUpdaterSample: vi.fn(),
    handleRunSimulation: vi.fn(),
    handlePauseActiveRun: vi.fn(),
    handleResumeActiveRun: vi.fn(),
    handleStepActiveRun: vi.fn(),
    handleCancelActiveRun: vi.fn(),
    runtimeRunStatus: 'idle',
    runtimeNodeStatuses: {},
    nodeDurations: {},
    clearRuntimeForNode: vi.fn(),
    clearNodeCache: vi.fn(),
    handleSendToAi: vi.fn(),
    sendingToAi: false,
    dbQueryPresets: [],
    setDbQueryPresets: vi.fn(),
    saveDbQueryPresets: vi.fn(),
    dbNodePresets: [],
    setDbNodePresets: vi.fn(),
    saveDbNodePresets: vi.fn(),
    presetsModalOpen: false,
    setPresetsModalOpen: vi.fn(),
    presetsJson: '',
    setPresetsJson: vi.fn(),
    handleImportPresets: vi.fn(),
    ConfirmationModal: () => null,
    confirmNodeSwitch: vi.fn(),
    reportAiPathsError: vi.fn(),
    ensureNodeVisible: vi.fn(),
    getCanvasCenterPosition: vi.fn(),
    persistActivePathPreference: vi.fn(),
    persistPathSettings: vi.fn(),
    persistSettingsBulk: vi.fn(),
    ...overrides,
  }) as unknown as UseAiPathsSettingsStateReturn;

describe('useAiPathsSettingsPageValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockState.routerPush.mockReset();
    mockState.setRunHistoryNodeId.mockReset();
    mockState.setRunFilter.mockReset();
    mockState.openRunDetail.mockReset();
    mockState.setDocsTooltipsEnabled.mockReset();
    mockState.evaluateDataContractPreflight.mockReset().mockReturnValue({ report: 'data-contract' });
    mockState.evaluateAiPathsValidationPreflight
      .mockReset()
      .mockReturnValue({ score: 98, failedRules: 0, blocked: false, shouldWarn: false });
    mockState.listAiPathRuns.mockReset();
    mockState.normalizeAiPathsValidationConfig.mockReset().mockImplementation((value?: unknown) =>
      value && typeof value === 'object' ? value : { enabled: true, normalized: true }
    );
    mockState.sortPathMetas.mockReset().mockImplementation((paths: PathMeta[]) => [...paths].reverse());
    mockState.buildSwitchPathOptions
      .mockReset()
      .mockImplementation((paths: PathMeta[]) => paths.map((path) => ({ value: path.id, label: path.name })));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('derives page context values, local UI state, and rename actions', async () => {
    const state = createState();
    const { result } = renderHook(() => useAiPathsSettingsPageValue(props, state));

    expect(result.current.diagnosticsReady).toBe(false);
    expect(result.current.normalizedAiPathsValidation).toEqual({ enabled: true });
    expect(result.current.nodeValidationEnabled).toBe(true);
    expect(mockState.evaluateAiPathsValidationPreflight).not.toHaveBeenCalled();
    expect(mockState.evaluateDataContractPreflight).not.toHaveBeenCalled();

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.diagnosticsReady).toBe(true);
    expect(mockState.evaluateAiPathsValidationPreflight).toHaveBeenCalledWith({
      nodes: state.nodes,
      edges: state.edges,
      config: { enabled: true },
    });
    expect(mockState.evaluateDataContractPreflight).toHaveBeenCalledWith({
      nodes: state.nodes,
      edges: state.edges,
      runtimeState: state.runtimeState,
      mode: 'light',
      scopeMode: 'full',
    });
    expect(mockState.sortPathMetas).toHaveBeenCalledWith(basePaths);
    expect(result.current.pathSwitchOptions).toEqual([
      { value: 'a-path', label: 'Alpha Path' },
      { value: 'b-path', label: 'Beta Path' },
    ]);
    expect(result.current.autoSaveVariant).toBe('neutral');
    expect(result.current.docsTooltipsEnabled).toBe(true);
    expect(result.current.setDocsTooltipsEnabled).toBe(mockState.setDocsTooltipsEnabled);
    expect(result.current.selectedNodeIds).toEqual(['node-1']);
    expect(result.current.hasHistory).toBe(true);
    expect(result.current.savePathConfig).toBe(state.handleSave);

    await act(async () => {
      result.current.setPathSettingsModalOpen(true);
      result.current.setSimulationModalOpen(true);
      result.current.setSelectionScopeMode('wiring');
      result.current.startPathNameEdit();
    });

    expect(result.current.pathSettingsModalOpen).toBe(true);
    expect(result.current.simulationModalOpen).toBe(true);
    expect(result.current.selectionScopeMode).toBe('wiring');
    expect(result.current.isPathNameEditing).toBe(true);
    expect(result.current.renameDraft).toBe('Original Path');

    await act(async () => {
      result.current.setRenameDraft('Renamed Path');
    });
    expect(result.current.renameDraft).toBe('Renamed Path');

    await act(async () => {
      result.current.commitPathNameEdit();
    });
    expect(state.updateActivePathMeta).toHaveBeenCalledWith('Renamed Path');
    expect(state.handleSave).toHaveBeenCalledWith({ pathNameOverride: 'Renamed Path' });
    expect(result.current.isPathNameEditing).toBe(false);

    await act(async () => {
      result.current.startPathNameEdit();
      result.current.setRenameDraft('Discarded Name');
      result.current.cancelPathNameEdit();
    });
    expect(result.current.renameDraft).toBe('Original Path');
    expect(result.current.isPathNameEditing).toBe(false);

    await act(async () => {
      result.current.incrementLoadNonce();
    });
    expect(state.incrementLoadNonce).toHaveBeenCalledTimes(1);
  });

  it('falls back to default validation config, maps autosave states, and supports missing active path rename commit', async () => {
    mockState.normalizeAiPathsValidationConfig
      .mockReset()
      .mockReturnValueOnce(null)
      .mockReturnValue({ enabled: false, normalized: 'fallback' });

    const state = createState({
      aiPathsValidation: undefined,
      activePathId: null,
      runtimeEvents: [],
      selectedNodeId: null,
      autoSaveStatus: 'saved',
    });

    const { result, rerender } = renderHook(
      ({ activeTab, nextState }) => useAiPathsSettingsPageValue({ activeTab }, nextState),
      {
        initialProps: { activeTab: 'canvas' as const, nextState: state },
      }
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.normalizedAiPathsValidation).toEqual({ enabled: false, normalized: 'fallback' });
    expect(result.current.nodeValidationEnabled).toBe(false);
    expect(mockState.evaluateDataContractPreflight).toHaveBeenCalledWith({
      nodes: state.nodes,
      edges: state.edges,
      runtimeState: state.runtimeState,
      mode: 'light',
      scopeMode: 'reachable_from_roots',
    });
    expect(result.current.selectedNodeIds).toEqual([]);
    expect(result.current.hasHistory).toBe(false);
    expect(result.current.autoSaveVariant).toBe('success');

    await act(async () => {
      result.current.startPathNameEdit();
      result.current.setRenameDraft('Ignored Rename');
      result.current.commitPathNameEdit();
    });
    expect(state.updateActivePathMeta).not.toHaveBeenCalled();
    expect(state.handleSave).not.toHaveBeenCalled();

    rerender({ activeTab: 'paths', nextState: createState({ autoSaveStatus: 'saving' }) });
    expect(result.current.autoSaveVariant).toBe('processing');
    expect(result.current.diagnosticsReady).toBe(false);

    rerender({ activeTab: 'docs', nextState: createState({ autoSaveStatus: 'error' }) });
    expect(result.current.autoSaveVariant).toBe('error');
    expect(result.current.diagnosticsReady).toBe(false);
  });

  it('reports blocked, warning, and successful validation checks', async () => {
    const toast = vi.fn();
    const blockedState = createState({ toast });
    const { result, rerender } = renderHook(
      ({ report, nextState }) => {
        mockState.evaluateAiPathsValidationPreflight.mockReturnValue(report);
        return useAiPathsSettingsPageValue(props, nextState);
      },
      {
        initialProps: {
          report: { score: 40, failedRules: 3, blocked: true, shouldWarn: false },
          nextState: blockedState,
        },
      }
    );

    await act(async () => {
      vi.runAllTimers();
    });

    await act(async () => {
      result.current.handleRunNodeValidationCheck();
    });
    expect(toast).toHaveBeenCalledWith('Node validation blocked (score 40).', { variant: 'error' });

    rerender({
      report: { score: 72, failedRules: 1, blocked: false, shouldWarn: true },
      nextState: createState({ toast }),
    });
    await act(async () => {
      result.current.handleRunNodeValidationCheck();
    });
    expect(toast).toHaveBeenCalledWith(
      'Node validation warning (score 72, failed rules 1).',
      { variant: 'warning' }
    );

    rerender({
      report: { score: 100, failedRules: 0, blocked: false, shouldWarn: false },
      nextState: createState({ toast }),
    });
    await act(async () => {
      result.current.handleRunNodeValidationCheck();
    });
    expect(toast).toHaveBeenCalledWith('Node validation passed.', { variant: 'success' });
  });

  it('opens the node validator via router navigation', async () => {
    const state = createState();
    const { result } = renderHook(() => useAiPathsSettingsPageValue(props, state));

    await act(async () => {
      vi.runAllTimers();
    });

    await act(async () => {
      result.current.handleOpenNodeValidator();
    });

    expect(mockState.routerPush).toHaveBeenCalledWith('/admin/ai-paths/validation');
  });

  it('inspects node traces, preferring failed runs and falling back to general history', async () => {
    const state = createState({ activePathId: 'path-77' });
    mockState.listAiPathRuns
      .mockResolvedValueOnce({ ok: true, data: { runs: [] } })
      .mockResolvedValueOnce({ ok: true, data: { runs: [{ id: 'run-general' }] } })
      .mockResolvedValueOnce({ ok: true, data: { runs: [{ id: 'run-failed' }] } })
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useAiPathsSettingsPageValue(props, state));

    await act(async () => {
      vi.runAllTimers();
    });

    await act(async () => {
      await result.current.handleInspectTraceNode('  node-42  ', 'failed');
    });

    expect(mockState.listAiPathRuns).toHaveBeenNthCalledWith(1, {
      pathId: 'path-77',
      nodeId: 'node-42',
      limit: 1,
      offset: 0,
      status: 'failed',
    });
    expect(mockState.listAiPathRuns).toHaveBeenNthCalledWith(2, {
      pathId: 'path-77',
      nodeId: 'node-42',
      limit: 1,
      offset: 0,
    });
    expect(mockState.setRunHistoryNodeId).toHaveBeenCalledWith('node-42');
    expect(mockState.setRunFilter).toHaveBeenCalledWith('failed');
    expect(mockState.openRunDetail).toHaveBeenCalledWith('run-general');

    await act(async () => {
      await result.current.handleInspectTraceNode('node-77', 'failed');
    });
    expect(mockState.listAiPathRuns).toHaveBeenNthCalledWith(3, {
      pathId: 'path-77',
      nodeId: 'node-77',
      limit: 1,
      offset: 0,
      status: 'failed',
    });
    expect(mockState.openRunDetail).toHaveBeenLastCalledWith('run-failed');

    await act(async () => {
      await result.current.handleInspectTraceNode('node-404', 'all');
      await result.current.handleInspectTraceNode('   ', 'all');
    });
    expect(mockState.listAiPathRuns).toHaveBeenNthCalledWith(4, {
      pathId: 'path-77',
      nodeId: 'node-404',
      limit: 1,
      offset: 0,
    });
    expect(mockState.openRunDetail).toHaveBeenCalledTimes(2);
  });
});
