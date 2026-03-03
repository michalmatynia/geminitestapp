/**
 * useStateBridge - Bridge hook for syncing source state with new contexts.
 *
 * This hook enables gradual migration from the monolithic useAiPathsSettingsState
 * to domain-based contexts. It syncs the source state values to their corresponding
 * contexts, allowing child components to start consuming context hooks.
 *
 * Usage in a component that has access to source state:
 * ```tsx
 * const sourceState = useAiPathsSettingsState({ activeTab });
 *
 * // Sync selection state from source to context
 * useStateBridgeSelection({
 *   selectedNodeId: sourceState.selectedNodeId,
 *   selectedEdgeId: sourceState.selectedEdgeId,
 *   configOpen: sourceState.configOpen,
 * });
 *
 * // Now child components can use useSelectionState() and get the synced values
 * ```
 *
 * Migration path:
 * 1. Add useStateBridge* calls in parent component
 * 2. Child components can use context hooks
 * 3. Gradually move state management to contexts
 * 4. Remove sync hooks when migration is complete
 */

import { useEffect, useLayoutEffect, useRef } from 'react';

import type {
  AiNode,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatusMap,
  Edge,
  RuntimeState,
  ClusterPreset,
  PathMeta,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
  DbQueryPreset,
  DbNodePreset,
} from '@/shared/lib/ai-paths';
import { stableStringify } from '@/shared/lib/ai-paths';

import { useCanvasActions } from '../CanvasContext';
import { useGraphActions, useGraphState } from '../GraphContext';
import { usePersistenceActions } from '../PersistenceContext';
import { usePresetsActions } from '../PresetsContext';
import { useRunHistoryActions } from '../RunHistoryContext';
import { useRuntimeActions, type RuntimeRunStatus } from '../RuntimeContext';
import { useSelectionActions } from '../SelectionContext';

import type { ViewState, PanState, DragState, ConnectingState } from '../CanvasContext';
import type { SavePathConfigOptions } from '../PersistenceContext';
import type { ClusterPresetDraft } from '../PresetsContext';
import type { RunHistoryFilter } from '../RunHistoryContext';
// Note: Using string for runFilter to bridge the broader context filter union
// with the compact run-history panel filter set during the context migration.

// ---------------------------------------------------------------------------
// Selection Sync
// ---------------------------------------------------------------------------

export interface StateBridgeSelectionProps {
  selectedNodeId: string | null;
  selectedEdgeId?: string | null | undefined;
  configOpen?: boolean | undefined;
  nodeConfigDirty?: boolean | undefined;
  simulationOpenNodeId?: string | null | undefined;
}

/**
 * Sync selection state from source hook to SelectionContext.
 */
