import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { coerceInput } from '@/shared/lib/ai-paths/core/utils';
import { resolveContextPayload } from '../../utils';

export const handleContext: NodeHandler = async ({
  node,
  nodeInputs,
  fetchEntityCached,
  now,
  simulationEntityId,
  simulationEntityType,
  toast,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const rawContext = coerceInput(nodeInputs['context']);
  const inputContext =
    rawContext && typeof rawContext === 'object' ? (rawContext as Record<string, unknown>) : null;
  const payload = await resolveContextPayload(
    node.config?.context ?? { role: 'entity' },
    inputContext,
    simulationEntityType,
    simulationEntityId,
    now,
    fetchEntityCached
  );
  if (payload.missingFetchedEntity && payload.entityId) {
    toast(`No ${payload.entityType} data found for ID ${payload.entityId}.`, {
      variant: 'error',
    });
  }
  const resolvedContext = {
    ...payload.context,
    source: (payload.context?.['source'] as string | undefined) ?? node.title,
  };
  return {
    context: resolvedContext,
    entityId: payload.entityId,
    entityType: payload.entityType,
    entityJson: payload.scopedEntity,
  };
};
