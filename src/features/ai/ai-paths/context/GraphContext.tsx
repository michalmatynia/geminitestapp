'use client';

import { createContext, useContext, useState, useMemo, useCallback, useRef, type ReactNode } from 'react';

import type {
  AiNode,
  Edge,
  PathMeta,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
  NodeConfig,
} from '@/shared/lib/ai-paths';
import { initialNodes, initialEdges, normalizeNodes, sanitizeEdges } from '@/shared/lib/ai-paths';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphMutationReason =
  | 'drop'
  | 'drag'
  | 'select'
  | 'delete'
  | 'bridge_sync'
  | 'load_path'
  | 'update'
  | 'unknown';

export interface GraphMutationMeta {
  reason?: GraphMutationReason;
  source?: string;
  allowNodeCountDecrease?: boolean;
}

export interface GraphMutationRecord {
  revision: number;
  reason: GraphMutationReason;
  source: string | null;
  timestamp: string;
  changedNodes: boolean;
  changedEdges: boolean;
}

export interface GraphState {
  // Core graph data
  nodes: AiNode[];
  edges: Edge[];

  // Path management
  paths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  activePathId: string | null;

  // Active path metadata
  pathName: string;
  pathDescription: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  flowIntensity: PathFlowIntensity;
  runMode: PathRunMode;
  strictFlowMode: boolean;

  // Path flags
  isPathLocked: boolean;
  isPathActive: boolean;
  graphRevision: number;
  lastMutation: GraphMutationRecord | null;
}

export interface GraphActions {
  // Node actions
  setNodes: (
    nodes: AiNode[] | ((prev: AiNode[]) => AiNode[]),
    mutationMeta?: GraphMutationMeta
  ) => void;
  addNode: (node: AiNode) => void;
  updateNode: (nodeId: string, update: Partial<AiNode>) => void;
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void;
  removeNode: (nodeId: string) => void;

  // Edge actions
  setEdges: (
    edges: Edge[] | ((prev: Edge[]) => Edge[]),
    mutationMeta?: GraphMutationMeta
  ) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  clearEdges: () => void;

  // Path management
  setPaths: (paths: PathMeta[] | ((prev: PathMeta[]) => PathMeta[])) => void;
  setPathConfigs: (
    configs:
      | Record<string, PathConfig>
      | ((prev: Record<string, PathConfig>) => Record<string, PathConfig>)
  ) => void;
  setActivePathId: (pathId: string | null) => void;

  // Path metadata
  setPathName: (name: string) => void;
  setPathDescription: (description: string) => void;
  setActiveTrigger: (trigger: string) => void;
  setExecutionMode: (mode: PathExecutionMode) => void;
  setFlowIntensity: (intensity: PathFlowIntensity) => void;
  setRunMode: (mode: PathRunMode) => void;
  setStrictFlowMode: (enabled: boolean) => void;

  // Path flags
  setIsPathLocked: (locked: boolean) => void;
  togglePathLock: () => void;
  setIsPathActive: (active: boolean) => void;
  togglePathActive: () => void;

