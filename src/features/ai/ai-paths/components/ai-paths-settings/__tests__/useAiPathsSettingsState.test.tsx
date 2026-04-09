import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  confirmNodeSwitch: vi.fn(),
  graphActions: {
    setPathName: vi.fn(),
  },
  selectionState: {
    selectedNodeId: 'node-1',
    configOpen: true,
    nodeConfigDirty: true,
  },
  selectionActions: {
    setNodeConfigDirty: vi.fn(),
  },
  persistenceState: {
    loading: false,
    loadNonce: 2,
    isPathSwitching: false,
  },
  persistenceActions: {
    setOperationHandlers: vi.fn(),
    incrementLoadNonce: vi.fn(),
  },
  runtimeActions: {
    setRunControlHandlers: vi.fn(),
    setRuntimeNodeConfigHandlers: vi.fn(),
    setParserSamples: vi.fn(),
    setUpdaterSamples: vi.fn(),
  },
  runtimeStateCtx: {
    runtimeState: {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
    },
    parserSamples: { 'node-1': { json: '{}' } },
    updaterSamples: { 'node-2': { json: '{}' } },
    pathDebugSnapshots: { 'path-1': { entries: [] } },
    lastRunAt: '2026-03-19T10:00:00.000Z',
    lastError: { message: 'boom', time: '2026-03-19T09:00:00.000Z' },
  },
  coreState: {
    nodes: [{ id: 'node-1' }, { id: 'node-2' }],
    setEdges: vi.fn(),
    edges: [{ id: 'edge-1' }],
    paths: [{ id: 'path-1', name: 'Path One' }],
    pathConfigs: {
      'path-1': {
        extensions: {
          runtimeKernel: { engine: 'node' },
        },
      },
    },
    activePathId: 'path-1',
    isPathLocked: false,
    isPathActive: true,
    pathName: 'Path One',
    pathDescription: 'Main path',
    activeTrigger: 'Product Modal - Context Grabber',
  },
  executionState: {
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidationState: { enabled: true },
    historyRetentionPasses: 3,
    historyRetentionOptionsMax: 10,
  },
  errorState: {
    validation: {
      validationMarker: 'validation-marker',
    },
    reportAiPathsError: vi.fn(),
    persistLastError: vi.fn(),
  },
  nodeConfig: {
    updateSelectedNode: vi.fn(),
    updateSelectedNodeConfig: vi.fn(),
  },
  runtimeMgmt: {
    pruneRuntimeInputs: vi.fn(),
    clearRuntimeForNode: vi.fn(),
  },
  derived: {
    selectedNode: { id: 'node-1', label: 'Selected Node' },
    pathFlagsById: { 'path-1': { isLocked: false, isActive: true } },
    autoSaveLabel: 'Saving...',
    autoSaveClasses: 'text-amber-300',
  },
  canvasInteractions: {
    viewportRef: { current: null },
    canvasRef: { current: null },
    view: { x: 10, y: 20, scale: 1.5 },
    panState: null,
    dragState: null,
    connecting: null,
    connectingPos: null,
    lastDrop: { x: 1, y: 2 },
    selectedEdgeId: 'edge-1',
    edgePaths: [{ id: 'edge-1', path: 'M0 0 L1 1' }],
    connectingFromNode: { id: 'node-1' },
    ensureNodeVisible: vi.fn(),
    getCanvasCenterPosition: vi.fn(() => ({ x: 50, y: 75 })),
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
    handleDragStart: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleStartConnection: vi.fn(),
    handleCompleteConnection: vi.fn(),
    handlePanStart: vi.fn(),
    handlePanMove: vi.fn(),
    handlePanEnd: vi.fn(),
    handleReconnectInput: vi.fn(),
    handleRemoveEdge: vi.fn(),
    handleDisconnectPort: vi.fn(),
    handleDeleteSelectedNode: vi.fn(),
    handleSelectEdge: vi.fn(),
    handleSelectNode: vi.fn(),
    zoomTo: vi.fn(),
    fitToNodes: vi.fn(),
    resetView: vi.fn(),
  },
  presets: {
    clusterPresets: [{ id: 'preset-1' }],
    dbQueryPresets: [{ id: 'query-1' }],
    setDbQueryPresets: vi.fn(),
    saveDbQueryPresets: vi.fn(),
    dbNodePresets: [{ id: 'db-node-1' }],
    setDbNodePresets: vi.fn(),
    saveDbNodePresets: vi.fn(),
    editingPresetId: 'preset-1',
    presetDraft: { name: 'Draft', description: '', bundlePorts: [], template: '' },
    setPresetDraft: vi.fn(),
    handleSavePreset: vi.fn(),
    handleLoadPreset: vi.fn(),
    handleDeletePreset: vi.fn(),
    handleApplyPreset: vi.fn(),
    handleExportPresets: vi.fn(),
    handleImportPresets: vi.fn(),
    handlePresetFromSelection: vi.fn(),
    handleResetPresetDraft: vi.fn(),
    presetsModalOpen: true,
    setPresetsModalOpen: vi.fn(),
    presetsJson: '{"ok":true}',
    setPresetsJson: vi.fn(),
    expandedPaletteGroups: new Set(['group-a']),
    setExpandedPaletteGroups: vi.fn(),
    paletteCollapsed: false,
    setPaletteCollapsed: vi.fn(),
    togglePaletteGroup: vi.fn(),
  },
  samples: {
    parserSampleLoading: true,
    updaterSampleLoading: false,
    handleFetchParserSample: vi.fn(),
    handleFetchUpdaterSample: vi.fn(),
  },
  persistence: {
    autoSaveStatus: 'saving',
    autoSaveAt: '2026-03-19T10:05:00.000Z',
    saving: true,
    handleSave: vi.fn(),
    persistActivePathPreference: vi.fn(),
    persistPathSettings: vi.fn(),
    persistSettingsBulk: vi.fn(),
    savePathIndex: vi.fn(),
  },
  runtime: {
    resetRuntimeDiagnostics: vi.fn(),
    handleFireTrigger: vi.fn(),
    handleFireTriggerPersistent: vi.fn(),
    handlePauseRun: vi.fn(),
    handleResumeRun: vi.fn(),
    handleStepRun: vi.fn(),
    handleCancelRun: vi.fn(),
    handleRunSimulation: vi.fn(),
    handleSendToAi: vi.fn(),
    runStatus: 'paused',
    runtimeNodeStatuses: { 'node-1': 'paused' },
    runtimeEvents: [{ id: 'runtime-event-1' }],
    nodeDurations: { 'node-1': 42 },
    clearNodeCache: vi.fn(),
    sendingToAi: true,
  },
  cleanup: {
    handleClearWires: vi.fn(),
    handleClearConnectorData: vi.fn(),
    handleClearHistory: vi.fn(),
    handleClearNodeHistory: vi.fn(),
  },
  pathActions: {
    handleCreatePath: vi.fn(),
    handleCreateFromTemplate: vi.fn(),
    handleDuplicatePath: vi.fn(),
    handleReset: vi.fn(),
    handleDeletePath: vi.fn(),
    handleSwitchPath: vi.fn(),
  },
  modeActions: {
    handleTogglePathLock: vi.fn(),
    handleTogglePathActive: vi.fn(),
    handleExecutionModeChange: vi.fn(),
    handleFlowIntensityChange: vi.fn(),
    handleRunModeChange: vi.fn(),
    handleStrictFlowModeChange: vi.fn(),
    handleBlockedRunPolicyChange: vi.fn(),
    updateAiPathsValidation: vi.fn(),
    handleHistoryRetentionChange: vi.fn(),
  },
  docsActions: {
    handleCopyDocsWiring: vi.fn(),
    handleCopyDocsDescription: vi.fn(),
    handleCopyDocsJobs: vi.fn(),
  },
  runtimeArgs: [] as Array<Record<string, unknown>>,
  persistenceArgs: [] as Array<Record<string, unknown>>,
  pathActionArgs: [] as Array<Record<string, unknown>>,
  canvasArgs: [] as Array<Record<string, unknown>>,
  runHistoryCalls: [] as Array<Record<string, unknown>>,
  paletteHookArgs: [] as Array<Record<string, unknown> | undefined>,
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useGraphActions: () => mockState.graphActions,
  usePersistenceActions: () => mockState.persistenceActions,
  usePersistenceState: () => mockState.persistenceState,
  useRuntimeState: () => mockState.runtimeStateCtx,
  useRuntimeActions: () => mockState.runtimeActions,
  useSelectionActions: () => mockState.selectionActions,
  useSelectionState: () => mockState.selectionState,
}));

