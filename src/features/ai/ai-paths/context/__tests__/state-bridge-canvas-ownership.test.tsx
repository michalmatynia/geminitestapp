import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AiPathsStateBridger } from '@/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger';
import type { UseAiPathsSettingsStateReturn } from '@/features/ai/ai-paths/components/ai-paths-settings/types';
import { AiPathsProvider, useCanvasActions, useCanvasState } from '@/features/ai/ai-paths/context';
import type { RuntimeState } from '@/shared/lib/ai-paths';

const EMPTY_NODES: unknown[] = [];
const EMPTY_EDGES: unknown[] = [];
const EMPTY_PATHS: unknown[] = [];
const EMPTY_NODE_DURATIONS: Record<string, number> = {};
const EMPTY_RUNTIME_NODE_STATUSES: Record<string, unknown> = {};
const EMPTY_RUNTIME_EVENTS: unknown[] = [];
const EMPTY_PATH_CONFIGS: Record<string, unknown> = {};
const EMPTY_RUN_HISTORY: Record<string, boolean> = {};
const EMPTY_RUN_HISTORY_SELECTION: Record<string, string> = {};

const buildLegacyState = (view: {
  x: number;
  y: number;
  scale: number;
}): UseAiPathsSettingsStateReturn =>
  ({
    selectedNodeId: null,
    selectedEdgeId: null,
    configOpen: false,
    nodeConfigDirty: false,
    simulationOpenNodeId: null,
    view,
    panState: null,
    dragState: null,
    connecting: null,
    connectingPos: null,
    lastDrop: null,
    nodes: EMPTY_NODES as UseAiPathsSettingsStateReturn['nodes'],
    edges: EMPTY_EDGES as UseAiPathsSettingsStateReturn['edges'],
    setNodes: (): void => undefined,
    setEdges: (): void => undefined,
    activePathId: null,
    pathName: '',
    isPathLocked: false,
    isPathActive: true,
    activeTrigger: '',
    executionMode: 'sequential',
    flowIntensity: 'balanced',
    runMode: 'manual',
    strictFlowMode: false,
    paths: EMPTY_PATHS as UseAiPathsSettingsStateReturn['paths'],
    pathConfigs: EMPTY_PATH_CONFIGS as UseAiPathsSettingsStateReturn['pathConfigs'],
    runtimeState: {} as RuntimeState,
    lastRunAt: null,
    lastError: null,
    runtimeRunStatus: 'idle',
    handleFireTrigger: (): void => undefined,
    handleFireTriggerPersistent: async (): Promise<void> => undefined,
    handlePauseActiveRun: (): void => undefined,
    handleResumeActiveRun: (): void => undefined,
    handleStepActiveRun: (): void => undefined,
    handleCancelActiveRun: (): void => undefined,
    handleClearWires: async (): Promise<void> => undefined,
    handleFetchParserSample: async (): Promise<void> => undefined,
    handleFetchUpdaterSample: async (): Promise<void> => undefined,
    handleRunSimulation: async (): Promise<void> => undefined,
    handleSendToAi: async (): Promise<void> => undefined,
    nodeDurations: EMPTY_NODE_DURATIONS,
    runtimeNodeStatuses:
      EMPTY_RUNTIME_NODE_STATUSES as UseAiPathsSettingsStateReturn['runtimeNodeStatuses'],
    runtimeEvents: EMPTY_RUNTIME_EVENTS as UseAiPathsSettingsStateReturn['runtimeEvents'],
    loading: false,
    saving: false,
    autoSaveStatus: 'idle',
    autoSaveAt: null,
    handleSave: async (): Promise<boolean> => true,
    clusterPresets: [],
    presetDraft: {} as unknown as UseAiPathsSettingsStateReturn['presetDraft'],
    editingPresetId: null,
    paletteCollapsed: false,
    expandedPaletteGroups: new Set<string>(),
    saveDbQueryPresets: async (): Promise<void> => undefined,
    saveDbNodePresets: async (): Promise<void> => undefined,
    runFilter: 'all',
    expandedRunHistory: EMPTY_RUN_HISTORY,
    runHistorySelection: EMPTY_RUN_HISTORY_SELECTION,
    docsOverviewSnippet: '',
    docsWiringSnippet: '',
    docsDescriptionSnippet: '',
    docsJobsSnippet: '',
    handleCopyDocsWiring: () => {},
    handleCopyDocsDescription: () => {},
    handleCopyDocsJobs: () => {},
    autoSaveLabel: '',
    autoSaveClasses: '',
    handleCreatePath: () => {},
    handleCreateAiDescriptionPath: () => {},
    handleCreateFromTemplate: () => {},
    handleDuplicatePath: () => {},
    handleDeletePath: async () => {},
    handleReset: () => {},
    handleExecutionModeChange: () => {},
    handleFlowIntensityChange: () => {},
    handleRunModeChange: () => {},
    handleStrictFlowModeChange: () => {},
    handleBlockedRunPolicyChange: () => {},
    setAiPathsValidation: () => {},
    updateAiPathsValidation: () => {},
    handleHistoryRetentionChange: async () => {},
    historyRetentionPasses: 0,
    historyRetentionOptionsMax: 0,
    handleTogglePathLock: () => {},
    handleTogglePathActive: () => {},
    setLastError: () => {},
    persistLastError: async () => Promise.resolve(),
    setLoadNonce: () => {},
    setPathName: () => {},
    setPathDescription: () => {},
    updateActivePathMeta: () => {},
    pathFlagsById: {},
    handleSwitchPath: () => {},
    savePathIndex: async () => {},
    edgePaths: [],
    palette: [],
    setPaletteCollapsed: () => {},
    togglePaletteGroup: () => {},
    handleDragStart: () => {},
    selectedNode: null,
    handleSelectEdge: () => {},
    setSimulationOpenNodeId: () => {},
    updateSelectedNode: () => {},
    setConfigOpen: () => {},
    handleDeleteSelectedNode: () => {},
    handleRemoveEdge: () => {},
    handleClearConnectorData: async () => {},
    handleClearHistory: async () => {},
    handleClearNodeHistory: async () => {},
    handleDisconnectPort: () => {},
    handleReconnectInput: () => {},
    handleSelectNode: () => {},
    handlePointerDown: () => {},
    handlePointerMove: () => {},
    handlePointerUp: () => {},
    handleStartConnection: () => {},
    handleCompleteConnection: () => {},
    handleDrop: () => {},
    handleDragOver: () => {},
    handlePanStart: () => {},
    handlePanMove: () => {},
    handlePanEnd: () => {},
    zoomTo: () => {},
    fitToNodes: () => {},
    resetView: () => {},
    handleResetPresetDraft: () => {},
    handlePresetFromSelection: () => {},
    handleSavePreset: async () => {},
    handleLoadPreset: () => {},
    handleApplyPreset: () => {},
    handleDeletePreset: async () => {},
    handleExportPresets: () => {},
    handleImportPresets: async () => {},
    lastGraphModelPayload: null,
    runList: [],
    runsQuery: {} as unknown as UseAiPathsSettingsStateReturn['runsQuery'],
    setRunFilter: () => {},
    setExpandedRunHistory: () => {},
    setRunHistorySelection: () => {},
    handleOpenRunDetail: async () => {},
    handleResumeRun: async () => {},
    handleCancelRun: async () => {},
    handleRequeueDeadLetter: async () => {},
    viewportRef: { current: null },
    canvasRef: { current: null },
    setNodeConfigDirty: () => {},
    parserSamples: {},
    setParserSamples: () => {},
    parserSampleLoading: false,
    updaterSamples: {},
    setUpdaterSamples: () => {},
    updaterSampleLoading: false,
    pathDebugSnapshots: {},
    updateSelectedNodeConfig: () => {},
    clearRuntimeForNode: () => {},
    clearNodeCache: () => {},
    sendingToAi: false,
    dbQueryPresets: [],
    setDbQueryPresets: () => {},
    dbNodePresets: [],
    setDbNodePresets: () => {},
    runDetailOpen: false,
    setRunDetailOpen: () => {},
    runDetailLoading: false,
    runDetail: null,
    setRunDetail: () => {},
    runStreamStatus: 'stopped',
    runStreamPaused: false,
    setRunStreamPaused: () => {},
    runNodeSummary: null,
    runEventsOverflow: false,
    runEventsBatchLimit: null,
    runDetailHistoryOptions: [],
    runDetailSelectedHistoryNodeId: null,
    setRunHistoryNodeId: () => {},
    runDetailSelectedHistoryEntries: [],
    presetsModalOpen: false,
    setPresetsModalOpen: () => {},
    presetsJson: '',
    setPresetsJson: () => {},
    ConfirmationModal: () => null,
    confirmNodeSwitch: async () => true,
    reportAiPathsError: () => {},
    toast: () => {},
    ensureNodeVisible: () => {},
    getCanvasCenterPosition: () => ({ x: 0, y: 0 }),
    persistActivePathPreference: async () => {},
    persistPathSettings: async () => null,
    persistRuntimePathState: async () => {},
    persistSettingsBulk: async () => {},
  }) as UseAiPathsSettingsStateReturn;

