import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

const pickString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const handleTrigger: NodeHandler = async ({
  node,
  triggerNodeId,
  triggerEvent,
  triggerContext,
  fetchEntityCached,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (triggerNodeId && node.id !== triggerNodeId) {
    return {};
  }

  const eventName: string = triggerEvent ?? node.config?.trigger?.event ?? 'manual';
  const triggerContextRecord = asRecord(triggerContext);
  const entityId =
    pickString(triggerContextRecord?.['productId']) ??
    pickString(triggerContextRecord?.['entityId']);
  const entityType =
    pickString(triggerContextRecord?.['entityType']) ??
    (pickString(triggerContextRecord?.['productId']) ? 'product' : null);

  let resolvedEntity: Record<string, unknown> | null = null;
  if (entityId && entityType) {
    try {
      resolvedEntity = await fetchEntityCached(entityType, entityId);
    } catch {
      resolvedEntity = null;
    }
  }

  const output: RuntimePortValues = {
    trigger: true,
    triggerName: eventName,
  };

  if (triggerContextRecord) {
    output['context'] = {
      ...triggerContextRecord,
      ...(entityId ? { entityId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(resolvedEntity ? { entityJson: resolvedEntity } : {}),
    };
  }
  if (entityId) output['entityId'] = entityId;
  if (entityType) output['entityType'] = entityType;
  if (resolvedEntity) output['entityJson'] = resolvedEntity;

  return output;
};
