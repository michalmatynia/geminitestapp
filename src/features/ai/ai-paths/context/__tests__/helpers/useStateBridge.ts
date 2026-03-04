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

import { useCanvasActions } from '../../CanvasContext';
import { useGraphActions, useGraphState } from '../../GraphContext';
import { usePersistenceActions } from '../../PersistenceContext';
import { usePresetsActions } from '../../PresetsContext';
import { useRunHistoryActions } from '../../RunHistoryContext';
import { useRuntimeActions, type RuntimeRunStatus } from '../../RuntimeContext';
import { useSelectionActions } from '../../SelectionContext';

import type { ViewState, PanState, DragState, ConnectingState } from '../../CanvasContext';
import type { SavePathConfigOptions } from '../../PersistenceContext';
import type { ClusterPresetDraft } from '../../PresetsContext';
import type { RunHistoryFilter } from '../../RunHistoryContext';
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
  const { nodes: contextNodes, edges: contextEdges, graphRevision, lastMutation } = useGraphState();
  const activePathTransitionRef = useRef<{
    pathId: string | null;
    sourceNodesHash: string;
    sourceEdgesHash: string;
    holdContextToSource: boolean;
    awaitingSourceGraphPayload: boolean;
  } | null>(null);
  const pendingContextNodesSyncRef = useRef<{
    hash: string;
    revision: number;
    pathId: string | null;
  } | null>(null);
  const pendingContextEdgesSyncRef = useRef<{
    hash: string;
    revision: number;
    pathId: string | null;
  } | null>(null);
  const lastBlockedNodeSyncRef = useRef<string | null>(null);
  const lastBlockedEdgeSyncRef = useRef<string | null>(null);
  const lastSuppressedNodeSyncRef = useRef<string | null>(null);
  const lastSuppressedEdgeSyncRef = useRef<string | null>(null);
  const lastSourceNodesHashRef = useRef<string>(stableStringify(nodes));
  const lastSourceEdgesHashRef = useRef<string>(stableStringify(edges));
  const lastSourcePathIdRef = useRef<string | null | undefined>(activePathId);
  const sourceNodesHash = stableStringify(nodes);
  const sourceEdgesHash = stableStringify(edges);
  const contextNodesHash = stableStringify(contextNodes);
  const contextEdgesHash = stableStringify(contextEdges);
  const normalizedActivePathId = activePathId ?? null;
  const shouldLogBridgeBlock = process.env.NODE_ENV !== 'test';
  const sourceNodesChangedThisRender = lastSourceNodesHashRef.current !== sourceNodesHash;
  const sourceEdgesChangedThisRender = lastSourceEdgesHashRef.current !== sourceEdgesHash;
  const sourcePathChangedThisRender = lastSourcePathIdRef.current !== activePathId;

  if (sourceNodesChangedThisRender) {
    lastSourceNodesHashRef.current = sourceNodesHash;
  }
  if (sourceEdgesChangedThisRender) {
    lastSourceEdgesHashRef.current = sourceEdgesHash;
  }
  if (sourcePathChangedThisRender) {
    lastSourcePathIdRef.current = activePathId;
    const sourceGraphMatchesContext =
      sourceNodesHash === contextNodesHash && sourceEdgesHash === contextEdgesHash;
    activePathTransitionRef.current = {
      pathId: normalizedActivePathId,
      sourceNodesHash,
      sourceEdgesHash,
      // If the source graph has already changed for the new path, allow one
      // authoritative source->context handoff immediately. Otherwise keep the
      // gate active but wait for the source graph payload to arrive.
      holdContextToSource: !sourceGraphMatchesContext,
      awaitingSourceGraphPayload: sourceGraphMatchesContext,
    };
    pendingContextNodesSyncRef.current = null;
    pendingContextEdgesSyncRef.current = null;
    lastBlockedNodeSyncRef.current = null;
    lastBlockedEdgeSyncRef.current = null;
    lastSuppressedNodeSyncRef.current = null;
    lastSuppressedEdgeSyncRef.current = null;
    if (shouldLogBridgeBlock) {
      console.debug('[ai-paths-bridge] path_transition_started', {
        pathId: normalizedActivePathId,
        sourceNodesHash: sourceNodesHash.slice(0, 48),
        sourceEdgesHash: sourceEdgesHash.slice(0, 48),
        awaitingSourceGraphPayload: sourceGraphMatchesContext,
      });
    }
  }

  const activeTransition = activePathTransitionRef.current;
  if (
    activeTransition?.pathId === normalizedActivePathId &&
    (activeTransition.sourceNodesHash !== sourceNodesHash ||
      activeTransition.sourceEdgesHash !== sourceEdgesHash)
  ) {
    activePathTransitionRef.current = {
      ...activeTransition,
      sourceNodesHash,
      sourceEdgesHash,
      // Re-arm one authoritative source->context pass when source graph payload changes
      // during an active path transition (for example delayed path graph hydration).
      holdContextToSource: true,
      awaitingSourceGraphPayload: false,
    };
  }
  const transitionGateActive = activePathTransitionRef.current?.pathId === normalizedActivePathId;
  const isBridgeSourceMutation =
    typeof lastMutation?.source === 'string' &&
    lastMutation.source.startsWith('state_bridge.source_to_context.');
  const isGraphLoadPathMutation =
    lastMutation?.source === 'graph.loadGraph' || lastMutation?.source === 'graph.resetGraph';
  const isUserOwnedGraphMutationDuringTransition =
    transitionGateActive &&
    Boolean(
      lastMutation &&
        (lastMutation.reason === 'drop' ||
          lastMutation.reason === 'drag' ||
          lastMutation.reason === 'update') &&
        !isBridgeSourceMutation &&
        !isGraphLoadPathMutation
    );

  useEffect(() => {
    const transition = activePathTransitionRef.current;
    if (!transition) return;
    if (transition.pathId !== normalizedActivePathId) {
      activePathTransitionRef.current = null;
      return;
    }
    if (transition.awaitingSourceGraphPayload) {
      return;
    }
    if (
      transition.sourceNodesHash === contextNodesHash &&
      transition.sourceEdgesHash === contextEdgesHash
    ) {
      activePathTransitionRef.current = null;
      lastSuppressedNodeSyncRef.current = null;
      lastSuppressedEdgeSyncRef.current = null;
      if (shouldLogBridgeBlock) {
        console.debug('[ai-paths-bridge] path_transition_sync_complete', {
          pathId: normalizedActivePathId,
          sourceNodesHash: sourceNodesHash.slice(0, 48),
          sourceEdgesHash: sourceEdgesHash.slice(0, 48),
        });
      }
    }
  }, [
    contextEdgesHash,
    contextNodesHash,
    normalizedActivePathId,
    shouldLogBridgeBlock,
    sourceEdgesHash,
    sourceNodesHash,
  ]);

  useLayoutEffect((): void => {
    if (!isUserOwnedGraphMutationDuringTransition) return;
    activePathTransitionRef.current = null;
    pendingContextNodesSyncRef.current = null;
    pendingContextEdgesSyncRef.current = null;
    lastBlockedNodeSyncRef.current = null;
    lastBlockedEdgeSyncRef.current = null;
    lastSuppressedNodeSyncRef.current = null;
    lastSuppressedEdgeSyncRef.current = null;
    if (shouldLogBridgeBlock) {
      console.debug('[ai-paths-bridge] path_transition_released_by_user_mutation', {
        pathId: normalizedActivePathId,
        revision: graphRevision,
        reason: lastMutation?.reason ?? null,
        source: lastMutation?.source ?? null,
      });
    }
  }, [
    graphRevision,
    isUserOwnedGraphMutationDuringTransition,
    lastMutation?.reason,
    lastMutation?.source,
    normalizedActivePathId,
    shouldLogBridgeBlock,
  ]);

  useEffect(() => {
    const transition = activePathTransitionRef.current;
    const isTransitionGateActiveForSync = transition?.pathId === normalizedActivePathId;
    const isAwaitingSourceGraphPayload =
      isTransitionGateActiveForSync && transition?.awaitingSourceGraphPayload === true;
    if (isAwaitingSourceGraphPayload) return;

    if (onNodesChangeFromContext && !isTransitionGateActiveForSync) {
      const pendingSync = pendingContextNodesSyncRef.current;
      if (pendingSync) {
        if (pendingSync.pathId !== normalizedActivePathId) {
          pendingContextNodesSyncRef.current = null;
        } else if (sourceNodesHash === pendingSync.hash) {
          pendingContextNodesSyncRef.current = null;
        } else {
          const blockedKey = `${pendingSync.revision}:${pendingSync.pathId ?? 'none'}:${sourceNodesHash.slice(0, 24)}:${contextNodesHash.slice(0, 24)}`;
          if (shouldLogBridgeBlock && lastBlockedNodeSyncRef.current !== blockedKey) {
            lastBlockedNodeSyncRef.current = blockedKey;
            console.debug('[ai-paths-bridge] blocked_same_path_pending_sync', {
              channel: 'nodes',
              activePathId: normalizedActivePathId,
              pendingPathId: pendingSync.pathId,
              pendingRevision: pendingSync.revision,
              sourceHash: sourceNodesHash.slice(0, 48),
              contextHash: contextNodesHash.slice(0, 48),
            });
          }
          return;
        }
      }
    }
    if (sourceNodesHash === contextNodesHash) return;
    lastBlockedNodeSyncRef.current = null;
    const transitionAllowsDestructiveNodeSync =
      isTransitionGateActiveForSync && transition?.holdContextToSource === true;
    actions.setNodes(nodes, {
      reason: isTransitionGateActiveForSync ? 'load_path' : 'bridge_sync',
      source: 'state_bridge.source_to_context.nodes',
      allowNodeCountDecrease:
        transitionAllowsDestructiveNodeSync ||
        (!isTransitionGateActiveForSync && sourceNodesChangedThisRender),
    });
  }, [
    actions,
    contextNodesHash,
    normalizedActivePathId,
    nodes,
    onNodesChangeFromContext,
    sourceNodesChangedThisRender,
    sourceNodesHash,
    shouldLogBridgeBlock,
    transitionGateActive,
  ]);

  useEffect(() => {
    const transition = activePathTransitionRef.current;
    const isTransitionGateActiveForSync = transition?.pathId === normalizedActivePathId;
    const isAwaitingSourceGraphPayload =
      isTransitionGateActiveForSync && transition?.awaitingSourceGraphPayload === true;
    if (isAwaitingSourceGraphPayload) return;

    if (onEdgesChangeFromContext && !isTransitionGateActiveForSync) {
      const pendingSync = pendingContextEdgesSyncRef.current;
      if (pendingSync) {
        if (pendingSync.pathId !== normalizedActivePathId) {
          pendingContextEdgesSyncRef.current = null;
        } else if (sourceEdgesHash === pendingSync.hash) {
          pendingContextEdgesSyncRef.current = null;
        } else {
          const blockedKey = `${pendingSync.revision}:${pendingSync.pathId ?? 'none'}:${sourceEdgesHash.slice(0, 24)}:${contextEdgesHash.slice(0, 24)}`;
          if (shouldLogBridgeBlock && lastBlockedEdgeSyncRef.current !== blockedKey) {
            lastBlockedEdgeSyncRef.current = blockedKey;
            console.debug('[ai-paths-bridge] blocked_same_path_pending_sync', {
              channel: 'edges',
              activePathId: normalizedActivePathId,
              pendingPathId: pendingSync.pathId,
              pendingRevision: pendingSync.revision,
              sourceHash: sourceEdgesHash.slice(0, 48),
              contextHash: contextEdgesHash.slice(0, 48),
            });
          }
          return;
        }
      }
    }
    if (sourceEdgesHash === contextEdgesHash) return;
    lastBlockedEdgeSyncRef.current = null;
    actions.setEdges(edges, {
      reason: isTransitionGateActiveForSync ? 'load_path' : 'bridge_sync',
      source: 'state_bridge.source_to_context.edges',
    });
  }, [
    actions,
    contextEdgesHash,
    edges,
    normalizedActivePathId,
    onEdgesChangeFromContext,
    sourceEdgesChangedThisRender,
    sourceEdgesHash,
    shouldLogBridgeBlock,
    transitionGateActive,
  ]);

  useLayoutEffect((): void => {
    if (!onNodesChangeFromContext) return;
    const transition = activePathTransitionRef.current;
    const isTransitionGateActiveForSync = transition?.pathId === normalizedActivePathId;
    if (isTransitionGateActiveForSync) {
      const blockedKey = `${normalizedActivePathId ?? 'none'}:${sourceNodesHash.slice(0, 24)}:${contextNodesHash.slice(0, 24)}`;
      if (shouldLogBridgeBlock && lastSuppressedNodeSyncRef.current !== blockedKey) {
        lastSuppressedNodeSyncRef.current = blockedKey;
        console.debug('[ai-paths-bridge] suppressed_context_to_source_during_path_transition', {
          channel: 'nodes',
          pathId: normalizedActivePathId,
          sourceHash: sourceNodesHash.slice(0, 48),
          contextHash: contextNodesHash.slice(0, 48),
        });
      }
      return;
    }
    if (sourceNodesHash === contextNodesHash) return;
    const pendingSync = pendingContextNodesSyncRef.current;
    if (pendingSync?.hash === contextNodesHash && pendingSync.pathId === normalizedActivePathId) {
      return;
    }
    pendingContextNodesSyncRef.current = {
      hash: contextNodesHash,
      revision: graphRevision,
      pathId: normalizedActivePathId,
    };
    lastSuppressedNodeSyncRef.current = null;
    onNodesChangeFromContext(contextNodes);
  }, [
    contextNodes,
    contextNodesHash,
    graphRevision,
    normalizedActivePathId,
    onNodesChangeFromContext,
    sourceNodesHash,
    shouldLogBridgeBlock,
    transitionGateActive,
  ]);

  useLayoutEffect((): void => {
    if (!onEdgesChangeFromContext) return;
    const transition = activePathTransitionRef.current;
    const isTransitionGateActiveForSync = transition?.pathId === normalizedActivePathId;
    if (isTransitionGateActiveForSync) {
      const blockedKey = `${normalizedActivePathId ?? 'none'}:${sourceEdgesHash.slice(0, 24)}:${contextEdgesHash.slice(0, 24)}`;
      if (shouldLogBridgeBlock && lastSuppressedEdgeSyncRef.current !== blockedKey) {
        lastSuppressedEdgeSyncRef.current = blockedKey;
        console.debug('[ai-paths-bridge] suppressed_context_to_source_during_path_transition', {
          channel: 'edges',
          pathId: normalizedActivePathId,
          sourceHash: sourceEdgesHash.slice(0, 48),
          contextHash: contextEdgesHash.slice(0, 48),
        });
      }
      return;
    }
    if (sourceEdgesHash === contextEdgesHash) return;
    const pendingSync = pendingContextEdgesSyncRef.current;
    if (pendingSync?.hash === contextEdgesHash && pendingSync.pathId === normalizedActivePathId) {
      return;
    }
    pendingContextEdgesSyncRef.current = {
      hash: contextEdgesHash,
      revision: graphRevision,
      pathId: normalizedActivePathId,
    };
    lastSuppressedEdgeSyncRef.current = null;
    onEdgesChangeFromContext(contextEdges);
  }, [
    contextEdges,
    contextEdgesHash,
    graphRevision,
    normalizedActivePathId,
    onEdgesChangeFromContext,
    sourceEdgesHash,
    shouldLogBridgeBlock,
    transitionGateActive,
  ]);

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
        fireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) =>
          handleFireTrigger(node, event),
      }),
      ...(handleFireTriggerPersistent !== undefined && {
        fireTriggerPersistent: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) =>
          handleFireTriggerPersistent(node, event),
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
        fetchUpdaterSample: (
          nodeId: string,
          entityType: string,
          entityId: string,
          options?: { notify?: boolean }
        ) => handleFetchUpdaterSample(nodeId, entityType, entityId, options),
      }),
      ...(handleRunSimulation !== undefined && {
        runSimulation: (node: AiNode, triggerEvent?: string) =>
          handleRunSimulation(node, triggerEvent),
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
