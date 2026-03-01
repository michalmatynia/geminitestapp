'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
  AiNode,
  AiPathsValidationConfig,
  Edge,
  RuntimePortValues,
  RuntimeState,
  PathExecutionMode,
} from '@/shared/lib/ai-paths';
import { TRIGGER_EVENTS, evaluateDataContractPreflight, entityApi } from '@/shared/lib/ai-paths';
import { getProductDetailQueryKey } from '@/features/products/hooks/productCache';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { buildSimulationContext } from './utils';

type SimulationArgs = {
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  executionMode: PathExecutionMode;
  aiPathsValidation?: AiPathsValidationConfig | undefined;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  runtimeStateRef: React.MutableRefObject<RuntimeState>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  toast: (
    message: string,
    options?: {
      variant?: 'success' | 'error' | 'info' | 'warning';
      duration?: number;
      error?: unknown;
    }
  ) => void;
  // Local logic callbacks
  runGraphForTrigger: (
    triggerNode: AiNode,
    event?: React.MouseEvent,
    contextOverride?: Record<string, unknown>
  ) => Promise<void>;
};

const resolveEdgeFromNodeId = (edge: Edge): string | null =>
  typeof edge.from === 'string' && edge.from.trim().length > 0
    ? edge.from.trim()
    : typeof edge.source === 'string' && edge.source.trim().length > 0
      ? edge.source.trim()
      : null;

const resolveEdgeToNodeId = (edge: Edge): string | null =>
  typeof edge.to === 'string' && edge.to.trim().length > 0
    ? edge.to.trim()
    : typeof edge.target === 'string' && edge.target.trim().length > 0
      ? edge.target.trim()
      : null;

const resolveEdgeFromPort = (edge: Edge): string | null =>
  typeof edge.fromPort === 'string' && edge.fromPort.trim().length > 0
    ? edge.fromPort.trim()
    : typeof edge.sourceHandle === 'string' && edge.sourceHandle.trim().length > 0
      ? edge.sourceHandle.trim()
      : null;

const resolveEdgeToPort = (edge: Edge): string | null =>
  typeof edge.toPort === 'string' && edge.toPort.trim().length > 0
    ? edge.toPort.trim()
    : typeof edge.targetHandle === 'string' && edge.targetHandle.trim().length > 0
      ? edge.targetHandle.trim()
      : null;

export const applySimulationPreviewToRuntimeState = (args: {
  runtimeState: RuntimeState;
  simulationNode: AiNode;
  simulationOutputs: RuntimePortValues;
  edges: Edge[];
}): RuntimeState => {
  const nextOutputs: Record<string, RuntimePortValues> = {
    ...(args.runtimeState.outputs ?? {}),
    [args.simulationNode.id]: {
      ...(args.runtimeState.outputs?.[args.simulationNode.id] ?? {}),
      ...args.simulationOutputs,
    },
  };

  const nextInputs: Record<string, RuntimePortValues> = {
    ...(args.runtimeState.inputs ?? {}),
  };

  args.edges.forEach((edge: Edge): void => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    if (fromNodeId !== args.simulationNode.id) return;
    const toNodeId = resolveEdgeToNodeId(edge);
    const fromPort = resolveEdgeFromPort(edge);
    const toPort = resolveEdgeToPort(edge);
    if (!toNodeId || !fromPort || !toPort) return;
    const previewValue = args.simulationOutputs[fromPort];
    if (previewValue === undefined) return;
    nextInputs[toNodeId] = {
      ...(nextInputs[toNodeId] ?? {}),
      [toPort]: previewValue,
    };
  });

  return {
    ...args.runtimeState,
    inputs: nextInputs,
    outputs: nextOutputs,
  };
};

