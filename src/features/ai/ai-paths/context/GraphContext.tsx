'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';

import { internalError } from '@/shared/errors/app-error';
import type {
  AiNode,
  AiPathsValidationConfig,
  Edge,
  NodeConfig,
  PathBlockedRunPolicy,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathMeta,
  PathRunMode,
} from '@/shared/lib/ai-paths';
import {
  initialNodes,
  initialEdges,
  normalizeNodes,
  sanitizeEdges,
} from '@/shared/lib/ai-paths';

import {
  DEFAULT_AI_PATHS_VALIDATION,
  DEFAULT_BLOCKED_RUN_POLICY,
  DEFAULT_EXECUTION_MODE,
  DEFAULT_FLOW_INTENSITY,
  DEFAULT_HISTORY_RETENTION_OPTIONS_MAX,
  DEFAULT_HISTORY_RETENTION_PASSES,
  DEFAULT_PATH_DESCRIPTION,
  DEFAULT_PATH_NAME,
  DEFAULT_RUN_MODE,
  DEFAULT_STRICT_FLOW_MODE,
  DEFAULT_TRIGGER,
} from './GraphContext.shared';

import type {
  GraphActions,
  GraphMutationMeta,
  GraphMutationReason,
  GraphMutationRecord,
  GraphProviderProps,
  GraphState,
} from './GraphContext.shared';

