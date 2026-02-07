/**
 * useLegacySync - Bridge hook for syncing legacy state with new contexts.
 *
 * This hook enables gradual migration from the monolithic useAiPathsSettingsState
 * to domain-based contexts. It syncs the legacy state values to their corresponding
 * contexts, allowing child components to start consuming context hooks.
 *
 * Usage in a component that has access to legacy state:
 * ```tsx
 * const legacyState = useAiPathsSettingsState({ activeTab });
 *
 * // Sync selection state from legacy to context
 * useLegacySyncSelection({
 *   selectedNodeId: legacyState.selectedNodeId,
 *   selectedEdgeId: legacyState.selectedEdgeId,
 *   configOpen: legacyState.configOpen,
 * });
 *
 * // Now child components can use useSelectionState() and get the synced values
 * ```
 *
 * Migration path:
 * 1. Add useLegacySync* calls in parent component
 * 2. Child components can use context hooks
 * 3. Gradually move state management to contexts
 * 4. Remove sync hooks when migration is complete
 */

import { useEffect, useLayoutEffect, useRef } from 'react';

import type { AiNode, Edge, RuntimeState, ClusterPreset, PathMeta, PathConfig, PathExecutionMode, PathFlowIntensity, PathRunMode } from '@/features/ai/ai-paths/lib';
import { stableStringify } from '@/features/ai/ai-paths/lib';

import { useCanvasActions } from '../CanvasContext';
import { useGraphActions, useGraphState } from '../GraphContext';
import { usePersistenceActions } from '../PersistenceContext';
import { usePresetsActions } from '../PresetsContext';
import { useRunHistoryActions } from '../RunHistoryContext';
import { useRuntimeActions } from '../RuntimeContext';
import { useSelectionActions } from '../SelectionContext';


import type { ViewState, PanState, DragState, ConnectingState } from '../CanvasContext';
import type { ClusterPresetDraft } from '../PresetsContext';
// Note: Using string for runFilter to accommodate different RunHistoryFilter types
// (context uses "all" | "completed" | "failed" | "running" | "queued" | "cancelled"
// while run-history-panel uses "all" | "active" | "failed" | "dead")

// ---------------------------------------------------------------------------
// Selection Sync
// ---------------------------------------------------------------------------

export interface LegacySyncSelectionProps {
  selectedNodeId: string | null;
  selectedEdgeId?: string | null | undefined;
  configOpen?: boolean | undefined;
  nodeConfigDirty?: boolean | undefined;
  simulationOpenNodeId?: string | null | undefined;
}

/**
 * Sync selection state from legacy hook to SelectionContext.
 */
export function useLegacySyncSelection({
  selectedNodeId,
  selectedEdgeId,
  configOpen,
  nodeConfigDirty,
  simulationOpenNodeId,
}: LegacySyncSelectionProps): void {
  const actions = useSelectionActions();

  useEffect(() => {
    actions.selectNode(selectedNodeId);
  }, [selectedNodeId, actions]);

  useEffect(() => {
    if (selectedEdgeId !== undefined) {
      actions.selectEdge(selectedEdgeId);
    }
  }, [selectedEdgeId, actions]);

  useEffect(() => {
    if (configOpen !== undefined) {
      actions.setConfigOpen(configOpen);
    }
  }, [configOpen, actions]);

  useEffect(() => {
    if (nodeConfigDirty !== undefined) {
      actions.setNodeConfigDirty(nodeConfigDirty);
    }
  }, [nodeConfigDirty, actions]);

  useEffect(() => {
    if (simulationOpenNodeId !== undefined) {
      actions.setSimulationOpenNodeId(simulationOpenNodeId);
    }
  }, [simulationOpenNodeId, actions]);
}

// ---------------------------------------------------------------------------
// Canvas Sync
// ---------------------------------------------------------------------------

export interface LegacySyncCanvasProps {
  view: ViewState;
  panState?: PanState | null | undefined;
  dragState?: DragState | null | undefined;
  connecting?: ConnectingState | null | undefined;
  connectingPos?: { x: number; y: number } | null | undefined;
  lastDrop?: { x: number; y: number } | null | undefined;
}

/**
 * Sync canvas state from legacy hook to CanvasContext.
 */
