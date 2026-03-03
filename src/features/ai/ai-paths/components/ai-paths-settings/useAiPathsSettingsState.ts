'use client';
import { useCallback, useMemo } from 'react';

import type {
  AiNode,
  Edge,
  NodeDefinition,
  RuntimeState,
  PathMeta,
  PathConfig,
} from '@/shared/lib/ai-paths';
import {
  palette,
  derivePaletteNodeTypeId,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  triggers,
  triggerButtonsApi,
} from '@/shared/lib/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast, type Toast } from '@/shared/ui';
import { pruneRuntimeInputsState } from '@/features/ai/ai-paths/logic/runtime-pruning';

import { useAiPathsCanvasInteractions } from './useAiPathsCanvasInteractions';
import { useAiPathsNodeSwitchConfirm } from './useAiPathsNodeSwitchConfirm';
import { useAiPathsPersistence } from './useAiPathsPersistence';
import { useAiPathsPresets } from './useAiPathsPresets';
import { useAiPathsRunHistory } from './useAiPathsRunHistory';
import { useAiPathsRuntime } from './useAiPathsRuntime';
import { useAiPathsSettingsCleanupActions } from './useAiPathsSettingsCleanupActions';
import { useAiPathsSettingsDocsActions } from './useAiPathsSettingsDocsActions';
import { useAiPathsSettingsModeActions } from './useAiPathsSettingsModeActions';
import { useAiPathsSettingsPathActions } from './useAiPathsSettingsPathActions';
import { useAiPathsSettingsSamples } from './useAiPathsSettingsSamples';
import {
  DOCS_OVERVIEW_SNIPPET,
  DOCS_WIRING_SNIPPET,
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
} from './docs-snippets';
import { useCoreSettingsState } from './hooks/state/useCoreSettingsState';
import { useExecutionSettingsState } from './hooks/state/useExecutionSettingsState';
import { useUiSettingsState } from './hooks/state/useUiSettingsState';

import { useAiPathsValidationActions } from './hooks/useAiPathsValidationActions';
import { useAiPathsNodeConfigActions } from './hooks/useAiPathsNodeConfigActions';
import { useAiPathsRuntimeManagement } from './hooks/useAiPathsRuntimeManagement';

type AiPathsSettingsStateOptions = {
  activeTab: 'canvas' | 'paths' | 'docs';
};

import type { UseAiPathsSettingsStateReturn } from './types';