  // Bulk operations
  loadGraph: (data: {
    nodes: AiNode[];
    edges: Edge[];
    pathName?: string | undefined;
    pathDescription?: string | undefined;
    activeTrigger?: string | undefined;
    executionMode?: PathExecutionMode | undefined;
    flowIntensity?: PathFlowIntensity | undefined;
    runMode?: PathRunMode | undefined;
    strictFlowMode?: boolean | undefined;
    isPathLocked?: boolean | undefined;
    isPathActive?: boolean | undefined;
  }) => void;
  resetGraph: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PATH_NAME = 'AI Description Path';
const DEFAULT_PATH_DESCRIPTION =
  'Visual analysis + description generation with structured updates.';
const DEFAULT_TRIGGER = 'Product Modal - Context Filter';
const DEFAULT_EXECUTION_MODE: PathExecutionMode = 'server';
const DEFAULT_FLOW_INTENSITY: PathFlowIntensity = 'medium';
const DEFAULT_RUN_MODE: PathRunMode = 'manual';
const DEFAULT_STRICT_FLOW_MODE = true;

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const GraphStateContext = createContext<GraphState | null>(null);
const GraphActionsContext = createContext<GraphActions | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface GraphProviderProps {
  children: ReactNode;
  initialNodesData?: AiNode[] | undefined;
  initialEdgesData?: Edge[] | undefined;
  initialPaths?: PathMeta[] | undefined;
  initialPathConfigs?: Record<string, PathConfig> | undefined;
  initialActivePathId?: string | null | undefined;
}

export function GraphProvider({
  children,
  initialNodesData = initialNodes,
  initialEdgesData = initialEdges,
  initialPaths = [],
  initialPathConfigs = {},
  initialActivePathId = null,
}: GraphProviderProps): React.ReactNode {
  // Core graph data
  const [nodes, setNodesInternal] = useState<AiNode[]>(initialNodesData);
  const [edges, setEdgesInternal] = useState<Edge[]>(initialEdgesData);

  // Path management
  const [paths, setPathsInternal] = useState<PathMeta[]>(initialPaths);
  const [pathConfigs, setPathConfigsInternal] =
    useState<Record<string, PathConfig>>(initialPathConfigs);
  const [activePathId, setActivePathIdInternal] = useState<string | null>(initialActivePathId);

  // Active path metadata
  const [pathName, setPathNameInternal] = useState(DEFAULT_PATH_NAME);
  const [pathDescription, setPathDescriptionInternal] = useState(DEFAULT_PATH_DESCRIPTION);
  const [activeTrigger, setActiveTriggerInternal] = useState(DEFAULT_TRIGGER);
  const [executionMode, setExecutionModeInternal] =
    useState<PathExecutionMode>(DEFAULT_EXECUTION_MODE);
  const [flowIntensity, setFlowIntensityInternal] =
    useState<PathFlowIntensity>(DEFAULT_FLOW_INTENSITY);
  const [runMode, setRunModeInternal] = useState<PathRunMode>(DEFAULT_RUN_MODE);
  const [strictFlowMode, setStrictFlowModeInternal] = useState<boolean>(DEFAULT_STRICT_FLOW_MODE);

  // Path flags
  const [isPathLocked, setIsPathLockedInternal] = useState(false);
  const [isPathActive, setIsPathActiveInternal] = useState(true);
  const [graphRevision, setGraphRevision] = useState(0);
  const [lastMutation, setLastMutation] = useState<GraphMutationRecord | null>(null);

  const graphRevisionRef = useRef(0);
  const pendingMutationMetaRef = useRef<GraphMutationMeta | null>(null);

  graphRevisionRef.current = graphRevision;

  const registerGraphMutation = useCallback(
    ({
      changedNodes,
      changedEdges,
      fallbackReason,
    }: {
      changedNodes: boolean;
      changedEdges: boolean;
      fallbackReason?: GraphMutationReason;
    }): void => {
      if (!changedNodes && !changedEdges) return;
      const meta = pendingMutationMetaRef.current;
      pendingMutationMetaRef.current = null;
      const reason = meta?.reason ?? fallbackReason ?? 'unknown';
      const nextRevision = graphRevisionRef.current + 1;
      graphRevisionRef.current = nextRevision;
      setGraphRevision(nextRevision);
      setLastMutation({
        revision: nextRevision,
        reason,
        source: typeof meta?.source === 'string' ? meta.source : null,
        timestamp: new Date().toISOString(),
        changedNodes,
        changedEdges,
      });
    },
    []
  );

  const setNodes = useCallback(
    (
      nextNodes:
        | AiNode[]
        | ((prev: AiNode[]) => AiNode[]),
      mutationMeta?: GraphMutationMeta
    ): void => {
      const reason = mutationMeta?.reason ?? 'unknown';
      const shouldEnforceNodeCountInvariant =
        reason === 'drag' || reason === 'select' || reason === 'bridge_sync';
      pendingMutationMetaRef.current = mutationMeta ?? { reason };
      let changedNodes = false;
      setNodesInternal((prev: AiNode[]): AiNode[] => {
        const resolved = typeof nextNodes === 'function' ? nextNodes(prev) : nextNodes;
        const normalized = normalizeNodes(resolved);
        if (
          shouldEnforceNodeCountInvariant &&
          normalized.length < prev.length &&
          mutationMeta?.allowNodeCountDecrease !== true
        ) {
          console.warn(
            '[ai-paths] Rejected non-destructive node mutation that would decrease node count.',
            {
              reason,
              source: mutationMeta?.source ?? null,
              previousCount: prev.length,
              nextCount: normalized.length,
              revision: graphRevisionRef.current,
            }
          );
          pendingMutationMetaRef.current = null;
          return prev;
        }
        changedNodes =
          normalized.length !== prev.length ||
          normalized.some((node: AiNode, index: number): boolean => node !== prev[index]);
        return normalized;
      });
      if (changedNodes) {
        registerGraphMutation({
          changedNodes: true,
          changedEdges: false,
          fallbackReason: reason,
        });
      } else {
        pendingMutationMetaRef.current = null;
      }
    },
    [registerGraphMutation]
  );

  const setEdges = useCallback(
    (
      nextEdges:
        | Edge[]
        | ((prev: Edge[]) => Edge[]),
      mutationMeta?: GraphMutationMeta
    ): void => {
      const reason = mutationMeta?.reason ?? 'unknown';
      pendingMutationMetaRef.current = mutationMeta ?? { reason };
      let changedEdges = false;
      setEdgesInternal((prev: Edge[]): Edge[] => {
        const resolved = typeof nextEdges === 'function' ? nextEdges(prev) : nextEdges;
        changedEdges =
          resolved.length !== prev.length ||
          resolved.some((edge: Edge, index: number): boolean => edge !== prev[index]);
        return resolved;
      });
      if (changedEdges) {
        registerGraphMutation({
          changedNodes: false,
          changedEdges: true,
          fallbackReason: reason,
        });
      } else {
        pendingMutationMetaRef.current = null;
      }
    },
    [registerGraphMutation]
  );

  // Memoized node operations
  const addNode = useCallback((node: AiNode) => {
    setNodes((prev) => [...prev, node], { reason: 'drop', source: 'graph.addNode' });
  }, [setNodes]);

  const updateNode = useCallback((nodeId: string, update: Partial<AiNode>) => {
    setNodes(
      (prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...update } : node)),
      { reason: 'update', source: 'graph.updateNode' }
    );
  }, [setNodes]);

  const updateNodeConfig = useCallback((nodeId: string, config: NodeConfig) => {
    setNodes(
      (prev) => prev.map((node) => (node.id === nodeId ? { ...node, config } : node)),
      { reason: 'update', source: 'graph.updateNodeConfig' }
    );
  }, [setNodes]);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(
      (prev) => prev.filter((node) => node.id !== nodeId),
      { reason: 'delete', source: 'graph.removeNode', allowNodeCountDecrease: true }
    );
    // Also remove connected edges
    setEdges(
      (prev) => prev.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
      { reason: 'delete', source: 'graph.removeNode' }
    );
  }, [setEdges, setNodes]);

  // Memoized edge operations
  const addEdge = useCallback((edge: Edge) => {
    setEdges((prev) => [...prev, edge], { reason: 'update', source: 'graph.addEdge' });
  }, [setEdges]);

  const removeEdge = useCallback((edgeId: string) => {
    setEdges(
      (prev) => prev.filter((edge) => edge.id !== edgeId),
      { reason: 'delete', source: 'graph.removeEdge' }
    );
  }, [setEdges]);

  const clearEdges = useCallback(() => {
    setEdges([], { reason: 'delete', source: 'graph.clearEdges' });
  }, [setEdges]);

  // Bulk operations
  const loadGraph = useCallback(
    (data: {
      nodes: AiNode[];
      edges: Edge[];
      pathName?: string | undefined;
      pathDescription?: string | undefined;
      activeTrigger?: string | undefined;
      executionMode?: PathExecutionMode | undefined;
      flowIntensity?: PathFlowIntensity | undefined;
      runMode?: PathRunMode | undefined;
      strictFlowMode?: boolean | undefined;
      isPathLocked?: boolean | undefined;
      isPathActive?: boolean | undefined;
    }) => {
      const normalizedNodes = normalizeNodes(data.nodes);
      const sanitizedEdges = sanitizeEdges(normalizedNodes, data.edges);
      setNodes(normalizedNodes, { reason: 'load_path', source: 'graph.loadGraph' });
      setEdges(sanitizedEdges, { reason: 'load_path', source: 'graph.loadGraph' });
      if (data.pathName !== undefined) setPathNameInternal(data.pathName);
      if (data.pathDescription !== undefined) setPathDescriptionInternal(data.pathDescription);
      if (data.activeTrigger !== undefined) setActiveTriggerInternal(data.activeTrigger);
      if (data.executionMode !== undefined) setExecutionModeInternal(data.executionMode);
      if (data.flowIntensity !== undefined) setFlowIntensityInternal(data.flowIntensity);
      if (data.runMode !== undefined) setRunModeInternal(data.runMode);
      if (data.strictFlowMode !== undefined) setStrictFlowModeInternal(data.strictFlowMode);
      if (data.isPathLocked !== undefined) setIsPathLockedInternal(data.isPathLocked);
      if (data.isPathActive !== undefined) setIsPathActiveInternal(data.isPathActive);
    },
    [setEdges, setNodes]
  );

  const resetGraph = useCallback(() => {
    setNodes(initialNodes, { reason: 'load_path', source: 'graph.resetGraph' });
    setEdges(initialEdges, { reason: 'load_path', source: 'graph.resetGraph' });
    setPathNameInternal(DEFAULT_PATH_NAME);
    setPathDescriptionInternal(DEFAULT_PATH_DESCRIPTION);
    setActiveTriggerInternal(DEFAULT_TRIGGER);
    setExecutionModeInternal(DEFAULT_EXECUTION_MODE);
    setFlowIntensityInternal(DEFAULT_FLOW_INTENSITY);
    setStrictFlowModeInternal(DEFAULT_STRICT_FLOW_MODE);
    setIsPathLockedInternal(false);
    setIsPathActiveInternal(true);
  }, [setEdges, setNodes]);

  // Actions are stable
  const actions = useMemo<GraphActions>(
    () => ({
      // Node actions
      setNodes,
      addNode,
      updateNode,
      updateNodeConfig,
      removeNode,

      // Edge actions
      setEdges,
      addEdge,
      removeEdge,
      clearEdges,

      // Path management
      setPaths: setPathsInternal,
      setPathConfigs: setPathConfigsInternal,
      setActivePathId: setActivePathIdInternal,

      // Path metadata
      setPathName: setPathNameInternal,
      setPathDescription: setPathDescriptionInternal,
      setActiveTrigger: setActiveTriggerInternal,
      setExecutionMode: setExecutionModeInternal,
      setFlowIntensity: setFlowIntensityInternal,
      setRunMode: setRunModeInternal,
      setStrictFlowMode: setStrictFlowModeInternal,

      // Path flags
      setIsPathLocked: setIsPathLockedInternal,
      togglePathLock: () => setIsPathLockedInternal((prev) => !prev),
      setIsPathActive: setIsPathActiveInternal,
      togglePathActive: () => setIsPathActiveInternal((prev) => !prev),

      // Bulk operations
      loadGraph,
      resetGraph,
    }),
    [
      setNodes,
      addNode,
      updateNode,
      updateNodeConfig,
      removeNode,
      setEdges,
      addEdge,
      removeEdge,
      clearEdges,
      loadGraph,
      resetGraph,
    ]
  );

  const state = useMemo<GraphState>(
    () => ({
      nodes,
      edges,
      paths,
      pathConfigs,
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      strictFlowMode,
      isPathLocked,
      isPathActive,
      graphRevision,
      lastMutation,
    }),
    [
      nodes,
      edges,
      paths,
      pathConfigs,
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      strictFlowMode,
      isPathLocked,
      isPathActive,
      graphRevision,
      lastMutation,
    ]
  );

  return (
    <GraphActionsContext.Provider value={actions}>
      <GraphStateContext.Provider value={state}>{children}</GraphStateContext.Provider>
    </GraphActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current graph state.
 * Components using this will re-render when graph state changes.
 */
export function useGraphState(): GraphState {
  const context = useContext(GraphStateContext);
  if (!context) {
    throw new Error('useGraphState must be used within a GraphProvider');
  }
  return context;
}

/**
 * Get graph actions.
 * Components using this will NOT re-render when state changes.
 */
export function useGraphActions(): GraphActions {
  const context = useContext(GraphActionsContext);
  if (!context) {
    throw new Error('useGraphActions must be used within a GraphProvider');
  }
  return context;
}

/**
 * Combined hook for components that need both state and actions.
 */
export function useGraph(): GraphState & GraphActions {
  const state = useGraphState();
  const actions = useGraphActions();
  return { ...state, ...actions };
}

// ---------------------------------------------------------------------------
// Selector Hooks (for fine-grained subscriptions)
// ---------------------------------------------------------------------------

/**
 * Get just the nodes array.
 */
export function useNodes(): AiNode[] {
  const { nodes } = useGraphState();
  return nodes;
}

/**
 * Get just the edges array.
 */
export function useEdges(): Edge[] {
  const { edges } = useGraphState();
  return edges;
}

/**
 * Get a specific node by ID.
 */
export function useNode(nodeId: string | null): AiNode | null {
  const { nodes } = useGraphState();
  if (!nodeId) return null;
  return nodes.find((node) => node.id === nodeId) ?? null;
}

/**
 * Get the active path configuration.
 */
export function useActivePathConfig(): PathConfig | null {
  const { activePathId, pathConfigs } = useGraphState();
  if (!activePathId) return null;
  return pathConfigs[activePathId] ?? null;
}