export function useLegacySyncCanvas({
  view,
  panState,
  dragState,
  connecting,
  connectingPos,
  lastDrop,
}: LegacySyncCanvasProps): void {
  const actions = useCanvasActions();

  useEffect(() => {
    actions.setView(view);
  }, [view, actions]);
  useEffect(() => {
    if (panState !== undefined) {
      actions.setPanState(panState);
    }
  }, [panState, actions]);
  useEffect(() => {
    if (dragState !== undefined) {
      actions.setDragState(dragState);
    }
  }, [dragState, actions]);
  useEffect(() => {
    if (connecting !== undefined) {
      actions.setConnecting(connecting);
    }
  }, [connecting, actions]);
  useEffect(() => {
    if (connectingPos !== undefined) {
      actions.setConnectingPos(connectingPos);
    }
  }, [connectingPos, actions]);
  useEffect(() => {
    if (lastDrop !== undefined) {
      actions.setLastDrop(lastDrop);
    }
  }, [lastDrop, actions]);
}

// ---------------------------------------------------------------------------
// Graph Sync
// ---------------------------------------------------------------------------

export interface LegacySyncGraphProps {
  nodes: AiNode[];
  edges: Edge[];
  onNodesChangeFromContext?: ((nodes: AiNode[]) => void) | undefined;
  onEdgesChangeFromContext?: ((edges: Edge[]) => void) | undefined;
  activePathId?: string | null | undefined;
  pathName?: string | undefined;
  isPathLocked?: boolean | undefined;
  isPathActive?: boolean | undefined;
  activeTrigger?: string | undefined;
  executionMode?: PathExecutionMode | undefined;
  flowIntensity?: PathFlowIntensity | undefined;
  runMode?: PathRunMode | undefined;
  paths?: PathMeta[] | undefined;
  pathConfigs?: Record<string, PathConfig> | undefined;
}

/**
 * Sync graph state from legacy hook to GraphContext.
 */
export function useLegacySyncGraph({
  nodes,
  edges,
  onNodesChangeFromContext,
  onEdgesChangeFromContext,
  activePathId,
  pathName,
  isPathLocked,
  isPathActive,
  activeTrigger,
  executionMode,
  flowIntensity,
  runMode,
  paths,
  pathConfigs,
}: LegacySyncGraphProps): void {
  const actions = useGraphActions();
  const { nodes: contextNodes, edges: contextEdges } = useGraphState();
  const skipNextContextNodesSyncRef = useRef(false);
  const skipNextContextEdgesSyncRef = useRef(false);

  useEffect(() => {
    skipNextContextNodesSyncRef.current = true;
    actions.setNodes(nodes);
  }, [nodes, actions]);

  useEffect(() => {
    skipNextContextEdgesSyncRef.current = true;
    actions.setEdges(edges);
  }, [edges, actions]);

  useLayoutEffect((): void => {
    if (!onNodesChangeFromContext) return;
    if (skipNextContextNodesSyncRef.current) {
      skipNextContextNodesSyncRef.current = false;
      return;
    }
    if (contextNodes === nodes) return;
    if (stableStringify(contextNodes) === stableStringify(nodes)) return;
    onNodesChangeFromContext(contextNodes);
  }, [contextNodes, nodes, onNodesChangeFromContext]);

  useLayoutEffect((): void => {
    if (!onEdgesChangeFromContext) return;
    if (skipNextContextEdgesSyncRef.current) {
      skipNextContextEdgesSyncRef.current = false;
      return;
    }
    if (contextEdges === edges) return;
    if (stableStringify(contextEdges) === stableStringify(edges)) return;
    onEdgesChangeFromContext(contextEdges);
  }, [contextEdges, edges, onEdgesChangeFromContext]);

  useEffect(() => {
    if (activePathId !== undefined) {
      actions.setActivePathId(activePathId);
    }
  }, [activePathId, actions]);

  useEffect(() => {
    if (pathName !== undefined) {
      actions.setPathName(pathName);
    }
  }, [pathName, actions]);

  useEffect(() => {
    if (isPathLocked !== undefined) {
      actions.setIsPathLocked(isPathLocked);
    }
  }, [isPathLocked, actions]);

  useEffect(() => {
    if (isPathActive !== undefined) {
      actions.setIsPathActive(isPathActive);
    }
  }, [isPathActive, actions]);

  useEffect(() => {
    if (activeTrigger !== undefined) {
      actions.setActiveTrigger(activeTrigger);
    }
  }, [activeTrigger, actions]);

  useEffect(() => {
    if (executionMode !== undefined) {
      actions.setExecutionMode(executionMode);
    }
  }, [executionMode, actions]);

  useEffect(() => {
    if (flowIntensity !== undefined) {
      actions.setFlowIntensity(flowIntensity);
    }
  }, [flowIntensity, actions]);

  useEffect(() => {
    if (runMode !== undefined) {
      actions.setRunMode(runMode);
    }
  }, [runMode, actions]);

  useEffect(() => {
    if (paths !== undefined) {
      actions.setPaths(paths);
    }
  }, [paths, actions]);

  useEffect(() => {
    if (pathConfigs !== undefined) {
      actions.setPathConfigs(pathConfigs);
    }
  }, [pathConfigs, actions]);
}