export function useAiPathsSettingsState({
  activeTab,
}: AiPathsSettingsStateOptions): UseAiPathsSettingsStateReturn {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();

  const normalizeTriggerLabel = (value?: string | null): string =>
    value === 'Product Modal - Context Grabber'
      ? 'Product Modal - Context Filter'
      : (value ?? triggers[0] ?? 'Product Modal - Context Filter');

  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    paths,
    setPaths,
    pathConfigs,
    setPathConfigs,
    activePathId,
    setActivePathId,
    isPathLocked,
    setIsPathLocked,
    isPathActive,
    setIsPathActive,
    pathName,
    setPathName,
    pathDescription,
    setPathDescription,
    activeTrigger,
    setActiveTrigger,
  } = useCoreSettingsState();

  const {
    executionMode,
    setExecutionMode,
    flowIntensity,
    setFlowIntensity,
    runMode,
    setRunMode,
    strictFlowMode,
    setStrictFlowMode,
    blockedRunPolicy,
    setBlockedRunPolicy,
    aiPathsValidationState,
    setAiPathsValidationState,
    historyRetentionPasses,
    setHistoryRetentionPasses,
    historyRetentionOptionsMax,
    setHistoryRetentionOptionsMax,
    parserSamples,
    setParserSamples,
    updaterSamples,
    setUpdaterSamples,
    pathDebugSnapshots,
    setPathDebugSnapshots,
    lastRunAt,
    setLastRunAt,
    lastError,
    setLastError,
    runtimeState,
    setRuntimeState,
  } = useExecutionSettingsState();

  const {
    loading,
    setLoading,
    selectedNodeId,
    setSelectedNodeId,
    configOpen,
    setConfigOpen,
    nodeConfigDirty,
    setNodeConfigDirty,
    loadNonce,
    setLoadNonce,
    simulationOpenNodeId,
    setSimulationOpenNodeId,
  } = useUiSettingsState();

  const setLastErrorString = useCallback(
    (error: string | null): void => {
      setLastError(error ? { message: error, time: new Date().toISOString() } : null);
    },
    [setLastError]
  );

  const validation = useAiPathsValidationActions({
    setAiPathsValidation: setAiPathsValidationState,
    setLastError: setLastErrorString,
    toast: toast as unknown as Toast,
  });

  const reportAiPathsError = useCallback(
    (error: unknown, context: Record<string, unknown>, fallbackMessage?: string): void => {
      validation.reportAiPathsError(error, context, fallbackMessage);
    },
    [validation.reportAiPathsError]
  );

  const persistLastError = useCallback(
    async (
      payload: { message: string; time: string; pathId?: string | null } | null
    ): Promise<void> => {
      await validation.persistLastError(payload?.message ?? null);
    },
    [validation.persistLastError]
  );

  const nodeConfig = useAiPathsNodeConfigActions({
    selectedNodeId,
    setNodes,
  });

  const runtimeMgmt = useAiPathsRuntimeManagement({
    setRuntimeState,
  });

  const { confirmNodeSwitch } = useAiPathsNodeSwitchConfirm({
    configOpen,
    nodeConfigDirty,
    selectedNodeId,
    setNodeConfigDirty,
    confirm,
    toast,
  });

  const selectedNode = useMemo(
    (): AiNode | null => nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const {
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    ensureNodeVisible,
    getCanvasCenterPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStartConnection,
    handleCompleteConnection,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleReconnectInput,
    handleRemoveEdge,
    handleDisconnectPort,
    handleDeleteSelectedNode,
    handleSelectEdge,
    handleSelectNode,
    zoomTo,
    fitToNodes,
    resetView,
  } = useAiPathsCanvasInteractions({
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedNodeId,
    setSelectedNodeId,
    confirmNodeSwitch: (nextNodeId) => confirmNodeSwitch(nextNodeId),
    confirm,
    clearRuntimeInputsForEdges: runtimeMgmt.pruneRuntimeInputs,
    reportAiPathsError,
    toast,
    isPathLocked,
  });

  const {
    clusterPresets,
    setClusterPresets,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    editingPresetId,
    presetDraft,
    setPresetDraft,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleApplyPreset,
    handleExportPresets,
    handleImportPresets,
    handlePresetFromSelection,
    handleResetPresetDraft,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    expandedPaletteGroups,
    setExpandedPaletteGroups,
    paletteCollapsed,
    setPaletteCollapsed,
    togglePaletteGroup,
    normalizeDbQueryPreset,
    normalizeDbNodePreset,
  } = useAiPathsPresets({
    nodes,
    edges,
    selectedNode,
    isPathLocked,
    setNodes,
    setEdges,
    setSelectedNodeId,
    ensureNodeVisible,
    getCanvasCenterPosition,
    toast,
    confirm,
    reportAiPathsError,
  });

  const triggerButtonsQuery = createListQueryV2<AiTriggerButtonRecord[], AiTriggerButtonRecord[]>({
    queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: async () => {
      const response = await triggerButtonsApi.list({ entityType: 'custom' });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    meta: {
      source: 'ai.ai-paths.settings.trigger-buttons',
      operation: 'list',
      resource: 'aiPaths.triggerButtons',
      domain: 'global',
    },
  });

  const paletteWithTriggerButtons = useMemo<NodeDefinition[]>(() => {
    const buttons = (triggerButtonsQuery.data ?? [])
      .filter((button: AiTriggerButtonRecord): boolean => button.enabled !== false)
      .reduce((acc: AiTriggerButtonRecord[], button: AiTriggerButtonRecord) => {
        if (!button.id || acc.some((item: AiTriggerButtonRecord) => item.id === button.id)) {
          return acc;
        }
        acc.push(button);
        return acc;
      }, []);
    if (buttons.length === 0) return palette;

    const usedTitles = new Set<string>(palette.map((node: NodeDefinition) => node.title));
    const derived: NodeDefinition[] = [];
    buttons.forEach((button: AiTriggerButtonRecord) => {
      const nameLabel = button.name.trim();
      const displayLabel = button.display.label.trim();
      const label = nameLabel || displayLabel;
      if (!label) return;

      const baseTitle = `Trigger: ${label}`;
      let title = baseTitle;
      let suffix = 2;
      while (usedTitles.has(title)) {
        title = `${baseTitle} (${suffix})`;
        suffix += 1;
      }
      usedTitles.add(title);
      const triggerConfig = { trigger: { event: button.id } };
      derived.push({
        type: 'trigger',
        nodeTypeId: derivePaletteNodeTypeId({
          type: 'trigger',
          title,
          config: triggerConfig,
        }),
        title,
        description: `User trigger button: ${label} (${button.id}).`,
        inputs: TRIGGER_INPUT_PORTS,
        outputs: TRIGGER_OUTPUT_PORTS,
        config: triggerConfig,
      });
    });

    return [...palette, ...derived];
  }, [triggerButtonsQuery.data, palette]);

  const {
    parserSampleLoading,
    updaterSampleLoading,
    handleFetchParserSample,
    handleFetchUpdaterSample,
  } = useAiPathsSettingsSamples({
    setParserSamples,
    setUpdaterSamples,
    toast,
  });

  const persistence = useAiPathsPersistence({
    activePathId,
    activeTrigger,
    edges,
    expandedPaletteGroups,
    isPathActive,
    isPathLocked,
    lastRunAt,
    loadNonce,
    loading,
    nodes,
    paletteCollapsed,
    parserSamples,
    pathConfigs,
    pathDescription,
    pathName,
    paths,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    selectedNodeId,
    runtimeState,
    updaterSamples,
    executionMode,
    flowIntensity,
    normalizeDbNodePreset,
    normalizeDbQueryPreset,
    normalizeTriggerLabel,
    persistLastError,
    reportAiPathsError,
    setActivePathId,
    setActiveTrigger,
    setClusterPresets,
    setDbNodePresets,
    setDbQueryPresets,
    setEdges,
    setExpandedPaletteGroups,
    setLastError,
    setLastRunAt,
    setLoading,
    setIsPathActive,
    setIsPathLocked,
    setNodes,
    setPaletteCollapsed,
    setParserSamples,
    setPathConfigs,
    setPathDebugSnapshots,
    setPathDescription,
    setExecutionMode,
    setFlowIntensity,
    setRunMode,
    setStrictFlowMode,
    setBlockedRunPolicy,
    setAiPathsValidation: setAiPathsValidationState,
    setHistoryRetentionPasses,
    setHistoryRetentionOptionsMax,
    setPathName,
    setPaths,
    setRuntimeState,
    setConfigOpen,
    setSelectedNodeId,
    setUpdaterSamples,
    toast,
  });

  const persistPathSettingsVoid = useCallback(
    async (nextPaths: PathMeta[], configId: string, config: PathConfig): Promise<void> => {
      await persistence.persistPathSettings(nextPaths, configId, config);
    },
    [persistence.persistPathSettings]
  );

  const pathFlagsById = useMemo(
    () =>
      paths.reduce(
        (acc, path) => {
          const config = pathConfigs[path.id];
          acc[path.id] = {
            isLocked: config?.isLocked ?? false,
            isActive: config?.isActive ?? true,
          };
          return acc;
        },
        {} as Record<string, { isLocked: boolean; isActive: boolean }>
      ),
    [paths, pathConfigs]
  );

  const runHistory = useAiPathsRunHistory({
    activePathId,
    toast,
  });

  const runtime = useAiPathsRuntime({
    activePathId,
    pathName,
    pathDescription,
    activeTab,
    activeTrigger,
    executionMode,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    historyRetentionPasses,
    isPathActive,
    nodes,
    edges,
    runtimeState,
    parserSamples,
    updaterSamples,
    setRuntimeState,
    setPathConfigs,
    setPathDebugSnapshots,
    setLastRunAt,
    reportAiPathsError,
    toast,
  });

  const cleanup = useAiPathsSettingsCleanupActions({
    activePathId,
    isPathLocked,
    toast,
    confirm,
    runtimeState,
    setRuntimeState,
    resetRuntimeDiagnostics: runtime.resetRuntimeDiagnostics,
    edges,
    setEdges,
    nodes,
    pathName,
    pathDescription,
    activeTrigger,
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    isPathActive,
    parserSamples,
    updaterSamples,
    lastRunAt,
    selectedNodeId,
    configOpen,
    pathConfigs,
    setPathConfigs,
    paths,
    persistPathSettings: persistPathSettingsVoid,
    reportAiPathsError,
    pruneRuntimeInputs: (_state, removed, remaining) => {
      return pruneRuntimeInputsState(_state, removed as unknown as Edge[], remaining as unknown as Edge[]);
    },
  });

  const pathActions = useAiPathsSettingsPathActions({
    activePathId,
    setActivePathId,
    isPathLocked,
    pathConfigs,
    setPathConfigs,
    paths,
    setPaths,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setLastRunAt,
    setRuntimeState,
    setParserSamples,
    setUpdaterSamples,
    setExecutionMode,
    setFlowIntensity,
    setRunMode,
    setStrictFlowMode,
    setBlockedRunPolicy,
    setAiPathsValidation: setAiPathsValidationState,
    setPathName,
    setPathDescription,
    setActiveTrigger,
    setIsPathActive,
    setIsPathLocked,
    setConfigOpen,
    normalizeTriggerLabel,
    updateActivePathMeta: (name: string) => setPathName(name),
    persistPathSettings: persistPathSettingsVoid,
    persistSettingsBulk: persistence.persistSettingsBulk,
    persistActivePathPreference: persistence.persistActivePathPreference,
    reportAiPathsError,
    toast,
    confirm,
  });

  const modeActions = useAiPathsSettingsModeActions({
    activePathId,
    isPathLocked,
    isPathActive,
    setIsPathLocked,
    setIsPathActive,
    activeTrigger,
    executionMode,
    setExecutionMode,
    flowIntensity,
    setFlowIntensity,
    runMode,
    setRunMode,
    strictFlowMode,
    setStrictFlowMode,
    blockedRunPolicy,
    setBlockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    historyRetentionPasses,
    setHistoryRetentionPasses,
    nodes,
    edges,
    pathName,
    pathDescription,
    parserSamples,
    updaterSamples,
    runtimeState,
    lastRunAt,
    selectedNodeId,
    pathConfigs,
    paths,
    setPaths,
    setPathConfigs,
    persistPathSettings: persistPathSettingsVoid,
    persistSettingsBulk: persistence.persistSettingsBulk,
    reportAiPathsError,
    toast,
  });

  const docsActions = useAiPathsSettingsDocsActions({
    toast,
    reportAiPathsError,
  });

  const autoSaveLabel = useMemo((): string => {
    switch (persistence.autoSaveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save error';
      default:
        return '';
    }
  }, [persistence.autoSaveStatus]);

  const autoSaveClasses = useMemo((): string => {
    switch (persistence.autoSaveStatus) {
      case 'saving':
        return 'text-yellow-500';
      case 'saved':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return '';
    }
  }, [persistence.autoSaveStatus]);

  return {
    // Docs
    docsOverviewSnippet: DOCS_OVERVIEW_SNIPPET,
    docsWiringSnippet: DOCS_WIRING_SNIPPET,
    docsDescriptionSnippet: DOCS_DESCRIPTION_SNIPPET,
    docsJobsSnippet: DOCS_JOBS_SNIPPET,
    // Docs actions
    ...docsActions,
    // AutoSave
    autoSaveLabel,
    autoSaveClasses,
    autoSaveStatus: persistence.autoSaveStatus,
    autoSaveAt: persistence.autoSaveAt,
    // Canvas
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    // Graph
    nodes,
    setNodes,
    edges,
    setEdges,
    paths,
    activePathId,
    isPathLocked,
    isPathActive,
    pathName,
    setPathName,
    pathDescription,
    setPathDescription,
    activeTrigger,
    triggers,
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    setAiPathsValidation: setAiPathsValidationState,
    historyRetentionPasses,
    historyRetentionOptionsMax,
    // Loading / Saving
    loading,
    saving: persistence.saving,
    // Samples
    parserSamples,
    setParserSamples,
    parserSampleLoading,
    updaterSamples,
    setUpdaterSamples,
    updaterSampleLoading,
    // Run / Error
    lastRunAt,
    lastError,
    setLastError,
    pathDebugSnapshots,
    // UI State
    selectedNodeId,
    configOpen,
    setConfigOpen,
    nodeConfigDirty,
    setNodeConfigDirty,
    setLoadNonce,
    simulationOpenNodeId,
    setSimulationOpenNodeId,
    selectedNode,
    // Path flags
    pathConfigs,
    pathFlagsById,
    // Palette
    palette: paletteWithTriggerButtons,
    paletteCollapsed,
    setPaletteCollapsed,
    expandedPaletteGroups,
    togglePaletteGroup,
    // Presets
    clusterPresets,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    editingPresetId,
    presetDraft,
    setPresetDraft,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleApplyPreset,
    handleExportPresets,
    handleImportPresets,
    handlePresetFromSelection,
    handleResetPresetDraft,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    // Validation
    ...validation,
    persistLastError,
    reportAiPathsError,
    // Node config
    ...nodeConfig,
    // Runtime management
    ...runtimeMgmt,
    // Run history
    runsQuery: runHistory.runsQuery,
    runList: runHistory.runList,
    runFilter: runHistory.runFilter,
    setRunFilter: runHistory.setRunFilter,
    expandedRunHistory: runHistory.expandedRunHistory,
    setExpandedRunHistory: runHistory.setExpandedRunHistory,
    runHistorySelection: runHistory.runHistorySelection,
    setRunHistorySelection: runHistory.setRunHistorySelection,
    handleOpenRunDetail: runHistory.handleOpenRunDetail,
    handleResumeRun: runHistory.handleResumeRun,
    handleCancelRun: runHistory.handleCancelRun,
    handleRequeueDeadLetter: runHistory.handleRequeueDeadLetter,
    runDetailOpen: runHistory.runDetailOpen,
    setRunDetailOpen: runHistory.setRunDetailOpen,
    runDetailLoading: runHistory.runDetailLoading,
    runDetail: runHistory.runDetail,
    setRunDetail: runHistory.setRunDetail,
    runStreamStatus: runHistory.runStreamStatus,
    runStreamPaused: runHistory.runStreamPaused,
    setRunStreamPaused: runHistory.setRunStreamPaused,
    runNodeSummary: runHistory.runNodeSummary,
    runEventsOverflow: runHistory.runEventsOverflow,
    runEventsBatchLimit: runHistory.runEventsBatchLimit,
    runDetailHistoryOptions: runHistory.runDetailHistoryOptions,
    runDetailSelectedHistoryNodeId: runHistory.runDetailSelectedHistoryNodeId,
    setRunHistoryNodeId: runHistory.setRunHistoryNodeId,
    runDetailSelectedHistoryEntries: runHistory.runDetailSelectedHistoryEntries,
    // Cleanup
    ...cleanup,
    // Path actions
    ...pathActions,
    // Mode actions (handleTogglePathLock, handleTogglePathActive, handleExecutionModeChange, etc.)
    ...modeActions,
    // Persistence
    handleSave: persistence.handleSave,
    persistActivePathPreference: persistence.persistActivePathPreference,
    persistPathSettings: persistPathSettingsVoid,
    persistRuntimePathState: persistence.persistRuntimePathState as unknown as (
      pathId: string,
      runtimeState: RuntimeState
    ) => Promise<void>,
    persistSettingsBulk: persistence.persistSettingsBulk,
    savePathIndex: persistence.savePathIndex,
    // Samples fetch
    handleFetchParserSample,
    handleFetchUpdaterSample,
    // Canvas interactions
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStartConnection,
    handleCompleteConnection,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleReconnectInput,
    handleRemoveEdge,
    handleDisconnectPort,
    handleDeleteSelectedNode,
    handleSelectEdge,
    handleSelectNode,
    zoomTo,
    fitToNodes,
    resetView,
    ensureNodeVisible,
    getCanvasCenterPosition,
    // Runtime
    runtimeState,
    handleRunSimulation: runtime.handleRunSimulation,
    handleFireTrigger: runtime.handleFireTrigger,
    handleFireTriggerPersistent: runtime.handleFireTriggerPersistent,
    handlePauseActiveRun: runtime.handlePauseRun,
    handleResumeActiveRun: runtime.handleResumeRun,
    handleStepActiveRun: runtime.handleStepRun,
    handleCancelActiveRun: runtime.handleCancelRun,
    runtimeRunStatus: runtime.runStatus,
    runtimeNodeStatuses: runtime.runtimeNodeStatuses,
    runtimeEvents: runtime.runtimeEvents,
    nodeDurations: runtime.nodeDurations,
    clearNodeCache: runtime.clearNodeCache,
    handleSendToAi: runtime.handleSendToAi,
    sendingToAi: runtime.sendingToAi,
    lastGraphModelPayload: null,
    // Path meta
    updateActivePathMeta: (name: string) => setPathName(name),
    // Confirm modal
    ConfirmationModal,
    confirmNodeSwitch,
    // Toast
    toast,
  };
}
