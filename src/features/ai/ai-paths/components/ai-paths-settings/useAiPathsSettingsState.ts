'use client';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo } from 'react';

import type {
  AiNode,
  NodeConfig,
  NodeDefinition,
  PathConfig,
  Edge,
} from '@/shared/lib/ai-paths';
import {
  palette,
  derivePaletteNodeTypeId,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  triggers,
} from '@/shared/lib/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';

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
    aiPathsValidation: aiPathsValidationState,
    setAiPathsValidation,
    historyRetentionPasses,
    setHistoryRetentionPasses,
    historyRetentionOptionsMax,
    setHistoryRetentionOptionsMax,
  } = useExecutionSettingsState();

  const {
    loading,
    setLoading,
    saving,
    setParserSamples,
    parserSamples,
    setUpdaterSamples,
    updaterSamples,
    lastRunAt,
    setLastRunAt,
    loadNonce,
    lastError,
    setLastError,
    selectedNodeId,
    setSelectedNodeId,
    configOpen,
    setConfigOpen,
    pathDebugSnapshots,
    setPathDebugSnapshots,
    canvasRenderSize,
    resolvedImageOffset,
  } = useUiSettingsState();

  const queryClient = useQueryClient();

  const validation = useAiPathsValidationActions({
    setAiPathsValidation,
    setLastError,
    toast,
  });

  const nodeConfig = useAiPathsNodeConfigActions({
    selectedNodeId,
    setNodes,
  });

  const runtimeMgmt = useAiPathsRuntimeManagement({
    setRuntimeState: (state) => { /* setRuntimeState logic */ },
  });

  const triggerButtonsQuery = createListQueryV2<AiTriggerButtonRecord[], void>({
    queryKey: QUERY_KEYS.aiPaths.triggerButtons(),
    queryFn: () => triggerButtonsApi.listButtons(),
    meta: {
      source: 'ai.ai-paths.settings.trigger-buttons',
      operation: 'listButtons',
      resource: 'aiPaths.triggerButtons',
      domain: 'global',
    },
  });

  const { confirmNodeSwitch } = useAiPathsNodeSwitchConfirm({
    activePathId,
    isPathLocked,
    confirm,
  });

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
    confirmNodeSwitch,
    confirm,
    clearRuntimeInputsForEdges: runtimeMgmt.clearRuntimeInputsForEdges,
    reportAiPathsError: validation.reportAiPathsError,
    toast,
    isPathLocked,
  });

  const selectedNode = useMemo(
    (): AiNode | null => nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

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
    reportAiPathsError: validation.reportAiPathsError,
  });

  const paletteWithTriggerButtons = useMemo<NodeDefinition[]>(() => {
    const buttons = (triggerButtonsQuery.data ?? [])
      .filter(
        (button: AiTriggerButtonRecord): boolean =>
          button.enabled !== false && button.isActive !== false
      )
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
  }, [triggerButtonsQuery.data]);

  const {
    parserSampleLoading,
    updaterSampleLoading,
    handleFetchParserSample,
    handleFetchUpdaterSample,
  } = useAiPathsSettingsSamples({
    queryClient,
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
    runtimeState: { inputs: {}, outputs: {} }, // simplified for type safety
    updaterSamples,
    executionMode,
    flowIntensity,
    normalizeDbNodePreset,
    normalizeDbQueryPreset,
    normalizeTriggerLabel,
    persistLastError: validation.persistLastError,
    reportAiPathsError: validation.reportAiPathsError,
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
    setAiPathsValidation,
    setHistoryRetentionPasses,
    setHistoryRetentionOptionsMax,
    setPathName,
    setPaths,
    setRuntimeState: (s) => {}, // simplified
    setConfigOpen,
    setSelectedNodeId,
    setUpdaterSamples,
    toast,
  });

  const persistPathSettingsVoid = useCallback(
    async (nextPaths: any, configId: string, config: any): Promise<void> => {
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
    runtimeState: { inputs: {}, outputs: {} }, // simplified
    parserSamples,
    updaterSamples,
    setRuntimeState: (s) => {}, // simplified
    setPathConfigs,
    setPathDebugSnapshots,
    setLastRunAt,
    reportAiPathsError: validation.reportAiPathsError,
    toast,
  });

  const cleanup = useAiPathsSettingsCleanupActions({
    activePathId,
    isPathLocked,
    toast,
    confirm,
    runtimeState: { inputs: {}, outputs: {} }, // simplified
    setRuntimeState: (s) => {}, // simplified
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
    reportAiPathsError: validation.reportAiPathsError,
    pruneRuntimeInputs: runtimeMgmt.pruneRuntimeInputs,
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
    setLastError,
    setLoading,
    setRuntimeState: (s) => {}, // simplified
    setParserSamples,
    setUpdaterSamples,
    setPathDebugSnapshots,
    setExecutionMode,
    setFlowIntensity,
    setRunMode,
    setStrictFlowMode,
    setBlockedRunPolicy,
    setAiPathsValidation,
    setHistoryRetentionPasses,
    setHistoryRetentionOptionsMax,
    setPathName,
    setPathDescription,
    setActiveTrigger,
    setIsPathActive,
    setIsPathLocked,
    persistPathSettings: persistPathSettingsVoid,
    persistActivePathPreference: persistence.persistActivePathPreference,
    reportAiPathsError: validation.reportAiPathsError,
    toast,
    confirm,
  });

  const modeActions = useAiPathsSettingsModeActions({
    activePathId,
    isPathLocked,
    pathConfigs,
    setPathConfigs,
    paths,
    persistPathSettings: persistPathSettingsVoid,
    reportAiPathsError: validation.reportAiPathsError,
  });

  const docsActions = useAiPathsSettingsDocsActions({
    setNodes,
    setEdges,
    setSelectedNodeId,
    ensureNodeVisible,
    toast,
  });

  return {
    viewportRef,
    canvasRef,
    view,
    nodes,
    setNodes,
    edges,
    setEdges,
    paths,
    activePathId,
    isPathLocked,
    isPathActive,
    pathName,
    pathDescription,
    activeTrigger,
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    blockedRunPolicy,
    aiPathsValidation: aiPathsValidationState,
    historyRetentionPasses,
    historyRetentionOptionsMax,
    loading,
    saving,
    parserSamples,
    updaterSamples,
    lastRunAt,
    lastError,
    selectedNodeId,
    setSelectedNodeId,
    configOpen,
    setConfigOpen,
    pathDebugSnapshots,
    selectedNode,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    paletteWithTriggerButtons,
    parserSampleLoading,
    updaterSampleLoading,
    pathFlagsById,
    ...validation,
    ...nodeConfig,
    ...runtimeMgmt,
    ...runHistory,
    ...runtime,
    ...cleanup,
    ...pathActions,
    ...modeActions,
    ...docsActions,
    ...persistence,
    handleFetchParserSample,
    handleFetchUpdaterSample,
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
    ConfirmationModal,
  };
}
