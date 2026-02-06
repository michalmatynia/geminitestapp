'use client';

import { AiPathsProvider, useLegacySyncAll } from '../context';
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
 * Migration note: Currently still uses useAiPathsSettingsState for backwards compatibility.
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
 * Inner component that uses the legacy state hook and syncs to contexts.
 * This allows child components to consume state via context hooks while
 * the legacy state management continues to work.
 */
function AiPathsSettingsInner({
  activeTab,
  renderActions,
  onTabChange,
  isFocusMode,
  onFocusModeChange,
}: AiPathsSettingsProps): React.JSX.Element {
  const state: AiPathsSettingsState = useAiPathsSettingsState({ activeTab });

  // Sync legacy state to contexts so child components can use context hooks
  useLegacySyncAll({
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
    // Persistence
    loading: state.loading,
    saving: state.saving,
    autoSaveStatus: state.autoSaveStatus,
    autoSaveAt: state.autoSaveAt,
    // Presets
    clusterPresets: state.clusterPresets,
    presetDraft: state.presetDraft,
    editingPresetId: state.editingPresetId,
    paletteCollapsed: state.paletteCollapsed,
    expandedPaletteGroups: state.expandedPaletteGroups,
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
