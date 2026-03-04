'use client';
import { useCallback, useEffect, useMemo } from 'react';

import type {
  Edge,
  PathMeta,
  PathConfig,
} from '@/shared/lib/ai-paths';
import { triggers } from '@/shared/lib/ai-paths';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';
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
import {
  useGraphActions,
  usePersistenceActions,
  usePersistenceState,
  useRuntimeState,
  useRuntimeActions,
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context';
import { useCoreSettingsState } from './hooks/state/useCoreSettingsState';
import { useExecutionSettingsState } from './hooks/state/useExecutionSettingsState';

import { useAiPathsNodeConfigActions } from './hooks/useAiPathsNodeConfigActions';
import { useAiPathsRuntimeManagement } from './hooks/useAiPathsRuntimeManagement';
import { usePaletteWithTriggerButtons } from './hooks/usePaletteWithTriggerButtons';
import { useAiPathsSettingsDerivedState } from './hooks/useAiPathsSettingsDerivedState';
import { useAiPathsErrorState } from './hooks/useAiPathsErrorState';

type AiPathsSettingsStateOptions = {
  activeTab: 'canvas' | 'paths' | 'docs';
};

import type { UseAiPathsSettingsStateReturn } from './types';

export function useAiPathsSettingsState({
  activeTab,
}: AiPathsSettingsStateOptions): UseAiPathsSettingsStateReturn {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { setPathName: setPathNameAction } = useGraphActions();
  const { selectedNodeId, configOpen, nodeConfigDirty } = useSelectionState();
  const { setNodeConfigDirty: setNodeConfigDirtyAction } = useSelectionActions();
  const { loading, loadNonce, isPathSwitching } = usePersistenceState();
  const { setOperationHandlers, incrementLoadNonce: incrementLoadNonceAction } =
    usePersistenceActions();
  const {
    setRunControlHandlers,
    setRuntimeNodeConfigHandlers,
    setParserSamples: setParserSamplesAction,
    setUpdaterSamples: setUpdaterSamplesAction,
  } = useRuntimeActions();
  const {
    runtimeState,
    parserSamples,
    updaterSamples,
    pathDebugSnapshots,
    lastRunAt,
    lastError,
  } = useRuntimeState();

  const normalizeTriggerLabel = (value?: string | null): string =>
    value === 'Product Modal - Context Grabber'
      ? 'Product Modal - Context Filter'
      : (value ?? triggers[0] ?? 'Product Modal - Context Filter');

  const {
    nodes,
    setEdges: setEdgesAction,
    edges,
    paths,
    pathConfigs,
    activePathId,
    isPathLocked,
    isPathActive,
    pathName,
    pathDescription,
    activeTrigger,
  } = useCoreSettingsState();

  const {
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidationState,
    historyRetentionPasses,
    historyRetentionOptionsMax,
  } = useExecutionSettingsState();

  const {
    validation,
    reportAiPathsError,
    persistLastError,
  } = useAiPathsErrorState({
    toast,
  });

  const nodeConfig = useAiPathsNodeConfigActions({
    selectedNodeId,
  });

  const runtimeMgmt = useAiPathsRuntimeManagement();

  const { confirmNodeSwitch } = useAiPathsNodeSwitchConfirm({
    configOpen,
    nodeConfigDirty,
    selectedNodeId,
    setNodeConfigDirty: setNodeConfigDirtyAction,
    confirm,
    toast,
  });

  const selectedNodeForPresets = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
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
    isPathSwitching,
    confirmNodeSwitch: (nextNodeId) => confirmNodeSwitch(nextNodeId),
    confirm,
    clearRuntimeInputsForEdges: runtimeMgmt.pruneRuntimeInputs,
    reportAiPathsError,
    toast,
    isPathLocked,
  });

  const {
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
    expandedPaletteGroups,
    paletteCollapsed,
    setPaletteCollapsed,
    togglePaletteGroup,
  } = useAiPathsPresets({
    nodes,
    edges,
    selectedNode: selectedNodeForPresets,
    isPathLocked,
    ensureNodeVisible,
    getCanvasCenterPosition,
    toast,
    confirm,
    reportAiPathsError,
  });

  const paletteWithTriggerButtons = usePaletteWithTriggerButtons();

  const {
    parserSampleLoading,
    updaterSampleLoading,
    handleFetchParserSample,
    handleFetchUpdaterSample,
  } = useAiPathsSettingsSamples({
    toast,
  });

  const {
    autoSaveStatus,
    autoSaveAt,
    saving,
    handleSave,
    persistActivePathPreference,
    persistPathSettings,
    persistSettingsBulk,
    savePathIndex,
  } = useAiPathsPersistence({
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
    normalizeTriggerLabel,
    reportAiPathsError,
    toast,
  });

  useEffect(() => {
    setOperationHandlers({ savePathConfig: handleSave });
    return () => {
      setOperationHandlers({});
    };
  }, [handleSave, setOperationHandlers]);

  const { selectedNode, pathFlagsById, autoSaveLabel, autoSaveClasses } =
    useAiPathsSettingsDerivedState({
      nodes,
      selectedNodeId,
      paths,
      pathConfigs,
      autoSaveStatus,
    });

  const persistPathSettingsVoid = useCallback(
    async (nextPaths: PathMeta[], configId: string, config: PathConfig): Promise<void> => {
      await persistPathSettings(nextPaths, configId, config);
    },
    [persistPathSettings]
  );

  useAiPathsRunHistory({
    activePathId,
    toast,
  });

  const handleCanonicalEdgesDetected = useCallback(
    (nextEdges: Edge[]): void => {
      setEdgesAction(nextEdges, {
        reason: 'update',
        source: 'runtime.edge-canonicalization',
      });
    },
    [setEdgesAction]
  );

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
    onCanonicalEdgesDetected: handleCanonicalEdgesDetected,
    reportAiPathsError,
    toast,
  });

  const cleanup = useAiPathsSettingsCleanupActions({
    activePathId,
    isPathLocked,
    toast,
    confirm,
    runtimeState,
    resetRuntimeDiagnostics: runtime.resetRuntimeDiagnostics,
    edges,
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
    paths,
    persistPathSettings: persistPathSettingsVoid,
    reportAiPathsError,
    pruneRuntimeInputs: (_state, removed, remaining) => {
      return pruneRuntimeInputsState(
        _state,
        removed as unknown as Edge[],
        remaining as unknown as Edge[]
      );
    },
  });

  useEffect(() => {
    if (typeof setRunControlHandlers !== 'function') return;
    setRunControlHandlers({
      fireTrigger: runtime.handleFireTrigger,
      fireTriggerPersistent: runtime.handleFireTriggerPersistent,
      pauseActiveRun: runtime.handlePauseRun,
      resumeActiveRun: runtime.handleResumeRun,
      stepActiveRun: runtime.handleStepRun,
      cancelActiveRun: runtime.handleCancelRun,
      clearWires: cleanup.handleClearWires,
    });
    return () => {
      setRunControlHandlers({});
    };
  }, [
    cleanup.handleClearWires,
    runtime.handleCancelRun,
    runtime.handleFireTrigger,
    runtime.handleFireTriggerPersistent,
    runtime.handlePauseRun,
    runtime.handleResumeRun,
    runtime.handleStepRun,
    setRunControlHandlers,
  ]);

  useEffect(() => {
    if (typeof setRuntimeNodeConfigHandlers !== 'function') return;
    setRuntimeNodeConfigHandlers({
      fetchParserSample: handleFetchParserSample,
      fetchUpdaterSample: handleFetchUpdaterSample,
      runSimulation: runtime.handleRunSimulation,
      sendToAi: runtime.handleSendToAi,
    });
    return () => {
      setRuntimeNodeConfigHandlers({});
    };
  }, [
    handleFetchParserSample,
    handleFetchUpdaterSample,
    runtime.handleRunSimulation,
    runtime.handleSendToAi,
    setRuntimeNodeConfigHandlers,
  ]);

  const pathActions = useAiPathsSettingsPathActions({
    activePathId,
    isPathLocked,
    pathConfigs,
    paths,
    normalizeTriggerLabel,
    persistPathSettings: persistPathSettingsVoid,
    persistSettingsBulk,
    persistActivePathPreference,
    reportAiPathsError,
    toast,
    confirm,
  });

  const modeActions = useAiPathsSettingsModeActions({
    activePathId,
    isPathLocked,
    isPathActive,
    activeTrigger,
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    historyRetentionPasses,
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
    persistPathSettings: persistPathSettingsVoid,
    persistSettingsBulk,
    reportAiPathsError,
    toast,
  });

  const docsActions = useAiPathsSettingsDocsActions({
    toast,
    reportAiPathsError,
  });

  const incrementLoadNonce = useCallback((): void => {
    incrementLoadNonceAction();
  }, [incrementLoadNonceAction]);

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
    autoSaveStatus,
    autoSaveAt,
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
    edges,
    paths,
    activePathId,
    isPathLocked,
    isPathActive,
    pathName,
    pathDescription,
    activeTrigger,
    triggers,
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    historyRetentionPasses,
    historyRetentionOptionsMax,
    // Loading / Saving
    loading,
    isPathSwitching,
    saving,
    // Samples
    parserSamples,
    setParserSamples: setParserSamplesAction,
    parserSampleLoading,
    updaterSamples,
    setUpdaterSamples: setUpdaterSamplesAction,
    updaterSampleLoading,
    // Run / Error
    lastRunAt,
    lastError,
    pathDebugSnapshots,
    // UI State
    selectedNodeId,
    nodeConfigDirty,
    incrementLoadNonce,
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
    // Cleanup
    ...cleanup,
    // Path actions
    ...pathActions,
    // Mode actions (handleTogglePathLock, handleTogglePathActive, handleExecutionModeChange, etc.)
    ...modeActions,
    // Persistence
    handleSave,
    persistActivePathPreference,
    persistPathSettings: persistPathSettingsVoid,
    persistSettingsBulk,
    savePathIndex,
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
    updateActivePathMeta: (name: string) => {
      setPathNameAction(name);
    },
    // Confirm modal
    ConfirmationModal,
    confirmNodeSwitch,
    // Toast
    toast,
  };
}
