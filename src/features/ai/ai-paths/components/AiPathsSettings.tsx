'use client';

import React from 'react';

import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';

import { AiPathsProvider, useStateBridgeAll } from '../context';
import { AiPathsSettingsOrchestratorProvider } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';
import {
  AiPathsSettingsPageProvider,
  useAiPathsSettingsPageContext,
  type AiPathsSettingsPageContextValue,
} from './ai-paths-settings/AiPathsSettingsPageContext';
import { AiPathsSettingsView } from './ai-paths-settings/AiPathsSettingsView';
import { useAiPathsSettingsState } from './ai-paths-settings/useAiPathsSettingsState';
import { 
  evaluateDataContractPreflight, 
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
  sortPathMetas,
  runsApi,
} from '../lib';
import { buildSwitchPathOptions } from './ai-paths-settings/ai-paths-settings-view-utils';

export type AiPathsSettingsProps = {
  activeTab: 'canvas' | 'paths' | 'docs';
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: 'canvas' | 'paths' | 'docs') => void) | undefined;
  isFocusMode?: boolean | undefined;
  onFocusModeChange?: ((next: boolean) => void) | undefined;
};

export function AiPathsSettings(props: AiPathsSettingsProps): React.JSX.Element {
  return (
    <AppErrorBoundary source='AiPathsSettings'>
      <AiPathsProvider>
        <AiPathsSettingsInnerOrchestrator {...props} />
      </AiPathsProvider>
    </AppErrorBoundary>
  );
}