export function useAiPathsSimulation(args: SimulationArgs) {
  const queryClient = useQueryClient();

  const fetchProductById = useCallback(
    async (productId: string): Promise<Record<string, unknown> | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: getProductDetailQueryKey(productId),
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getProduct(productId);
            return result.ok ? result.data : null;
          },
          staleTime: 0,
        });
      } catch (error) {
        args.reportAiPathsError(
          error,
          { action: 'fetchProduct', productId },
          'Failed to fetch product:'
        );
        return null;
      }
    },
    [queryClient, args]
  );

  const fetchNoteById = useCallback(
    async (noteId: string): Promise<Record<string, unknown> | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.notes.detail(noteId),
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getNote(noteId);
            return result.ok ? result.data : null;
          },
          staleTime: 0,
        });
      } catch (error) {
        args.reportAiPathsError(error, { action: 'fetchNote', noteId }, 'Failed to fetch note:');
        return null;
      }
    },
    [queryClient, args]
  );

  const normalizeEntityType = useCallback((value?: string | null): string | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'product' || normalized === 'products') return 'product';
    if (normalized === 'note' || normalized === 'notes') return 'note';
    return normalized;
  }, []);

  const fetchEntityByType = useCallback(
    async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
      if (!entityType || !entityId) return null;
      const normalized = normalizeEntityType(entityType);
      if (normalized === 'product') {
        return fetchProductById(entityId);
      }
      if (normalized === 'note') {
        return fetchNoteById(entityId);
      }
      return null;
    },
    [normalizeEntityType, fetchProductById, fetchNoteById]
  );

  const seedSimulationRuntimeState = useCallback(
    (simulationNode: AiNode, simulationContext: Record<string, unknown>): void => {
      if (args.executionMode !== 'local') return;
      const entityId =
        typeof simulationContext['entityId'] === 'string' ? simulationContext['entityId'] : null;
      const entityType =
        typeof simulationContext['entityType'] === 'string'
          ? simulationContext['entityType']
          : null;
      const productId =
        typeof simulationContext['productId'] === 'string' ? simulationContext['productId'] : null;
      const simulationOutputs: RuntimePortValues = {
        context: simulationContext,
        ...(entityId ? { entityId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(productId ? { productId } : {}),
        ...(simulationContext['entityJson'] !== undefined
          ? { entityJson: simulationContext['entityJson'] }
          : {}),
      };
      const nextState = applySimulationPreviewToRuntimeState({
        runtimeState: args.runtimeStateRef.current,
        simulationNode,
        simulationOutputs,
        edges: args.sanitizedEdges,
      });
      args.runtimeStateRef.current = nextState;
      args.setRuntimeState(nextState);

      const nodeValidationEnabled = args.aiPathsValidation?.enabled !== false;
      void evaluateDataContractPreflight({
        nodes: args.normalizedNodes,
        edges: args.sanitizedEdges,
        runtimeState: nextState,
        mode: 'full',
        scopeMode: nodeValidationEnabled ? 'full' : 'reachable_from_roots',
        ...(!nodeValidationEnabled ? { scopeRootNodeIds: [simulationNode.id] } : {}),
      });
    },
    [args]
  );

  const dispatchTrigger = useCallback(
    (eventName: string, entityId: string, entityType?: string): void => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(
        new CustomEvent('ai-path-trigger', {
          detail: {
            trigger: eventName,
            productId: entityId,
            entityId,
            entityType: entityType ?? 'product',
          },
        })
      );
    },
    []
  );

  const handleRunSimulation = useCallback(
    async (simulationNode: AiNode, triggerEvent?: string): Promise<void> => {
      const entityId =
        simulationNode.config?.simulation?.entityId?.trim() ||
        simulationNode.config?.simulation?.productId?.trim();
      const entityType =
        normalizeEntityType(simulationNode.config?.simulation?.entityType) ?? 'product';

      if (!entityId) {
        // No entity ID configured — run with a minimal simulation context.
        // Nodes that require entity data will produce 'blocked' status naturally.
        args.toast('Simulating without entity data.', { variant: 'info' });
        const emptyContext: Record<string, unknown> = {
          contextSource: 'simulation_manual',
          source: 'simulation',
        };
        seedSimulationRuntimeState(simulationNode, emptyContext);
        if (triggerEvent) {
          const triggerNode = args.normalizedNodes.find(
            (node: AiNode): boolean =>
              node.type === 'trigger' && node.config?.trigger?.event === triggerEvent
          );
          if (triggerNode) {
            await args.runGraphForTrigger(triggerNode, undefined, emptyContext);
          }
        } else {
          const triggerCandidates = args.normalizedNodes.filter(
            (node: AiNode): boolean => node.type === 'trigger'
          );
          if (triggerCandidates.length === 0) {
            args.toast('Connect a Trigger node to run the simulation.', { variant: 'error' });
            return;
          }
          const triggerNode =
            triggerCandidates.length === 1
              ? triggerCandidates[0]
              : triggerCandidates.find((n: AiNode) =>
                  args.sanitizedEdges.some(
                    (e: Edge) =>
                      (e.from === n.id || e.source === n.id) &&
                      (e.to === simulationNode.id || e.target === simulationNode.id)
                  )
                ) ?? triggerCandidates[0];
          if (!triggerNode) {
            args.toast('Connect a Trigger node to run the simulation.', { variant: 'error' });
            return;
          }
          await args.runGraphForTrigger(triggerNode, undefined, emptyContext);
        }
        return;
      }

      const initialContext = buildSimulationContext({ entityId, entityType, entity: null });
      seedSimulationRuntimeState(simulationNode, initialContext);

      const enrichContext = async (): Promise<Record<string, unknown> | null> => {
        const entity = await fetchEntityByType(entityType, entityId);
        if (!entity) return null;
        const enrichedContext = buildSimulationContext({ entityId, entityType, entity });
        seedSimulationRuntimeState(simulationNode, enrichedContext);
        return enrichedContext;
      };

      let eventName = triggerEvent ?? TRIGGER_EVENTS[0]?.id ?? 'manual';
      if (!triggerEvent) {
        // BFS to find connected trigger
        const adjacency = new Map<string, Set<string>>();
        args.sanitizedEdges.forEach((edge: Edge) => {
          const fromNodeId =
            typeof edge.from === 'string' && edge.from.trim().length > 0
              ? edge.from
              : typeof edge.source === 'string' && edge.source.trim().length > 0
                ? edge.source
                : null;
          const toNodeId =
            typeof edge.to === 'string' && edge.to.trim().length > 0
              ? edge.to
              : typeof edge.target === 'string' && edge.target.trim().length > 0
                ? edge.target
                : null;
          if (!fromNodeId || !toNodeId) return;
          const fromSet = adjacency.get(fromNodeId) ?? new Set<string>();
          fromSet.add(toNodeId);
          adjacency.set(fromNodeId, fromSet);
          const toSet = adjacency.get(toNodeId) ?? new Set<string>();
          toSet.add(fromNodeId);
          adjacency.set(toNodeId, toSet);
        });
        const connected = new Set<string>();
        const queue = [simulationNode.id];
        connected.add(simulationNode.id);
        while (queue.length) {
          const current = queue.shift();
          if (!current) continue;
          const neighbors = adjacency.get(current);
          if (!neighbors) continue;
          neighbors.forEach((neighbor: string) => {
            if (connected.has(neighbor)) return;
            connected.add(neighbor);
            queue.push(neighbor);
          });
        }
        const connectedTriggerIds = args.normalizedNodes
          .filter((node: AiNode): boolean => node.type === 'trigger' && connected.has(node.id))
          .map((node: AiNode) => node.id);
        let triggerNode = args.normalizedNodes.find(
          (node: AiNode): boolean =>
            node.type === 'trigger' && connectedTriggerIds.includes(node.id)
        );
        if (!triggerNode) {
          const triggerCandidates = args.normalizedNodes.filter(
            (node: AiNode): boolean => node.type === 'trigger'
          );
          if (triggerCandidates.length === 1) {
            triggerNode = triggerCandidates[0];
            args.toast('No Trigger node connected; using the only Trigger in this path.', {
              variant: 'info',
            });
          }
        }
        if (!triggerNode) {
          args.toast('Connect a Trigger node to run the simulation.', { variant: 'error' });
          return;
        }
        const enrichedContext = await enrichContext();
        const simulationContext = enrichedContext ?? initialContext;
        eventName = triggerNode.config?.trigger?.event ?? eventName;
        await args.runGraphForTrigger(triggerNode, undefined, simulationContext);
        dispatchTrigger(eventName, entityId, entityType);
        if (!enrichedContext) {
          args.toast(`No ${entityType} data found for ID ${entityId}.`, {
            variant: 'error',
          });
        }
      } else {
        // Implementation for manual event trigger
        const enrichedContext = await fetchEntityByType(entityType, entityId);
        if (!enrichedContext) {
          args.toast(`No ${entityType} data found for ID ${entityId}.`, {
            variant: 'error',
          });
        }
        const simulationContext = enrichedContext
          ? buildSimulationContext({ entityId, entityType, entity: enrichedContext })
          : initialContext;

        const triggerNode = args.normalizedNodes.find(
          (node: AiNode): boolean =>
            node.type === 'trigger' && node.config?.trigger?.event === triggerEvent
        );
        if (triggerNode) {
          await args.runGraphForTrigger(triggerNode, undefined, simulationContext);
        }
      }
    },
    [args, normalizeEntityType, fetchEntityByType, seedSimulationRuntimeState, dispatchTrigger]
  );

  return {
    handleRunSimulation,
    fetchEntityByType,
    buildSimulationContext,
    seedSimulationRuntimeState,
  };
}
