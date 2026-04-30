'use client';

import { useState, useMemo, useCallback, useRef } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { AiNode, Edge, NodeConfig, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import { initialNodes, initialEdges } from '@/shared/lib/ai-paths/core/constants';
import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  GraphActions,
  GraphDataState,
  GraphMutationMeta,
  GraphMutationReason,
  GraphMutationRecord,
  GraphProviderProps,
} from './GraphContext.shared';
import {
  usePathConfigActions,
  usePathConfigState,
} from './PathConfigContext';
import type {
  PathConfigActions,
  PathConfigState,
} from './PathConfigContext.shared';

export type {
  GraphActions,
  GraphDataState,
  GraphMutationMeta,
  GraphMutationReason,
  GraphMutationRecord,
  PathMetadataState,
} from './GraphContext.shared';

/** Combined graph data + active-path config. */
export type GraphState = GraphDataState & PathConfigState;

const createGraphStrictContext = <T,>(hookName: string) =>
  createStrictContext<T>({
    hookName,
    providerName: 'a GraphProvider',
    errorFactory: internalError,
  });

const {
  Context: GraphDataStateContext,
  useStrictContext: useGraphDataState,
} = createGraphStrictContext<GraphDataState>('useGraphDataState');

const {
  Context: GraphActionsContext,
  useStrictContext: useGraphActionsBase,
} = createGraphStrictContext<GraphActions>('useGraphActions');

export { useGraphDataState, useGraphActionsBase };

/**
 * Combined graph + path-config actions.
 *
 * Prefer the narrower `useGraphActionsBase()` (graph CRUD) and
 * `usePathConfigActions()` (active-path config) for re-render isolation.
 */
export function useGraphActions(): GraphActions & PathConfigActions {
  const graph = useGraphActionsBase();
  const config = usePathConfigActions();
  return useMemo(() => ({ ...graph, ...config }), [graph, config]);
}

/**
 * @deprecated Use `usePathConfigState()` (active-path config) plus
 * `useGraphDataState()` (paths/pathConfigs/activePathId) directly.
 */
export function usePathMetadataState(): GraphDataState & PathConfigState {
  const data = useGraphDataState();
  const config = usePathConfigState();
  return useMemo(() => ({ ...data, ...config }), [data, config]);
}

/** @deprecated Combined view; prefer narrower `useGraphDataState` / `usePathConfigState`. */
export const useGraphState = usePathMetadataState;

export function GraphProvider({
  children,
  initialNodesData = initialNodes,
  initialEdgesData = initialEdges,
  initialPaths = [],
  initialPathConfigs = {},
  initialActivePathId = null,
}: GraphProviderProps): React.ReactNode {
  const [nodes, setNodesInternal] = useState<AiNode[]>(initialNodesData);
  const [edges, setEdgesInternal] = useState<Edge[]>(initialEdgesData);

  const [paths, setPathsInternal] = useState<PathMeta[]>(initialPaths);
  const [pathConfigs, setPathConfigsInternal] =
    useState<Record<string, PathConfig>>(initialPathConfigs);
  const [activePathId, setActivePathIdInternal] = useState<string | null>(initialActivePathId);

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
          logClientError(new Error('Rejected node mutation that would decrease node count'), {
            context: {
              service: 'ai-paths',
              action: 'nodeMutation',
              reason,
              mutationSource: mutationMeta?.source ?? null,
              previousCount: prev.length,
              nextCount: normalized.length,
              revision: graphRevisionRef.current,
            },
          });
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
      setEdges((prev) => prev.filter((edge) => edge.from !== nodeId && edge.to !== nodeId), {
        reason: 'delete',
        source: 'graph.removeNode',
      });
    },
    [setEdges, setNodes]
  );

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

  const loadGraph = useCallback(
    (data: { nodes: AiNode[]; edges: Edge[] }) => {
      const normalizedNodes = normalizeNodes(data.nodes);
      const sanitizedEdges = sanitizeEdges(normalizedNodes, data.edges);
      setNodes(normalizedNodes, {
        reason: 'load_path',
        source: 'graph.loadGraph',
        allowNodeCountDecrease: true,
      });
      setEdges(sanitizedEdges, { reason: 'load_path', source: 'graph.loadGraph' });
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
  }, [setEdges, setNodes]);

  const actions = useMemo<GraphActions>(
    () => ({
      setNodes,
      addNode,
      updateNode,
      updateNodeConfig,
      removeNode,
      setEdges,
      addEdge,
      removeEdge,
      clearEdges,
      setPaths: setPathsInternal,
      setPathConfigs: setPathConfigsInternal,
      setActivePathId: setActivePathIdInternal,
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

  const graphDataState = useMemo<GraphDataState>(
    () => ({
      nodes,
      edges,
      graphRevision,
      lastMutation,
      paths,
      pathConfigs,
      activePathId,
    }),
    [nodes, edges, graphRevision, lastMutation, paths, pathConfigs, activePathId]
  );

  return (
    <GraphActionsContext.Provider value={actions}>
      <GraphDataStateContext.Provider value={graphDataState}>
        {children}
      </GraphDataStateContext.Provider>
    </GraphActionsContext.Provider>
  );
}
