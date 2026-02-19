import type { RuntimePortValues } from '@/shared/types/domain/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { coerceInput } from '../../utils';
import { buildFallbackEntity } from '../utils';

export const handleTrigger: NodeHandler = async ({
  node,
  nodeInputs,
  triggerNodeId,
  triggerEvent,
  simulationEntityType,
  triggerContext,
  fetchEntityCached,
  reportAiPathsError,
  activePathId,
  resolvedEntity,
  fallbackEntityId,
  strictFlowMode,
  now,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (triggerNodeId && node.id !== triggerNodeId) {
    return {};
  }
  const eventName: string =
    triggerEvent ?? node.config?.trigger?.event ?? 'manual';
  const contextInput = (coerceInput(nodeInputs['context']) ??
    coerceInput(nodeInputs['simulation'])) as
    | { entityId?: string; entityType?: string; productId?: string; entity?: unknown; entityJson?: unknown; product?: unknown }
    | undefined;
  const contextEntity =
    (contextInput?.['entity'] as Record<string, unknown> | undefined) ??
    (contextInput?.['entityJson'] as Record<string, unknown> | undefined) ??
    (contextInput?.['product'] as Record<string, unknown> | undefined) ??
    null;
  const simulationInputId: string | null =
    contextInput?.['entityId'] ?? contextInput?.['productId'] ?? null;
  const simulationInputType: string | null =
    contextInput?.['entityType'] ?? simulationEntityType ?? null;
  const resolvedEntityId: string | null = simulationInputId ?? null;
  const resolvedEntityType: string | null = simulationInputType ?? null;
  const triggerExtras: Record<string, unknown> = (triggerContext as Record<string, unknown>) ?? {};
  const triggerEntity =
    triggerExtras['entity'] ?? triggerExtras['entityJson'] ?? triggerExtras['product'] ?? null;
  const triggerEntityId: string | null =
    typeof triggerExtras['entityId'] === 'string'
      ? triggerExtras['entityId']
      : typeof triggerExtras['productId'] === 'string'
        ? triggerExtras['productId']
        : null;
  const triggerEntityType: string | null =
    typeof triggerExtras['entityType'] === 'string'
      ? triggerExtras['entityType']
      : null;
  const effectiveEntityId: string | null = resolvedEntityId ?? triggerEntityId ?? null;
  const effectiveEntityType: string | null = resolvedEntityType ?? triggerEntityType ?? null;
  let hydratedEntity: Record<string, unknown> | null =
    resolvedEntity ??
    contextEntity ??
    (triggerEntity as Record<string, unknown> | null) ??
    null;
  if (!hydratedEntity && effectiveEntityId && effectiveEntityType) {
    try {
      hydratedEntity = await fetchEntityCached(effectiveEntityType, effectiveEntityId);
    } catch (err) {
      reportAiPathsError(err, {
        service: 'ai-paths-runtime',
        nodeId: node.id,
      }, `Trigger hydration failed for ${effectiveEntityType}:${effectiveEntityId}`);
    }
  }
  const resolvedContext: Record<string, unknown> = {
    ...(contextInput && typeof contextInput === 'object' ? (contextInput as Record<string, unknown>) : {}),
    entityType: resolvedEntityType ?? triggerEntityType ?? contextInput?.['entityType'],
    entityId: resolvedEntityId ?? triggerEntityId ?? contextInput?.['entityId'],
    source: node.title,
    timestamp: now,
    entity:
      hydratedEntity ??
      (strictFlowMode
        ? null
        : (() => {
          try {
            return buildFallbackEntity((effectiveEntityId ?? fallbackEntityId) as string);
          } catch {
            return { id: effectiveEntityId ?? fallbackEntityId };
          }
        })()),
  };
  if (hydratedEntity && typeof resolvedContext['entityJson'] === 'undefined') {
    resolvedContext['entityJson'] = hydratedEntity;
  }
  if (
    hydratedEntity &&
    effectiveEntityType === 'product' &&
    typeof resolvedContext['product'] === 'undefined'
  ) {
    resolvedContext['product'] = hydratedEntity;
  }
  return {
    trigger: true,
    triggerName: eventName,
    meta: {
      firedAt: now,
      trigger: eventName,
      pathId: activePathId,
      entityId: effectiveEntityId,
      entityType: effectiveEntityType,
      ui: triggerExtras['ui'] ?? null,
      location: triggerExtras['location'] ?? null,
      source: triggerExtras['source'] ?? null,
      user: triggerExtras['user'] ?? null,
      event: triggerExtras['event'] ?? null,
      extras: triggerExtras['extras'] ?? null,
    },
    context: {
      ...resolvedContext,
      entityId:
        effectiveEntityId ?? (resolvedContext['entityId'] as string | null),
      entityType:
        effectiveEntityType ?? (resolvedContext['entityType'] as string | null),
      ui: triggerExtras['ui'] ?? resolvedContext['ui'],
      location: triggerExtras['location'] ?? resolvedContext['location'],
      source:
        triggerExtras['source'] ??
        (resolvedContext['source'] as string | null) ??
        node.title,
      user: triggerExtras['user'] ?? resolvedContext['user'],
      event: triggerExtras['event'] ?? resolvedContext['event'],
      extras: triggerExtras['extras'] ?? resolvedContext['extras'],
      trigger: eventName,
      pathId: activePathId,
    },
    entityId: effectiveEntityId,
    entityType: effectiveEntityType,
  };
};
