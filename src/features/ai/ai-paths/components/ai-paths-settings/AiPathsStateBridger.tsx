/* eslint-disable */
// @ts-nocheck
'use client';

import React from 'react';
import { useStateBridgeAll } from '../../context';
import { type UseAiPathsSettingsStateReturn } from './useAiPathsSettingsState';

export function AiPathsStateBridger({ state }: { state: UseAiPathsSettingsStateReturn }): null {
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

  return null;
}