function AiPathsSettingsInnerOrchestrator(props: AiPathsSettingsProps): React.JSX.Element {
  const state = useAiPathsSettingsState({ activeTab: props.activeTab });
  
  const [pathSettingsModalOpen, setPathSettingsModalOpen] = React.useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = React.useState(false);
  const [selectionScopeMode, setSelectionScopeMode] = React.useState<'portion' | 'wiring'>('portion');
  const [dataContractInspectorNodeId, setDataContractInspectorNodeId] = React.useState<string | null>(null);
  const [isPathNameEditing, setIsPathNameEditing] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState('');

  const normalizedAiPathsValidation = React.useMemo(
    () => normalizeAiPathsValidationConfig(state.aiPathsValidation),
    [state.aiPathsValidation]
  );

  const validationPreflightReport = React.useMemo(
    () => evaluateAiPathsValidationPreflight({
      nodes: state.nodes,
      edges: state.edges,
      config: normalizedAiPathsValidation,
    }),
    [state.nodes, state.edges, normalizedAiPathsValidation]
  );

  const dataContractReport = React.useMemo(
    () => evaluateDataContractPreflight({
      nodes: state.nodes,
      edges: state.edges,
      runtimeState: state.runtimeState,
      mode: 'light',
      scopeMode: normalizedAiPathsValidation.enabled !== false ? 'full' : 'reachable_from_roots',
    }),
    [state.nodes, state.edges, state.runtimeState, normalizedAiPathsValidation.enabled]
  );

  const pathSwitchOptions = React.useMemo(
    () => buildSwitchPathOptions(sortPathMetas(state.paths)),
    [state.paths]
  );

  const autoSaveVariant = React.useMemo(() => {
    switch (state.autoSaveStatus) {
      case 'saved': return 'success';
      case 'saving': return 'processing';
      case 'error': return 'error';
      default: return 'neutral';
    }
  }, [state.autoSaveStatus]);

  const handleInspectTraceNode = React.useCallback(async (nodeId: string, focus: 'all' | 'failed'): Promise<void> => {
    const targetNodeId = nodeId.trim();
    if (!targetNodeId) return;
    
    const baseOptions = {
      ...(state.activePathId ? { pathId: state.activePathId } : {}),
      nodeId: targetNodeId,
      limit: 1,
      offset: 0,
    };

    let runId: string | null = null;
    if (focus === 'failed') {
      const result = await runsApi.list({ ...baseOptions, status: 'failed' });
      if (result.ok && result.data?.runs?.[0]?.id) {
        runId = result.data.runs[0].id;
      }
    }

    if (!runId) {
      const result = await runsApi.list(baseOptions);
      if (result.ok && result.data?.runs?.[0]?.id) {
        runId = result.data.runs[0].id;
      }
    }

    if (runId) {
      state.setRunHistoryNodeId(targetNodeId);
      state.setRunFilter(focus);
      void state.handleOpenRunDetail(runId);
    }
  }, [state]);

  const pageContextValue = React.useMemo<AiPathsSettingsPageContextValue>(
    () => ({
      ...props,
      ...state,
      pathSettingsModalOpen,
      setPathSettingsModalOpen,
      simulationModalOpen,
      setSimulationModalOpen,
      savePathConfig: state.handleSave,
      validationPreflightReport,
      nodeConfigDirty: state.nodeConfigDirty,
      selectedNodeIds: state.selectedNodeId ? [state.selectedNodeId] : [],
      selectionScopeMode,
      setSelectionScopeMode,
      dataContractReport,
      setDataContractInspectorNodeId,
      autoSaveVariant: autoSaveVariant as any,
      isPathNameEditing,
      renameDraft,
      setRenameDraft,
      commitPathNameEdit: () => {
        if (!state.activePathId) return;
        state.setPathName(renameDraft);
        void state.handleSave({ pathNameOverride: renameDraft });
        setIsPathNameEditing(false);
      },
      cancelPathNameEdit: () => {
        setRenameDraft(state.pathName);
        setIsPathNameEditing(false);
      },
      startPathNameEdit: () => {
        setRenameDraft(state.pathName);
        setIsPathNameEditing(true);
      },
      pathSwitchOptions,
      hasHistory: state.runtimeEvents.length > 0,
      handleInspectTraceNode,
    }),
    [props, state, pathSettingsModalOpen, simulationModalOpen, selectionScopeMode, validationPreflightReport, dataContractReport, autoSaveVariant, isPathNameEditing, renameDraft, pathSwitchOptions, handleInspectTraceNode]
  );

  // Sync state to domain contexts
  useStateBridgeAll({
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
    configOpen: state.configOpen,
    nodeConfigDirty: state.nodeConfigDirty,
    simulationOpenNodeId: state.simulationOpenNodeId,
    view: state.view,
    panState: state.panState,
    dragState: state.dragState,
    connecting: state.connecting,
    connectingPos: state.connectingPos,
    lastDrop: state.lastDrop,
    nodes: state.nodes,
    edges: state.edges,
    onNodesChangeFromContext: state.setNodes,
    onEdgesChangeFromContext: state.setEdges,
    activePathId: state.activePathId,
    pathName: state.pathName,
    isPathLocked: state.isPathLocked,
    isPathActive: state.isPathActive,
    activeTrigger: state.activeTrigger,
    executionMode: state.executionMode,
    flowIntensity: state.flowIntensity,
    runMode: state.runMode,
    strictFlowMode: state.strictFlowMode,
    paths: state.paths,
    pathConfigs: state.pathConfigs,
    runtimeState: state.runtimeState,
    lastRunAt: state.lastRunAt,
    lastError: state.lastError,
    runtimeRunStatus: state.runtimeRunStatus,
    handleFireTrigger: state.handleFireTrigger,
    handleFireTriggerPersistent: state.handleFireTriggerPersistent,
    handlePauseActiveRun: state.handlePauseActiveRun,
    handleResumeActiveRun: state.handleResumeActiveRun,
    handleStepActiveRun: state.handleStepActiveRun,
    handleCancelActiveRun: state.handleCancelActiveRun,
    handleClearWires: state.handleClearWires,
    handleFetchParserSample: state.handleFetchParserSample,
    handleFetchUpdaterSample: state.handleFetchUpdaterSample,
    handleRunSimulation: state.handleRunSimulation,
    handleSendToAi: state.handleSendToAi,
    nodeDurations: state.nodeDurations,
    runtimeNodeStatuses: state.runtimeNodeStatuses,
    runtimeEvents: state.runtimeEvents,
    loading: state.loading,
    saving: state.saving,
    autoSaveStatus: state.autoSaveStatus,
    autoSaveAt: state.autoSaveAt,
    savePathConfig: (options) => state.handleSave(options),
    clusterPresets: state.clusterPresets,
    presetDraft: state.presetDraft,
    editingPresetId: state.editingPresetId,
    paletteCollapsed: state.paletteCollapsed,
    expandedPaletteGroups: state.expandedPaletteGroups,
    saveDbQueryPresets: state.saveDbQueryPresets,
    saveDbNodePresets: state.saveDbNodePresets,
    runFilter: state.runFilter,
    expandedRunHistory: state.expandedRunHistory,
    runHistorySelection: state.runHistorySelection,
  });

  return (
    <AiPathsSettingsPageProvider value={pageContextValue}>
      <AiPathsSettingsOrchestratorProvider value={state}>
        <AiPathsSettingsView />
      </AiPathsSettingsOrchestratorProvider>
    </AiPathsSettingsPageProvider>
  );
}