vi.mock('@/features/ai/ai-paths/logic/runtime-pruning', () => ({
  pruneRuntimeInputsState: vi.fn(),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockState.confirm,
    ConfirmationModal: (): React.JSX.Element => <div data-testid='confirmation-modal' />,
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  triggers: ['Fallback Trigger'],
}));

vi.mock('@/shared/lib/ai-paths/core/definitions/docs-snippets', () => ({
  DOCS_OVERVIEW_SNIPPET: 'overview snippet',
  DOCS_WIRING_SNIPPET: 'wiring snippet',
  DOCS_DESCRIPTION_SNIPPET: 'description snippet',
  DOCS_JOBS_SNIPPET: 'jobs snippet',
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

vi.mock('@/shared/ui', () => ({}));

vi.mock('@/shared/utils/object-utils', () => ({
  isObjectRecord: (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value),
}));

vi.mock('../hooks/state/useCoreSettingsState', () => ({
  useCoreSettingsState: () => mockState.coreState,
}));

vi.mock('../hooks/state/useExecutionSettingsState', () => ({
  useExecutionSettingsState: () => mockState.executionState,
}));

vi.mock('../hooks/useAiPathsErrorState', () => ({
  useAiPathsErrorState: () => mockState.errorState,
}));

vi.mock('../hooks/useAiPathsNodeConfigActions', () => ({
  useAiPathsNodeConfigActions: () => mockState.nodeConfig,
}));

vi.mock('../hooks/useAiPathsRuntimeManagement', () => ({
  useAiPathsRuntimeManagement: () => mockState.runtimeMgmt,
}));

vi.mock('../hooks/usePaletteWithTriggerButtons', () => ({
  usePaletteWithTriggerButtons: (args?: Record<string, unknown>) => {
    mockState.paletteHookArgs.push(args);
    return [{ id: 'palette-trigger' }];
  },
}));

vi.mock('../hooks/useAiPathsSettingsDerivedState', () => ({
  useAiPathsSettingsDerivedState: () => mockState.derived,
}));

vi.mock('../useAiPathsCanvasInteractions', () => ({
  useAiPathsCanvasInteractions: (args: Record<string, unknown>) => {
    mockState.canvasArgs.push(args);
    return mockState.canvasInteractions;
  },
}));

vi.mock('../useAiPathsNodeSwitchConfirm', () => ({
  useAiPathsNodeSwitchConfirm: () => ({ confirmNodeSwitch: mockState.confirmNodeSwitch }),
}));

vi.mock('../useAiPathsPersistence', () => ({
  useAiPathsPersistence: (args: Record<string, unknown>) => {
    mockState.persistenceArgs.push(args);
    return mockState.persistence;
  },
}));

vi.mock('../useAiPathsPresets', () => ({
  useAiPathsPresets: () => mockState.presets,
}));

vi.mock('../useAiPathsRunHistory', () => ({
  useAiPathsRunHistory: (args: Record<string, unknown>) => {
    mockState.runHistoryCalls.push(args);
  },
}));

vi.mock('../useAiPathsRuntime', () => ({
  useAiPathsRuntime: (args: Record<string, unknown>) => {
    mockState.runtimeArgs.push(args);
    return mockState.runtime;
  },
}));

vi.mock('../useAiPathsSettingsCleanupActions', () => ({
  useAiPathsSettingsCleanupActions: () => mockState.cleanup,
}));

vi.mock('../useAiPathsSettingsDocsActions', () => ({
  useAiPathsSettingsDocsActions: () => mockState.docsActions,
}));

vi.mock('../useAiPathsSettingsModeActions', () => ({
  useAiPathsSettingsModeActions: () => mockState.modeActions,
}));

vi.mock('../useAiPathsSettingsPathActions', () => ({
  useAiPathsSettingsPathActions: (args: Record<string, unknown>) => {
    mockState.pathActionArgs.push(args);
    return mockState.pathActions;
  },
}));

vi.mock('../useAiPathsSettingsSamples', () => ({
  useAiPathsSettingsSamples: () => mockState.samples,
}));

import { useAiPathsSettingsState } from '../useAiPathsSettingsState';

describe('useAiPathsSettingsState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockState.toast.mockReset();
    mockState.confirm.mockReset();
    mockState.confirmNodeSwitch.mockReset().mockResolvedValue(true);
    mockState.graphActions.setPathName.mockReset();
    mockState.selectionActions.setNodeConfigDirty.mockReset();
    mockState.persistenceActions = {
      setOperationHandlers: vi.fn(),
      incrementLoadNonce: vi.fn(),
    };
    mockState.runtimeActions = {
      setRunControlHandlers: vi.fn(),
      setRuntimeNodeConfigHandlers: vi.fn(),
      setParserSamples: vi.fn(),
      setUpdaterSamples: vi.fn(),
    };
    mockState.coreState = {
      ...mockState.coreState,
      setEdges: vi.fn(),
      pathConfigs: {
        'path-1': {
          extensions: {
            runtimeKernel: { engine: 'node' },
          },
        },
      },
      activePathId: 'path-1',
      activeTrigger: 'Product Modal - Context Grabber',
    };
    mockState.persistenceArgs.length = 0;
    mockState.runtimeArgs.length = 0;
    mockState.pathActionArgs.length = 0;
    mockState.canvasArgs.length = 0;
    mockState.runHistoryCalls.length = 0;
    mockState.paletteHookArgs.length = 0;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('orchestrates hook dependencies, registers handlers, and exposes the composed state', async () => {
    const { result, unmount } = renderHook(() =>
      useAiPathsSettingsState({ activeTab: 'canvas' })
    );

    expect(result.current.docsOverviewSnippet).toBe('overview snippet');
    expect(result.current.docsWiringSnippet).toBe('wiring snippet');
    expect(result.current.docsDescriptionSnippet).toBe('description snippet');
    expect(result.current.docsJobsSnippet).toBe('jobs snippet');
    expect(result.current.autoSaveLabel).toBe('Saving...');
    expect(result.current.autoSaveClasses).toBe('text-amber-300');
    expect(result.current.palette).toEqual([{ id: 'palette-trigger' }]);
    expect(result.current.parserSamples).toEqual(mockState.runtimeStateCtx.parserSamples);
    expect(result.current.setParserSamples).toBe(mockState.runtimeActions.setParserSamples);
    expect(result.current.updaterSamples).toEqual(mockState.runtimeStateCtx.updaterSamples);
    expect(result.current.setUpdaterSamples).toBe(mockState.runtimeActions.setUpdaterSamples);
    expect(result.current.handleSave).toBe(mockState.persistence.handleSave);
    expect(result.current.handleCreatePath).toBe(mockState.pathActions.handleCreatePath);
    expect(result.current.handleCopyDocsWiring).toBe(mockState.docsActions.handleCopyDocsWiring);
    expect(result.current.handleClearWires).toBe(mockState.cleanup.handleClearWires);
    expect(result.current.handleRunSimulation).toBe(mockState.runtime.handleRunSimulation);
    expect(result.current.handleFireTrigger).toBe(mockState.runtime.handleFireTrigger);
    expect(result.current.runtimeRunStatus).toBe('paused');
    expect(result.current.runtimeEvents).toEqual(mockState.runtime.runtimeEvents);
    expect(result.current.nodeDurations).toEqual(mockState.runtime.nodeDurations);
    expect(result.current.updateActivePathMeta).toEqual(expect.any(Function));
    expect(result.current.ConfirmationModal).toEqual(expect.any(Function));
    expect(result.current.confirmNodeSwitch).toBe(mockState.confirmNodeSwitch);

    expect(mockState.runHistoryCalls).toEqual([
      {
        activePathId: 'path-1',
        enabled: true,
        toast: mockState.toast,
      },
    ]);
    expect(mockState.paletteHookArgs[0]).toEqual({ enabled: false });
    expect(mockState.canvasArgs[0]?.enabled).toBe(true);
    expect(mockState.canvasArgs[0]?.clearRuntimeInputsForEdges).toBe(
      mockState.runtimeMgmt.pruneRuntimeInputs
    );
    expect(mockState.runtimeArgs[0]?.runtimeKernelConfig).toEqual({ engine: 'node' });
    expect(mockState.persistenceArgs[0]?.normalizeTriggerLabel('Product Modal - Context Grabber')).toBe(
      'Product Modal - Context Filter'
    );
    expect(mockState.persistenceArgs[0]?.normalizeTriggerLabel()).toBe('Fallback Trigger');
    expect(mockState.pathActionArgs[0]?.normalizeTriggerLabel('Another Trigger')).toBe('Another Trigger');

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(mockState.paletteHookArgs.at(-1)).toEqual({ enabled: true });

    await act(async () => {
      await mockState.canvasArgs[0]?.confirmNodeSwitch?.('node-9');
    });
    expect(mockState.confirmNodeSwitch).toHaveBeenCalledWith('node-9');

    act(() => {
      mockState.runtimeArgs[0]?.onCanonicalEdgesDetected?.([{ id: 'edge-2' }]);
    });
    expect(mockState.coreState.setEdges).toHaveBeenCalledWith(
      [{ id: 'edge-2' }],
      {
        reason: 'update',
        source: 'runtime.edge-canonicalization',
      }
    );

    await act(async () => {
      result.current.incrementLoadNonce();
      result.current.updateActivePathMeta('Renamed Path');
      await result.current.persistPathSettings([], 'path-1', { id: 'config-1' } as never);
    });
    expect(mockState.persistenceActions.incrementLoadNonce).toHaveBeenCalledTimes(1);
    expect(mockState.graphActions.setPathName).toHaveBeenCalledWith('Renamed Path');
    expect(mockState.persistence.persistPathSettings).toHaveBeenCalledWith([], 'path-1', {
      id: 'config-1',
    });

    expect(mockState.persistenceActions.setOperationHandlers).toHaveBeenCalledWith({
      savePathConfig: mockState.persistence.handleSave,
      persistPathSettings: mockState.persistence.persistPathSettings,
      persistSettingsBulk: mockState.persistence.persistSettingsBulk,
      persistActivePathPreference: mockState.persistence.persistActivePathPreference,
      savePathIndex: mockState.persistence.savePathIndex,
    });
    expect(mockState.runtimeActions.setRunControlHandlers).toHaveBeenCalledWith({
      fireTrigger: mockState.runtime.handleFireTrigger,
      fireTriggerPersistent: mockState.runtime.handleFireTriggerPersistent,
      pauseActiveRun: mockState.runtime.handlePauseRun,
      resumeActiveRun: mockState.runtime.handleResumeRun,
      stepActiveRun: mockState.runtime.handleStepRun,
      cancelActiveRun: mockState.runtime.handleCancelRun,
      clearWires: mockState.cleanup.handleClearWires,
      resetRuntimeDiagnostics: mockState.runtime.resetRuntimeDiagnostics,
    });
    expect(mockState.runtimeActions.setRuntimeNodeConfigHandlers).toHaveBeenCalledWith({
      fetchParserSample: mockState.samples.handleFetchParserSample,
      fetchUpdaterSample: mockState.samples.handleFetchUpdaterSample,
      runSimulation: mockState.runtime.handleRunSimulation,
      sendToAi: mockState.runtime.handleSendToAi,
    });

    unmount();

    expect(mockState.persistenceActions.setOperationHandlers).toHaveBeenLastCalledWith({});
    expect(mockState.runtimeActions.setRunControlHandlers).toHaveBeenLastCalledWith({});
    expect(mockState.runtimeActions.setRuntimeNodeConfigHandlers).toHaveBeenLastCalledWith({});
  });

  it('handles missing runtime kernel config and skips optional runtime handler registration', () => {
    const setOperationHandlers = vi.fn();

    mockState.coreState = {
      ...mockState.coreState,
      activePathId: 'path-2',
      pathConfigs: {
        'path-2': {
          extensions: 'invalid',
        },
      },
      activeTrigger: null,
    };
    mockState.persistenceActions = {
      setOperationHandlers,
      incrementLoadNonce: vi.fn(),
    };
    mockState.runtimeActions = {
      setRunControlHandlers: undefined,
      setRuntimeNodeConfigHandlers: undefined,
      setParserSamples: vi.fn(),
      setUpdaterSamples: vi.fn(),
    } as never;

    const { result } = renderHook(() => useAiPathsSettingsState({ activeTab: 'docs' }));

    expect(mockState.runtimeArgs.at(-1)?.runtimeKernelConfig).toBeUndefined();
    expect(mockState.persistenceArgs.at(-1)?.normalizeTriggerLabel()).toBe('Fallback Trigger');
    expect(mockState.pathActionArgs.at(-1)?.normalizeTriggerLabel('Already Normalized')).toBe(
      'Already Normalized'
    );
    expect(mockState.runHistoryCalls.at(-1)).toEqual({
      activePathId: 'path-2',
      enabled: false,
      toast: mockState.toast,
    });
    expect(mockState.canvasArgs.at(-1)?.enabled).toBe(false);
    expect(setOperationHandlers).toHaveBeenCalledWith({
      savePathConfig: mockState.persistence.handleSave,
      persistPathSettings: mockState.persistence.persistPathSettings,
      persistSettingsBulk: mockState.persistence.persistSettingsBulk,
      persistActivePathPreference: mockState.persistence.persistActivePathPreference,
      savePathIndex: mockState.persistence.savePathIndex,
    });

    act(() => {
      result.current.updateActivePathMeta('Path Two');
    });
    expect(mockState.graphActions.setPathName).toHaveBeenCalledWith('Path Two');
  });
});
