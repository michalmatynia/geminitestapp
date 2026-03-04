import { AiNode } from '@/shared/contracts/ai-paths';
import { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import { pickString, readEntityIdFromContext, readEntityTypeFromContext } from './engine-utils';

export function deriveNodeInputs(args: {
  node: AiNode;
  rawInputs: RuntimePortValues;
  triggerContext: Record<string, unknown> | null;
  checkTriggerProvenance: () => boolean;
}): RuntimePortValues {
  const { node, rawInputs, triggerContext, checkTriggerProvenance } = args;
  const next = { ...rawInputs };
  if (node.type === 'database') {
    if (!pickString(next['entityId'])) {
      const triggerEntityId =
        pickString(triggerContext?.['productId']) ?? pickString(triggerContext?.['entityId']);
      if (triggerEntityId) {
        next['entityId'] = triggerEntityId;
      }
    }
    if (!pickString(next['entityType'])) {
      const triggerEntityType =
        pickString(triggerContext?.['entityType']) ??
        (pickString(triggerContext?.['productId']) ? 'product' : undefined);
      if (triggerEntityType) {
        next['entityType'] = triggerEntityType;
      }
    }
  }
  if (node.type === 'model' || node.type === 'prompt') {
    const contextEntityId = readEntityIdFromContext(next);
    const contextEntityType = readEntityTypeFromContext(next);
    if (contextEntityId && contextEntityType && checkTriggerProvenance()) {
      const inheritedContextSource =
        typeof triggerContext?.['contextSource'] === 'string'
          ? triggerContext['contextSource']
          : null;
      const currentContext = (next['context'] as Record<string, unknown>) ?? {};
      next['context'] = {
        ...currentContext,
        entityId: contextEntityId,
        entityType: contextEntityType,
        contextSource: inheritedContextSource ?? 'simulation',
        provenance: 'trigger_simulation',
      };
    }
  }
  return next;
}
