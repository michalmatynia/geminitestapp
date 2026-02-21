'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
  AiNode,
  Edge,
  RuntimePortValues,
  RuntimeState,
  PathExecutionMode,
} from '@/features/ai/ai-paths/lib';
import {
  TRIGGER_EVENTS,
  entityApi,
} from '@/features/ai/ai-paths/lib';
import { getProductDetailQueryKey } from '@/features/products/hooks/productCache';
import {
  AI_PATHS_ENTITY_STALE_MS,
} from '@/shared/contracts/ai-paths-runtime';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { 
  buildSimulationContext, 
} from './utils';

type SimulationArgs = {
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  executionMode: PathExecutionMode;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  runtimeStateRef: React.MutableRefObject<RuntimeState>;
  pendingSimulationContextRef: React.MutableRefObject<Record<string, unknown> | null>;
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, fallbackMessage?: string) => void;
  toast: (message: string, options?: { variant?: 'success' | 'error' | 'info' | 'warning'; duration?: number; error?: unknown }) => void;
  // Local logic callbacks
  runGraphForTrigger: (triggerNode: AiNode, event?: React.MouseEvent, contextOverride?: Record<string, unknown>) => Promise<void>;
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
          staleTime: AI_PATHS_ENTITY_STALE_MS,
        });
      } catch (error) {
        args.reportAiPathsError(error, { action: 'fetchProduct', productId }, 'Failed to fetch product:');
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
          staleTime: AI_PATHS_ENTITY_STALE_MS,
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
      const entityId = typeof simulationContext['entityId'] === 'string' ? simulationContext['entityId'] : null;
      const entityType = typeof simulationContext['entityType'] === 'string' ? simulationContext['entityType'] : null;
      const productId = typeof simulationContext['productId'] === 'string' ? simulationContext['productId'] : null;
      const simulationOutputs: RuntimePortValues = {
        context: simulationContext,
        ...(entityId ? { entityId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(productId ? { productId } : {}),
        ...(simulationContext['entityJson'] !== undefined ? { entityJson: simulationContext['entityJson'] } : {}),
      };
      args.setRuntimeState((prev: RuntimeState): RuntimeState => {
        const nextOutputs = {
          ...(prev.outputs ?? {}),
          [simulationNode.id]: {
            ...((prev.outputs?.[simulationNode.id] ?? {})),
            ...simulationOutputs,
          },
        };
        // Just merging outputs for simulation start
        const next: RuntimeState = {
          ...prev,
          outputs: nextOutputs,
        };
        args.runtimeStateRef.current = next;
        return next;
      });
    },
    [args]
  );

  const dispatchTrigger = useCallback((eventName: string, entityId: string, entityType?: string): void => {
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
  }, []);

  const handleRunSimulation = useCallback(
    async (simulationNode: AiNode, triggerEvent?: string): Promise<void> => {
      const entityId =
        simulationNode.config?.simulation?.entityId?.trim() ||
        simulationNode.config?.simulation?.productId?.trim();
      const entityType =
        normalizeEntityType(simulationNode.config?.simulation?.entityType) ?? 'product';
      if (!entityId) {
        args.toast('Enter an Entity ID in the simulation node.', { variant: 'error' });
        return;
      }
      
      const initialContext = buildSimulationContext({ entityId, entityType, entity: null });
      args.pendingSimulationContextRef.current = {
        ...(args.pendingSimulationContextRef.current ?? {}),
        ...initialContext,
      };
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
          if (!edge.source || !edge.target) return;
          const fromSet = adjacency.get(edge.source) ?? new Set<string>();
          fromSet.add(edge.target);
          adjacency.set(edge.source, fromSet);
          const toSet = adjacency.get(edge.target) ?? new Set<string>();
          toSet.add(edge.source);
          adjacency.set(edge.target, toSet);
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
          const triggerCandidates = args.normalizedNodes.filter((node: AiNode): boolean => node.type === 'trigger');
          if (triggerCandidates.length === 1) {
            triggerNode = triggerCandidates[0];
            args.toast('No Trigger node connected; using the only Trigger in this path.', {
              variant: 'info',
            });
          }
        }
        if (!triggerNode) {
          args.toast('Connect a Trigger node to run the simulation.', { variant: 'error' });
          args.pendingSimulationContextRef.current = null;
          return;
        }
        const enrichedContext = await enrichContext();
        const simulationContext = enrichedContext ?? initialContext;
        args.pendingSimulationContextRef.current = {
          ...(args.pendingSimulationContextRef.current ?? {}),
          ...simulationContext,
        };
        eventName = triggerNode.config?.trigger?.event ?? eventName;
        await args.runGraphForTrigger(triggerNode, undefined, simulationContext);
        dispatchTrigger(eventName, entityId, entityType);
        if (!enrichedContext) {
          args.toast(`No entity found for ${entityType} ${entityId}. Using fallback context.`, {
            variant: 'info',
          });
        }
      } else {
        // Implementation for manual event trigger
        const enrichedContext = await fetchEntityByType(entityType, entityId);
        const simulationContext = enrichedContext 
          ? buildSimulationContext({ entityId, entityType, entity: enrichedContext })
          : initialContext;
        args.pendingSimulationContextRef.current = {
          ...(args.pendingSimulationContextRef.current ?? {}),
          ...simulationContext,
        };
        
        const triggerNode = args.normalizedNodes.find(
          (node: AiNode): boolean => node.type === 'trigger' && node.config?.trigger?.event === triggerEvent
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
    seedSimulationRuntimeState
  };
}
