import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

import { coerceInput } from '../../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const pickString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

type SimulationConfigSnapshot = {
  entityId: string | null;
  entityType: string;
};

const resolveSimulationConfig = (node: NodeHandlerContext['node']): SimulationConfigSnapshot => {
  const simulationConfig = (node.config?.simulation ?? {}) as Record<string, unknown>;
  return {
    entityId: pickString(
      (simulationConfig['entityId'] as string) ?? (simulationConfig['productId'] as string)
    ),
    entityType: pickString(simulationConfig['entityType'] as string) ?? 'product',
  };
};

const shouldRunSimulation = (
  node: NodeHandlerContext['node'],
  nodeInputs: NodeHandlerContext['nodeInputs']
): boolean => {
  const triggerInput = coerceInput(node.inputs.includes('trigger') ? nodeInputs['trigger'] : true);
  return triggerInput !== false;
};

const reportSimulationHydrationError = (
  error: unknown,
  context: {
    nodeId: string;
    nodeType: string;
    entityId: string;
    entityType: string;
  },
  reportAiPathsError: NodeHandlerContext['reportAiPathsError']
): void => {
  logClientError(error);
  reportAiPathsError?.(
    error,
    {
      service: 'ai-paths-runtime',
      nodeId: context.nodeId,
      nodeType: context.nodeType,
      entityId: context.entityId,
      entityType: context.entityType,
    },
    `Simulation hydration failed for ${context.entityType}:${context.entityId}`
  );
};

const hydrateSimulationEntity = async (input: {
  entityId: string | null;
  entityType: string;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  node: NodeHandlerContext['node'];
}): Promise<Record<string, unknown> | null> => {
  if (!input.entityId) return null;
  try {
    const entity = await input.fetchEntityCached(input.entityType, input.entityId);
    if (!entity) {
      input.toast?.(`No ${input.entityType} found for simulation ID ${input.entityId}.`, {
        variant: 'error',
      });
    }
    return entity;
  } catch (error) {
    reportSimulationHydrationError(
      error,
      {
        nodeId: input.node.id,
        nodeType: input.node.type,
        entityId: input.entityId,
        entityType: input.entityType,
      },
      input.reportAiPathsError
    );
    return null;
  }
};

const buildSimulationContext = (input: {
  node: NodeHandlerContext['node'];
  now: NodeHandlerContext['now'];
  activePathId: NodeHandlerContext['activePathId'];
  entityId: string | null;
  entityType: string;
  entity: Record<string, unknown> | null;
}): Record<string, unknown> => {
  const context: Record<string, unknown> = {
    source: input.node.title ?? input.node.id,
    timestamp: input.now,
    pathId: input.activePathId,
    contextSource: 'simulation',
    simulationNodeId: input.node.id,
    simulationNodeTitle: input.node.title ?? input.node.id,
    entityId: input.entityId,
    entityType: input.entityType,
    ...(input.entityId && input.entityType === 'product' ? { productId: input.entityId } : {}),
  };

  if (!input.entity) return context;
  context['entity'] = input.entity;
  context['entityJson'] = input.entity;
  if (input.entityType === 'product') {
    context['product'] = input.entity;
  }
  return context;
};

export const handleSimulation: NodeHandler = async ({
  node,
  nodeInputs,
  fetchEntityCached,
  reportAiPathsError,
  toast,
  now,
  activePathId,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const { entityId, entityType } = resolveSimulationConfig(node);
  if (!shouldRunSimulation(node, nodeInputs)) {
    return {};
  }

  const entity = await hydrateSimulationEntity({
    entityId,
    entityType,
    fetchEntityCached,
    reportAiPathsError,
    toast,
    node,
  });
  const context = buildSimulationContext({
    node,
    now,
    activePathId,
    entityType,
    entityId,
    entity,
  });

  return {
    context,
    entityId,
    entityType,
    entityJson: entity,
  };
};