function BridgeOwnershipHarness(): React.JSX.Element {
  const [legacyState, setLegacyState] = React.useState<UseAiPathsSettingsStateReturn>(() =>
    buildLegacyState({ x: -940, y: -520, scale: 0.25 })
  );
  const { updateView } = useCanvasActions();
  const { view } = useCanvasState();

  return (
    <div>
      <AiPathsStateBridger state={legacyState} />
      <output data-testid='canvas-view'>{`${view.x},${view.y},${view.scale}`}</output>
      <button
        type='button'
        onClick={() => {
          updateView({ x: 111, y: 222 });
        }}
      >
        apply-pan
      </button>
      <button
        type='button'
        onClick={() => {
          setLegacyState(buildLegacyState({ x: -999, y: -888, scale: 0.4 }));
        }}
      >
        legacy-update
      </button>
    </div>
  );
}

describe('AI Paths state bridge canvas ownership', () => {
  it('does not overwrite CanvasContext view when legacy state updates', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialView={{ x: 0, y: 0, scale: 1 }}>
        <BridgeOwnershipHarness />
      </AiPathsProvider>
    );

    expect(getByTestId('canvas-view')).toHaveTextContent('0,0,1');

    fireEvent.click(getByRole('button', { name: 'apply-pan' }));

    await waitFor(() => {
      expect(getByTestId('canvas-view')).toHaveTextContent('111,222,1');
    });

    fireEvent.click(getByRole('button', { name: 'legacy-update' }));

    await waitFor(() => {
      expect(getByTestId('canvas-view')).toHaveTextContent('111,222,1');
    });
  });
});