export function useStateBridgeSelection({
  selectedNodeId,
  selectedEdgeId,
  configOpen,
  nodeConfigDirty,
  simulationOpenNodeId,
}: StateBridgeSelectionProps): void {
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

export interface StateBridgeCanvasProps {
  view?: ViewState | undefined;
  panState?: PanState | null | undefined;
  dragState?: DragState | null | undefined;
  connecting?: ConnectingState | null | undefined;
  connectingPos?: { x: number; y: number } | null | undefined;
  lastDrop?: { x: number; y: number } | null | undefined;
}

/**
 * Sync canvas state from source hook to CanvasContext.
 */
export function useStateBridgeCanvas({
  view,
  panState,
  dragState,
  connecting,
  connectingPos,
  lastDrop,
}: StateBridgeCanvasProps): void {
  const actions = useCanvasActions();

  useEffect(() => {
    if (view !== undefined) {
      actions.setView(view);
    }
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

export interface StateBridgeGraphProps {
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
  strictFlowMode?: boolean | undefined;
  paths?: PathMeta[] | undefined;
  pathConfigs?: Record<string, PathConfig> | undefined;
}

/**
 * Sync graph state from source hook to GraphContext.
 */
export function useStateBridgeGraph({
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
  strictFlowMode,
  paths,
  pathConfigs,
}: StateBridgeGraphProps): void {
  const actions = useGraphActions();
  const { nodes: contextNodes, edges: contextEdges } = useGraphState();
  const skipNextContextNodesSyncRef = useRef(false);
  const skipNextContextEdgesSyncRef = useRef(false);
  const lastSourceNodesHashRef = useRef<string>(stableStringify(nodes));
  const lastSourceEdgesHashRef = useRef<string>(stableStringify(edges));
  const sourceNodesHash = stableStringify(nodes);
  const sourceEdgesHash = stableStringify(edges);

  // Mark a source->context push before layout effects run, so context->source
  // cannot overwrite freshly loaded graph state in the same render cycle.
  if (lastSourceNodesHashRef.current !== sourceNodesHash) {
    lastSourceNodesHashRef.current = sourceNodesHash;
    skipNextContextNodesSyncRef.current = true;
  }
  if (lastSourceEdgesHashRef.current !== sourceEdgesHash) {
    lastSourceEdgesHashRef.current = sourceEdgesHash;
    skipNextContextEdgesSyncRef.current = true;
  }

  useEffect(() => {
    actions.setNodes(nodes);
  }, [nodes, actions]);

  useEffect(() => {
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
    if (strictFlowMode !== undefined) {
      actions.setStrictFlowMode(strictFlowMode);
    }
  }, [strictFlowMode, actions]);

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

export interface StateBridgeRuntimeProps {
  runtimeState: RuntimeState;
  lastRunAt?: string | null | undefined;
  lastError?: { message: string; time: string; pathId?: string | null } | null | undefined;
  runtimeRunStatus?: RuntimeRunStatus | undefined;
  handleFireTrigger?:
    | ((node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>)
    | undefined;
  handleFireTriggerPersistent?:
    | ((node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>)
    | undefined;
  handlePauseActiveRun?: (() => void) | undefined;
  handleResumeActiveRun?: (() => void) | undefined;
  handleStepActiveRun?: ((triggerNode?: AiNode) => void) | undefined;
  handleCancelActiveRun?: (() => void) | undefined;
  handleClearWires?: (() => Promise<void> | void) | undefined;
  handleFetchParserSample?:
    | ((nodeId: string, entityType: string, entityId: string) => Promise<void>)
    | undefined;
  handleFetchUpdaterSample?:
    | ((
        nodeId: string,
        entityType: string,
        entityId: string,
        options?: { notify?: boolean }
      ) => Promise<void>)
    | undefined;
  handleRunSimulation?: ((node: AiNode, triggerEvent?: string) => void | Promise<void>) | undefined;
  handleSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  nodeDurations?: Record<string, number> | undefined;
  runtimeNodeStatuses?: AiPathRuntimeNodeStatusMap | undefined;
  runtimeEvents?: AiPathRuntimeEvent[] | undefined;
}

/**
 * Sync runtime state from source hook to RuntimeContext.
 */
export function useStateBridgeRuntime({
  runtimeState,
  lastRunAt,
  lastError,
  runtimeRunStatus,
  handleFireTrigger,
  handleFireTriggerPersistent,
  handlePauseActiveRun,
  handleResumeActiveRun,
  handleStepActiveRun,
  handleCancelActiveRun,
  handleClearWires,
  handleFetchParserSample,
  handleFetchUpdaterSample,
  handleRunSimulation,
  handleSendToAi,
  nodeDurations,
  runtimeNodeStatuses,
  runtimeEvents,
}: StateBridgeRuntimeProps): void {
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

  useEffect(() => {
    if (runtimeRunStatus !== undefined) {
      actions.setRuntimeRunStatus(runtimeRunStatus);
    }
  }, [runtimeRunStatus, actions]);

  useEffect(() => {
    if (nodeDurations !== undefined) {
      actions.setNodeDurations(nodeDurations);
    }
  }, [nodeDurations, actions]);

  useEffect(() => {
    if (runtimeNodeStatuses !== undefined) {
      actions.setRuntimeNodeStatuses(runtimeNodeStatuses);
    }
  }, [runtimeNodeStatuses, actions]);

  useEffect(() => {
    if (runtimeEvents !== undefined) {
      actions.setRuntimeEvents(runtimeEvents);
    }
  }, [runtimeEvents, actions]);

  useEffect(() => {
    actions.setRunControlHandlers({
      ...(handleFireTrigger !== undefined && {
        fireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => handleFireTrigger(node, event),
      }),
      ...(handleFireTriggerPersistent !== undefined && {
        fireTriggerPersistent: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => handleFireTriggerPersistent(node, event),
      }),
      ...(handlePauseActiveRun !== undefined && { pauseActiveRun: handlePauseActiveRun }),
      ...(handleResumeActiveRun !== undefined && { resumeActiveRun: handleResumeActiveRun }),
      ...(handleStepActiveRun !== undefined && { stepActiveRun: handleStepActiveRun }),
      ...(handleCancelActiveRun !== undefined && { cancelActiveRun: handleCancelActiveRun }),
      ...(handleClearWires !== undefined && { clearWires: handleClearWires }),
    });
  }, [
    actions,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handlePauseActiveRun,
    handleResumeActiveRun,
    handleStepActiveRun,
    handleCancelActiveRun,
    handleClearWires,
  ]);

  useEffect(() => {
    actions.setRuntimeNodeConfigHandlers({
      ...(handleFetchParserSample !== undefined && {
        fetchParserSample: (nodeId: string, entityType: string, entityId: string) =>
          handleFetchParserSample(nodeId, entityType, entityId),
      }),
      ...(handleFetchUpdaterSample !== undefined && {
        fetchUpdaterSample: (nodeId: string, entityType: string, entityId: string, options?: { notify?: boolean }) =>
          handleFetchUpdaterSample(nodeId, entityType, entityId, options),
      }),
      ...(handleRunSimulation !== undefined && {
        runSimulation: (node: AiNode, triggerEvent?: string) => handleRunSimulation(node, triggerEvent),
      }),
      ...(handleSendToAi !== undefined && {
        sendToAi: (nodeId: string, prompt: string) => handleSendToAi(nodeId, prompt),
      }),
    });
  }, [
    actions,
    handleFetchParserSample,
    handleFetchUpdaterSample,
    handleRunSimulation,
    handleSendToAi,
  ]);
}

// ---------------------------------------------------------------------------
// Persistence Sync
// ---------------------------------------------------------------------------

export interface StateBridgePersistenceProps {
  loading: boolean;
  saving?: boolean | undefined;
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | undefined;
  autoSaveAt?: string | null | undefined;
  savePathConfig?: ((options?: SavePathConfigOptions) => Promise<boolean>) | undefined;
}

/**
 * Sync persistence state from source hook to PersistenceContext.
 */
export function useStateBridgePersistence({
  loading,
  saving,
  autoSaveStatus,
  autoSaveAt,
  savePathConfig,
}: StateBridgePersistenceProps): void {
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

  useEffect(() => {
    actions.setOperationHandlers({
      ...(savePathConfig !== undefined && { savePathConfig }),
    });
  }, [actions, savePathConfig]);
}

// ---------------------------------------------------------------------------
// Presets Sync
// ---------------------------------------------------------------------------

export interface StateBridgePresetsProps {
  clusterPresets?: ClusterPreset[] | undefined;
  presetDraft?: ClusterPresetDraft | undefined;
  editingPresetId?: string | null | undefined;
  paletteCollapsed?: boolean | undefined;
  expandedPaletteGroups?: Set<string> | undefined;
  saveDbQueryPresets?: ((nextPresets: DbQueryPreset[]) => Promise<void>) | undefined;
  saveDbNodePresets?: ((nextPresets: DbNodePreset[]) => Promise<void>) | undefined;
}

/**
 * Sync presets state from source hook to PresetsContext.
 */
export function useStateBridgePresets({
  clusterPresets,
  presetDraft,
  editingPresetId,
  paletteCollapsed,
  expandedPaletteGroups,
  saveDbQueryPresets,
  saveDbNodePresets,
}: StateBridgePresetsProps): void {
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

  useEffect(() => {
    actions.setPresetPersistenceHandlers({
      ...(saveDbQueryPresets !== undefined && { saveDbQueryPresets }),
      ...(saveDbNodePresets !== undefined && { saveDbNodePresets }),
    });
  }, [actions, saveDbQueryPresets, saveDbNodePresets]);
}

// ---------------------------------------------------------------------------
// Run History Sync
// ---------------------------------------------------------------------------

export interface StateBridgeRunHistoryProps {
  runFilter?: string | undefined;
  expandedRunHistory?: Record<string, boolean> | undefined;
  runHistorySelection?: Record<string, string> | undefined;
}

/**
 * Sync run history state from source hook to RunHistoryContext.
 * Note: runFilter is typed as string to accommodate different RunHistoryFilter types.
 */
export function useStateBridgeRunHistory({
  runFilter,
  expandedRunHistory,
  runHistorySelection,
}: StateBridgeRunHistoryProps): void {
  const actions = useRunHistoryActions();

  useEffect(() => {
    if (runFilter !== undefined) {
      // Cast to context's RunHistoryFilter type
      actions.setRunFilter(runFilter as RunHistoryFilter);
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

export interface StateBridgeAllProps {
  // Selection
  selectedNodeId: string | null;
  selectedEdgeId?: string | null | undefined;
  configOpen?: boolean | undefined;
  nodeConfigDirty?: boolean | undefined;
  simulationOpenNodeId?: string | null | undefined;
  // Canvas
  view?: ViewState | undefined;
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
  strictFlowMode?: boolean | undefined;
  paths?: PathMeta[] | undefined;
  pathConfigs?: Record<string, PathConfig> | undefined;
  // Runtime
  runtimeState: RuntimeState;
  lastRunAt?: string | null | undefined;
  lastError?: { message: string; time: string; pathId?: string | null } | null | undefined;
  runtimeRunStatus?: RuntimeRunStatus | undefined;
  handleFireTrigger?:
    | ((node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>)
    | undefined;
  handleFireTriggerPersistent?:
    | ((node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>)
    | undefined;
  handlePauseActiveRun?: (() => void) | undefined;
  handleResumeActiveRun?: (() => void) | undefined;
  handleStepActiveRun?: ((triggerNode?: AiNode) => void) | undefined;
  handleCancelActiveRun?: (() => void) | undefined;
  handleClearWires?: (() => Promise<void> | void) | undefined;
  handleFetchParserSample?:
    | ((nodeId: string, entityType: string, entityId: string) => Promise<void>)
    | undefined;
  handleFetchUpdaterSample?:
    | ((
        nodeId: string,
        entityType: string,
        entityId: string,
        options?: { notify?: boolean }
      ) => Promise<void>)
    | undefined;
  handleRunSimulation?: ((node: AiNode, triggerEvent?: string) => void | Promise<void>) | undefined;
  handleSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  nodeDurations?: Record<string, number> | undefined;
  runtimeNodeStatuses?: AiPathRuntimeNodeStatusMap | undefined;
  runtimeEvents?: AiPathRuntimeEvent[] | undefined;
  // Persistence
  loading: boolean;
  saving?: boolean | undefined;
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | undefined;
  autoSaveAt?: string | null | undefined;
  savePathConfig?: ((options?: SavePathConfigOptions) => Promise<boolean>) | undefined;
  // Presets
  clusterPresets?: ClusterPreset[] | undefined;
  presetDraft?: ClusterPresetDraft | undefined;
  editingPresetId?: string | null | undefined;
  paletteCollapsed?: boolean | undefined;
  expandedPaletteGroups?: Set<string> | undefined;
  saveDbQueryPresets?: ((nextPresets: DbQueryPreset[]) => Promise<void>) | undefined;
  saveDbNodePresets?: ((nextPresets: DbNodePreset[]) => Promise<void>) | undefined;
  // Run History
  runFilter?: string | undefined;
  expandedRunHistory?: Record<string, boolean> | undefined;
  runHistorySelection?: Record<string, string> | undefined;
}

/**
 * Sync all source state to contexts at once.
 * Use this in the component that has access to the full source state.
 */
export function useStateBridgeAll(props: StateBridgeAllProps): void {
  useStateBridgeSelection({
    selectedNodeId: props.selectedNodeId,
    selectedEdgeId: props.selectedEdgeId,
    configOpen: props.configOpen,
    nodeConfigDirty: props.nodeConfigDirty,
    simulationOpenNodeId: props.simulationOpenNodeId,
  });

  useStateBridgeCanvas({
    view: props.view,
    panState: props.panState,
    dragState: props.dragState,
    connecting: props.connecting,
    connectingPos: props.connectingPos,
    lastDrop: props.lastDrop,
  });

  useStateBridgeGraph({
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
    strictFlowMode: props.strictFlowMode,
    paths: props.paths,
    pathConfigs: props.pathConfigs,
  });

  useStateBridgeRuntime({
    runtimeState: props.runtimeState,
    lastRunAt: props.lastRunAt,
    lastError: props.lastError,
    runtimeRunStatus: props.runtimeRunStatus,
    handleFireTrigger: props.handleFireTrigger,
    handleFireTriggerPersistent: props.handleFireTriggerPersistent,
    handlePauseActiveRun: props.handlePauseActiveRun,
    handleResumeActiveRun: props.handleResumeActiveRun,
    handleStepActiveRun: props.handleStepActiveRun,
    handleCancelActiveRun: props.handleCancelActiveRun,
    handleClearWires: props.handleClearWires,
    handleFetchParserSample: props.handleFetchParserSample,
    handleFetchUpdaterSample: props.handleFetchUpdaterSample,
    handleRunSimulation: props.handleRunSimulation,
    handleSendToAi: props.handleSendToAi,
    nodeDurations: props.nodeDurations,
    runtimeNodeStatuses: props.runtimeNodeStatuses,
    runtimeEvents: props.runtimeEvents,
  });

  useStateBridgePersistence({
    loading: props.loading,
    saving: props.saving,
    autoSaveStatus: props.autoSaveStatus,
    autoSaveAt: props.autoSaveAt,
    savePathConfig: props.savePathConfig,
  });

  useStateBridgePresets({
    clusterPresets: props.clusterPresets,
    presetDraft: props.presetDraft,
    editingPresetId: props.editingPresetId,
    paletteCollapsed: props.paletteCollapsed,
    expandedPaletteGroups: props.expandedPaletteGroups,
    saveDbQueryPresets: props.saveDbQueryPresets,
    saveDbNodePresets: props.saveDbNodePresets,
  });

  useStateBridgeRunHistory({
    runFilter: props.runFilter,
    expandedRunHistory: props.expandedRunHistory,
    runHistorySelection: props.runHistorySelection,
  });
}
