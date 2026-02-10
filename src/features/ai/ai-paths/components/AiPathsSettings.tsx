'use client';

import { AiPathsProvider, useStateBridgeAll } from '../context';
import { AiPathsSettingsView } from './ai-paths-settings/AiPathsSettingsView';
import { useAiPathsSettingsState, type AiPathsSettingsState } from './ai-paths-settings/useAiPathsSettingsState';

type AiPathsSettingsProps = {
  activeTab: 'canvas' | 'paths' | 'docs';
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: 'canvas' | 'paths' | 'docs') => void) | undefined;
  isFocusMode?: boolean | undefined;
  onFocusModeChange?: ((next: boolean) => void) | undefined;
};

/**
 * Root component for AI-Paths settings.
 * Wraps the entire tree with AiPathsProvider to enable context-based state management.
 *
 * Migration note: Currently uses useAiPathsSettingsState as orchestrator state.
 * Child components can progressively migrate to use context hooks (useGraph, useSelection, etc.)
 */
export function AiPathsSettings({
  activeTab,
  renderActions,
  onTabChange,
  isFocusMode,
  onFocusModeChange,
}: AiPathsSettingsProps): React.JSX.Element {
  return (
    <AiPathsProvider>
      <AiPathsSettingsInner
        activeTab={activeTab}
        renderActions={renderActions}
        onTabChange={onTabChange}
        isFocusMode={isFocusMode}
        onFocusModeChange={onFocusModeChange}
      />
    </AiPathsProvider>
  );
}

/**
 * Inner component that uses the orchestrator state hook and syncs to contexts.
 * This allows child components to consume state via context hooks while
 * domain contexts remain the runtime source.
 */
function AiPathsSettingsInner({
  activeTab,
  renderActions,
  onTabChange,
  isFocusMode,
  onFocusModeChange,
}: AiPathsSettingsProps): React.JSX.Element {
  const state: AiPathsSettingsState = useAiPathsSettingsState({ activeTab });

  // Sync orchestrator state to domain contexts for child components.
  useStateBridgeAll({
    // Selection
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
    configOpen: state.configOpen,
    nodeConfigDirty: state.nodeConfigDirty,
    simulationOpenNodeId: state.simulationOpenNodeId,
    // Canvas
    view: state.view,
    panState: state.panState,
    dragState: state.dragState,
    connecting: state.connecting,
    connectingPos: state.connectingPos,
    lastDrop: state.lastDrop,
    // Graph
    nodes: state.nodes,
    edges: state.edges,
    onNodesChangeFromContext: (nextNodes: AiPathsSettingsState['nodes']) => {
      state.setNodes(nextNodes);
    },
    onEdgesChangeFromContext: (nextEdges: AiPathsSettingsState['edges']) => {
      state.setEdges(nextEdges);
    },
    activePathId: state.activePathId,
    pathName: state.pathName,
    isPathLocked: state.isPathLocked,
    isPathActive: state.isPathActive,
    activeTrigger: state.activeTrigger,
    executionMode: state.executionMode,
    flowIntensity: state.flowIntensity,
    runMode: state.runMode,
    paths: state.paths,
    pathConfigs: state.pathConfigs,
    // Runtime
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
    // Persistence
    loading: state.loading,
    saving: state.saving,
    autoSaveStatus: state.autoSaveStatus,
    autoSaveAt: state.autoSaveAt,
    savePathConfig: (options) => state.handleSave(options),
    // Presets
    clusterPresets: state.clusterPresets,
    presetDraft: state.presetDraft,
    editingPresetId: state.editingPresetId,
    paletteCollapsed: state.paletteCollapsed,
    expandedPaletteGroups: state.expandedPaletteGroups,
    saveDbQueryPresets: state.saveDbQueryPresets,
    saveDbNodePresets: state.saveDbNodePresets,
    // Run History
    runFilter: state.runFilter,
    expandedRunHistory: state.expandedRunHistory,
    runHistorySelection: state.runHistorySelection,
  });

  return (
    <AiPathsSettingsView
      activeTab={activeTab}
      renderActions={renderActions}
      onTabChange={onTabChange}
      isFocusMode={isFocusMode}
      onFocusModeChange={onFocusModeChange}
      state={state}
    />
  );
}
