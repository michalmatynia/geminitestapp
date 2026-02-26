import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import { coerceInput } from '../../utils';

const pickString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const handleSimulation: NodeHandler = async ({
  node,
  nodeInputs,
  fetchEntityCached,
  reportAiPathsError,
  toast,
  now,
  activePathId,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const simulationConfig = (node.config?.simulation ?? {}) as Record<string, unknown>;
  
  const entityId = pickString(simulationConfig['entityId'] as string ?? simulationConfig['productId'] as string);
  const entityType = pickString(simulationConfig['entityType'] as string) ?? 'product';

  const triggerInput = coerceInput(node.inputs.includes('trigger') ? nodeInputs['trigger'] : true);
  if (triggerInput === false) {
    return {};
  }

  let entity: Record<string, unknown> | null = null;
  if (entityId && entityType) {
    try {
      entity = await fetchEntityCached(entityType, entityId);
      if (!entity) {
        toast?.(`No ${entityType} found for simulation ID ${entityId}.`, { variant: 'error' });
      }
    } catch (error) {
      reportAiPathsError?.(
        error,
        {
          service: 'ai-paths-runtime',
          nodeId: node.id,
          nodeType: node.type,
          entityId,
          entityType,
        },
        `Simulation hydration failed for ${entityType}:${entityId}`
      );
    }
  }

  const context: Record<string, unknown> = {
    source: node.title ?? node.id,
    timestamp: now,
    pathId: activePathId,
    contextSource: 'simulation',
    simulationNodeId: node.id,
    simulationNodeTitle: node.title ?? node.id,
    entityId,
    entityType,
    ...(entityId && entityType === 'product' ? { productId: entityId } : {}),
  };

  if (entity) {
    context['entity'] = entity;
    context['entityJson'] = entity;
    if (entityType === 'product') {
      context['product'] = entity;
    }
  }

  return {
    context,
    entityId,
    entityType,
    entityJson: entity,
  };
};