// ---------------------------------------------------------------------------
// Runtime Sync
// ---------------------------------------------------------------------------

export interface LegacySyncRuntimeProps {
  runtimeState: RuntimeState;
  lastRunAt?: string | null | undefined;
  lastError?: { message: string; time: string; pathId?: string | null } | null | undefined;
}

/**
 * Sync runtime state from legacy hook to RuntimeContext.
 */
export function useLegacySyncRuntime({
  runtimeState,
  lastRunAt,
  lastError,
}: LegacySyncRuntimeProps): void {
  const actions = useRuntimeActions();

  useEffect(() => {
    actions.setRuntimeState(runtimeState);
  }, [runtimeState, actions]);

  useEffect(() => {
    if (lastRunAt !== undefined) {
      actions.setLastRunAt(lastRunAt);
    }
  }, [lastRunAt, actions]);

  useEffect(() => {
    if (lastError !== undefined) {
      actions.setLastError(lastError);
    }
  }, [lastError, actions]);
}

// ---------------------------------------------------------------------------
// Persistence Sync
// ---------------------------------------------------------------------------

export interface LegacySyncPersistenceProps {
  loading: boolean;
  saving?: boolean | undefined;
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | undefined;
  autoSaveAt?: string | null | undefined;
}

/**
 * Sync persistence state from legacy hook to PersistenceContext.
 */
export function useLegacySyncPersistence({
  loading,
  saving,
  autoSaveStatus,
  autoSaveAt,
}: LegacySyncPersistenceProps): void {
  const actions = usePersistenceActions();

  useEffect(() => {
    actions.setLoading(loading);
  }, [loading, actions]);

  useEffect(() => {
    if (saving !== undefined) {
      actions.setSaving(saving);
    }
  }, [saving, actions]);

  useEffect(() => {
    if (autoSaveStatus !== undefined) {
      actions.setAutoSaveStatus(autoSaveStatus);
    }
  }, [autoSaveStatus, actions]);

  useEffect(() => {
    if (autoSaveAt !== undefined) {
      actions.setAutoSaveAt(autoSaveAt);
    }
  }, [autoSaveAt, actions]);
}

// ---------------------------------------------------------------------------
// Presets Sync
// ---------------------------------------------------------------------------

export interface LegacySyncPresetsProps {
  clusterPresets?: ClusterPreset[] | undefined;
  presetDraft?: ClusterPresetDraft | undefined;
  editingPresetId?: string | null | undefined;
  paletteCollapsed?: boolean | undefined;
  expandedPaletteGroups?: Set<string> | undefined;
}

/**
 * Sync presets state from legacy hook to PresetsContext.
 */
export function useLegacySyncPresets({
  clusterPresets,
  presetDraft,
  editingPresetId,
  paletteCollapsed,
  expandedPaletteGroups,
}: LegacySyncPresetsProps): void {
  const actions = usePresetsActions();

  useEffect(() => {
    if (clusterPresets !== undefined) {
      actions.setClusterPresets(clusterPresets);
    }
  }, [clusterPresets, actions]);

  useEffect(() => {
    if (presetDraft !== undefined) {
      actions.setPresetDraft(presetDraft);
    }
  }, [presetDraft, actions]);

  useEffect(() => {
    if (editingPresetId !== undefined) {
      actions.setEditingPresetId(editingPresetId);
    }
  }, [editingPresetId, actions]);

  useEffect(() => {
    if (paletteCollapsed !== undefined) {
      actions.setPaletteCollapsed(paletteCollapsed);
    }
  }, [paletteCollapsed, actions]);

  useEffect(() => {
    if (expandedPaletteGroups !== undefined) {
      actions.setExpandedPaletteGroups(expandedPaletteGroups);
    }
  }, [expandedPaletteGroups, actions]);
}

// ---------------------------------------------------------------------------
// Run History Sync
// ---------------------------------------------------------------------------

export interface LegacySyncRunHistoryProps {
  runFilter?: string | undefined;
  expandedRunHistory?: Record<string, boolean> | undefined;
  runHistorySelection?: Record<string, string> | undefined;
}

/**
 * Sync run history state from legacy hook to RunHistoryContext.
 * Note: runFilter is typed as string to accommodate different RunHistoryFilter types.
 */
export function useLegacySyncRunHistory({
  runFilter,
  expandedRunHistory,
  runHistorySelection,
}: LegacySyncRunHistoryProps): void {
  const actions = useRunHistoryActions();

  useEffect(() => {
    if (runFilter !== undefined) {
      // Cast to context's RunHistoryFilter type
      actions.setRunFilter(runFilter as any);
    }
  }, [runFilter, actions]);

  useEffect(() => {
    if (expandedRunHistory !== undefined) {
      actions.setExpandedRunHistory(expandedRunHistory);
    }
  }, [expandedRunHistory, actions]);

  useEffect(() => {
    if (runHistorySelection !== undefined) {
      actions.setRunHistorySelection(runHistorySelection);
    }
  }, [runHistorySelection, actions]);
}