export type {
  GraphActions,
  GraphMutationMeta,
  GraphMutationReason,
  GraphMutationRecord,
  GraphState,
} from './GraphContext.shared';

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const GraphStateContext = createContext<GraphState | null>(null);
const GraphActionsContext = createContext<GraphActions | null>(null);

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
  const [blockedRunPolicy, setBlockedRunPolicyInternal] = useState<PathBlockedRunPolicy>(
    DEFAULT_BLOCKED_RUN_POLICY
  );
  const [aiPathsValidation, setAiPathsValidationInternal] = useState<AiPathsValidationConfig>(
    DEFAULT_AI_PATHS_VALIDATION
  );
  const [historyRetentionPasses, setHistoryRetentionPassesInternal] = useState<number>(
    DEFAULT_HISTORY_RETENTION_PASSES
  );
  const [historyRetentionOptionsMax, setHistoryRetentionOptionsMaxInternal] = useState<number>(
    DEFAULT_HISTORY_RETENTION_OPTIONS_MAX
  );

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
      nextNodes: AiNode[] | ((prev: AiNode[]) => AiNode[]),
      mutationMeta?: GraphMutationMeta
    ): void => {
      const reason = mutationMeta?.reason ?? 'unknown';
      const shouldEnforceNodeCountInvariant =
        reason === 'drag' || reason === 'select' || reason === 'load_path';
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
    (nextEdges: Edge[] | ((prev: Edge[]) => Edge[]), mutationMeta?: GraphMutationMeta): void => {
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
  const addNode = useCallback(
    (node: AiNode) => {
      setNodes((prev) => [...prev, node], { reason: 'drop', source: 'graph.addNode' });
    },
    [setNodes]
  );

  const updateNode = useCallback(
    (nodeId: string, update: Partial<AiNode>) => {
      setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...update } : node)), {
        reason: 'update',
        source: 'graph.updateNode',
      });
    },
    [setNodes]
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, config: NodeConfig) => {
      setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, config } : node)), {
        reason: 'update',
        source: 'graph.updateNodeConfig',
      });
    },
    [setNodes]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId), {
        reason: 'delete',
        source: 'graph.removeNode',
        allowNodeCountDecrease: true,
      });
      // Also remove connected edges
      setEdges((prev) => prev.filter((edge) => edge.from !== nodeId && edge.to !== nodeId), {
        reason: 'delete',
        source: 'graph.removeNode',
      });
    },
    [setEdges, setNodes]
  );

  // Memoized edge operations
  const addEdge = useCallback(
    (edge: Edge) => {
      setEdges((prev) => [...prev, edge], { reason: 'update', source: 'graph.addEdge' });
    },
    [setEdges]
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((edge) => edge.id !== edgeId), {
        reason: 'delete',
        source: 'graph.removeEdge',
      });
    },
    [setEdges]
  );

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
      blockedRunPolicy?: PathBlockedRunPolicy | undefined;
      aiPathsValidation?: AiPathsValidationConfig | undefined;
      historyRetentionPasses?: number | undefined;
      historyRetentionOptionsMax?: number | undefined;
      isPathLocked?: boolean | undefined;
      isPathActive?: boolean | undefined;
    }) => {
      const normalizedNodes = normalizeNodes(data.nodes);
      const sanitizedEdges = sanitizeEdges(normalizedNodes, data.edges);
      setNodes(normalizedNodes, {
        reason: 'load_path',
        source: 'graph.loadGraph',
        allowNodeCountDecrease: true,
      });
      setEdges(sanitizedEdges, { reason: 'load_path', source: 'graph.loadGraph' });
      if (data.pathName !== undefined) setPathNameInternal(data.pathName);
      if (data.pathDescription !== undefined) setPathDescriptionInternal(data.pathDescription);
      if (data.activeTrigger !== undefined) setActiveTriggerInternal(data.activeTrigger);
      if (data.executionMode !== undefined) setExecutionModeInternal(data.executionMode);
      if (data.flowIntensity !== undefined) setFlowIntensityInternal(data.flowIntensity);
      if (data.runMode !== undefined) setRunModeInternal(data.runMode);
      if (data.strictFlowMode !== undefined) setStrictFlowModeInternal(data.strictFlowMode);
      if (data.blockedRunPolicy !== undefined) setBlockedRunPolicyInternal(data.blockedRunPolicy);
      if (data.aiPathsValidation !== undefined)
        setAiPathsValidationInternal(data.aiPathsValidation);
      if (data.historyRetentionPasses !== undefined) {
        setHistoryRetentionPassesInternal(data.historyRetentionPasses);
      }
      if (data.historyRetentionOptionsMax !== undefined) {
        setHistoryRetentionOptionsMaxInternal(data.historyRetentionOptionsMax);
      }
      if (data.isPathLocked !== undefined) setIsPathLockedInternal(data.isPathLocked);
      if (data.isPathActive !== undefined) setIsPathActiveInternal(data.isPathActive);
    },
    [setEdges, setNodes]
  );

  const resetGraph = useCallback(() => {
    setNodes(initialNodes, {
      reason: 'load_path',
      source: 'graph.resetGraph',
      allowNodeCountDecrease: true,
    });
    setEdges(initialEdges, { reason: 'load_path', source: 'graph.resetGraph' });
    setPathNameInternal(DEFAULT_PATH_NAME);
    setPathDescriptionInternal(DEFAULT_PATH_DESCRIPTION);
    setActiveTriggerInternal(DEFAULT_TRIGGER);
    setExecutionModeInternal(DEFAULT_EXECUTION_MODE);
    setFlowIntensityInternal(DEFAULT_FLOW_INTENSITY);
    setRunModeInternal(DEFAULT_RUN_MODE);
    setStrictFlowModeInternal(DEFAULT_STRICT_FLOW_MODE);
    setBlockedRunPolicyInternal(DEFAULT_BLOCKED_RUN_POLICY);
    setAiPathsValidationInternal(DEFAULT_AI_PATHS_VALIDATION);
    setHistoryRetentionPassesInternal(DEFAULT_HISTORY_RETENTION_PASSES);
    setHistoryRetentionOptionsMaxInternal(DEFAULT_HISTORY_RETENTION_OPTIONS_MAX);
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
      setBlockedRunPolicy: setBlockedRunPolicyInternal,
      setAiPathsValidation: setAiPathsValidationInternal,
      setHistoryRetentionPasses: setHistoryRetentionPassesInternal,
      setHistoryRetentionOptionsMax: setHistoryRetentionOptionsMaxInternal,

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
      blockedRunPolicy,
      aiPathsValidation,
      historyRetentionPasses,
      historyRetentionOptionsMax,
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
      blockedRunPolicy,
      aiPathsValidation,
      historyRetentionPasses,
      historyRetentionOptionsMax,
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
    throw internalError('useGraphState must be used within a GraphProvider');
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
    throw internalError('useGraphActions must be used within a GraphProvider');
  }
  return context;
}
