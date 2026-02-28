'use client';

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';

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
}

export interface GraphActions {
  // Node actions
  setNodes: (nodes: AiNode[] | ((prev: AiNode[]) => AiNode[])) => void;
  addNode: (node: AiNode) => void;
  updateNode: (nodeId: string, update: Partial<AiNode>) => void;
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void;
  removeNode: (nodeId: string) => void;

  // Edge actions
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
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

  // Memoized node operations
  const addNode = useCallback((node: AiNode) => {
    setNodesInternal((prev) => [...prev, node]);
  }, []);

  const updateNode = useCallback((nodeId: string, update: Partial<AiNode>) => {
    setNodesInternal((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, ...update } : node))
    );
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, config: NodeConfig) => {
    setNodesInternal((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, config } : node))
    );
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodesInternal((prev) => prev.filter((node) => node.id !== nodeId));
    // Also remove connected edges
    setEdgesInternal((prev) => prev.filter((edge) => edge.from !== nodeId && edge.to !== nodeId));
  }, []);

  // Memoized edge operations
  const addEdge = useCallback((edge: Edge) => {
    setEdgesInternal((prev) => [...prev, edge]);
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    setEdgesInternal((prev) => prev.filter((edge) => edge.id !== edgeId));
  }, []);

  const clearEdges = useCallback(() => {
    setEdgesInternal([]);
  }, []);

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
      setNodesInternal(normalizedNodes);
      setEdgesInternal(sanitizedEdges);
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
    []
  );

  const resetGraph = useCallback(() => {
    setNodesInternal(initialNodes);
    setEdgesInternal(initialEdges);
    setPathNameInternal(DEFAULT_PATH_NAME);
    setPathDescriptionInternal(DEFAULT_PATH_DESCRIPTION);
    setActiveTriggerInternal(DEFAULT_TRIGGER);
    setExecutionModeInternal(DEFAULT_EXECUTION_MODE);
    setFlowIntensityInternal(DEFAULT_FLOW_INTENSITY);
    setStrictFlowModeInternal(DEFAULT_STRICT_FLOW_MODE);
    setIsPathLockedInternal(false);
    setIsPathActiveInternal(true);
  }, []);

  // Actions are stable
  const actions = useMemo<GraphActions>(
    () => ({
      // Node actions
      setNodes: setNodesInternal,
      addNode,
      updateNode,
      updateNodeConfig,
      removeNode,

      // Edge actions
      setEdges: setEdgesInternal,
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
      addNode,
      updateNode,
      updateNodeConfig,
      removeNode,
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