// ---------------------------------------------------------------------------
// Combined Sync
// ---------------------------------------------------------------------------

export interface LegacySyncAllProps {
  // Selection
  selectedNodeId: string | null;
  selectedEdgeId?: string | null | undefined;
  configOpen?: boolean | undefined;
  nodeConfigDirty?: boolean | undefined;
  simulationOpenNodeId?: string | null | undefined;
  // Canvas
  view: ViewState;
  panState?: PanState | null | undefined;
  dragState?: DragState | null | undefined;
  connecting?: ConnectingState | null | undefined;
  connectingPos?: { x: number; y: number } | null | undefined;
  lastDrop?: { x: number; y: number } | null | undefined;
  // Graph
  nodes: AiNode[];
  edges: Edge[];
  onNodesChangeFromContext?: ((nodes: AiNode[]) => void) | undefined;
  onEdgesChangeFromContext?: ((edges: Edge[]) => void) | undefined;
  activePathId?: string | null | undefined;
  pathName?: string | undefined;
  isPathLocked?: boolean | undefined;
  isPathActive?: boolean | undefined;
  activeTrigger?: string | undefined;
  executionMode?: PathExecutionMode | undefined;
  flowIntensity?: PathFlowIntensity | undefined;
  runMode?: PathRunMode | undefined;
  paths?: PathMeta[] | undefined;
  pathConfigs?: Record<string, PathConfig> | undefined;
  // Runtime
  runtimeState: RuntimeState;
  lastRunAt?: string | null | undefined;
  lastError?: { message: string; time: string; pathId?: string | null } | null | undefined;
  // Persistence
  loading: boolean;
  saving?: boolean | undefined;
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | undefined;
  autoSaveAt?: string | null | undefined;
  // Presets
  clusterPresets?: ClusterPreset[] | undefined;
  presetDraft?: ClusterPresetDraft | undefined;
  editingPresetId?: string | null | undefined;
  paletteCollapsed?: boolean | undefined;
  expandedPaletteGroups?: Set<string> | undefined;
  // Run History
  runFilter?: string | undefined;
  expandedRunHistory?: Record<string, boolean> | undefined;
  runHistorySelection?: Record<string, string> | undefined;
}

/**
 * Sync all legacy state to contexts at once.
 * Use this in the component that has access to the full legacy state.
 */
export function useLegacySyncAll(props: LegacySyncAllProps): void {
  useLegacySyncSelection({
    selectedNodeId: props.selectedNodeId,
    selectedEdgeId: props.selectedEdgeId,
    configOpen: props.configOpen,
    nodeConfigDirty: props.nodeConfigDirty,
    simulationOpenNodeId: props.simulationOpenNodeId,
  });

  useLegacySyncCanvas({
    view: props.view,
    panState: props.panState,
    dragState: props.dragState,
    connecting: props.connecting,
    connectingPos: props.connectingPos,
    lastDrop: props.lastDrop,
  });

  useLegacySyncGraph({
    nodes: props.nodes,
    edges: props.edges,
    onNodesChangeFromContext: props.onNodesChangeFromContext,
    onEdgesChangeFromContext: props.onEdgesChangeFromContext,
    activePathId: props.activePathId,
    pathName: props.pathName,
    isPathLocked: props.isPathLocked,
    isPathActive: props.isPathActive,
    activeTrigger: props.activeTrigger,
    executionMode: props.executionMode,
    flowIntensity: props.flowIntensity,
    runMode: props.runMode,
    paths: props.paths,
    pathConfigs: props.pathConfigs,
  });

  useLegacySyncRuntime({
    runtimeState: props.runtimeState,
    lastRunAt: props.lastRunAt,
    lastError: props.lastError,
  });

  useLegacySyncPersistence({
    loading: props.loading,
    saving: props.saving,
    autoSaveStatus: props.autoSaveStatus,
    autoSaveAt: props.autoSaveAt,
  });

  useLegacySyncPresets({
    clusterPresets: props.clusterPresets,
    presetDraft: props.presetDraft,
    editingPresetId: props.editingPresetId,
    paletteCollapsed: props.paletteCollapsed,
    expandedPaletteGroups: props.expandedPaletteGroups,
  });

  useLegacySyncRunHistory({
    runFilter: props.runFilter,
    expandedRunHistory: props.expandedRunHistory,
    runHistorySelection: props.runHistorySelection,
  });
}
