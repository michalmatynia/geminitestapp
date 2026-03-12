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
  reportAiPathsError,
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
  const embeddedEntity =
    asRecord(triggerContextRecord?.['entityJson']) ?? asRecord(triggerContextRecord?.['entity']);

  let resolvedEntity: Record<string, unknown> | null = embeddedEntity;
  let entityFetchError: string | null = null;
  if (!resolvedEntity && entityId && entityType) {
    try {
      resolvedEntity = await fetchEntityCached(entityType, entityId);
    } catch (error) {
      entityFetchError = error instanceof Error ? error.message : 'Entity fetch failed.';
      reportAiPathsError(
        error,
        { action: 'triggerEntityFetch', nodeId: node.id },
        'Trigger entity fetch failed:'
      );
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
      ...(entityFetchError ? { entityFetchFailed: true, entityFetchError } : {}),
    };
  }
  if (entityId) output['entityId'] = entityId;
  if (entityType) output['entityType'] = entityType;
  if (resolvedEntity) output['entityJson'] = resolvedEntity;
  if (entityFetchError) {
    output['entityFetchFailed'] = true;
    output['entityFetchError'] = entityFetchError;
  }

  return output;
};
