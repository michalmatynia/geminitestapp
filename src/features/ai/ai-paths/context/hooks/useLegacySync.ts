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

import { useEffect } from "react";
import { useSelectionActions } from "../SelectionContext";
import { useCanvasActions } from "../CanvasContext";
import { useGraphActions } from "../GraphContext";
import { useRuntimeActions } from "../RuntimeContext";
import { usePersistenceActions } from "../PersistenceContext";
import type { AiNode, Edge, RuntimeState } from "@/features/ai/ai-paths/lib";
import type { ViewState } from "../CanvasContext";

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
}

/**
 * Sync canvas state from legacy hook to CanvasContext.
 */
export function useLegacySyncCanvas({ view }: LegacySyncCanvasProps): void {
  const actions = useCanvasActions();

  useEffect(() => {
    actions.setView(view);
  }, [view, actions]);
}

// ---------------------------------------------------------------------------
// Graph Sync
// ---------------------------------------------------------------------------

export interface LegacySyncGraphProps {
  nodes: AiNode[];
  edges: Edge[];
  activePathId?: string | null | undefined;
  pathName?: string | undefined;
  isPathLocked?: boolean | undefined;
  isPathActive?: boolean | undefined;
}

/**
 * Sync graph state from legacy hook to GraphContext.
 */
export function useLegacySyncGraph({
  nodes,
  edges,
  activePathId,
  pathName,
  isPathLocked,
  isPathActive,
}: LegacySyncGraphProps): void {
  const actions = useGraphActions();

  useEffect(() => {
    actions.setNodes(nodes);
  }, [nodes, actions]);

  useEffect(() => {
    actions.setEdges(edges);
  }, [edges, actions]);

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
}

/**
 * Sync persistence state from legacy hook to PersistenceContext.
 */
export function useLegacySyncPersistence({
  loading,
  saving,
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
  // Graph
  nodes: AiNode[];
  edges: Edge[];
  activePathId?: string | null | undefined;
  pathName?: string | undefined;
  isPathLocked?: boolean | undefined;
  isPathActive?: boolean | undefined;
  // Runtime
  runtimeState: RuntimeState;
  lastRunAt?: string | null | undefined;
  lastError?: { message: string; time: string; pathId?: string | null } | null | undefined;
  // Persistence
  loading: boolean;
  saving?: boolean | undefined;
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
  });

  useLegacySyncGraph({
    nodes: props.nodes,
    edges: props.edges,
    activePathId: props.activePathId,
    pathName: props.pathName,
    isPathLocked: props.isPathLocked,
    isPathActive: props.isPathActive,
  });

  useLegacySyncRuntime({
    runtimeState: props.runtimeState,
    lastRunAt: props.lastRunAt,
    lastError: props.lastError,
  });

  useLegacySyncPersistence({
    loading: props.loading,
    saving: props.saving,
  });
}
