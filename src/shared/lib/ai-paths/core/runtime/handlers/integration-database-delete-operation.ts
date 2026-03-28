import type { DatabaseConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { entityApi } from '@/shared/lib/ai-paths/api';

import { resolveEntityIdFromInputs } from '../utils';

export type HandleDatabaseDeleteOperationInput = {
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  dbConfig: DatabaseConfig;
  dryRun: boolean;
  aiPrompt: string;
};

export async function handleDatabaseDeleteOperation(
  input: HandleDatabaseDeleteOperationInput
): Promise<RuntimePortValues> {
  const {
    node,
    nodeInputs,
    executed,
    reportAiPathsError,
    toast,
    simulationEntityType,
    simulationEntityId,
    dbConfig,
    dryRun,
    aiPrompt,
  } = input;
  const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
  const idField = dbConfig.idField ?? 'entityId';
  const entityId = resolveEntityIdFromInputs(
    nodeInputs,
    idField,
    simulationEntityType,
    simulationEntityId
  );
  if (!entityId) {
    reportAiPathsError(
      new Error('Database delete missing entity id'),
      { action: 'deleteEntity', nodeId: node.id },
      'Database delete missing entity id:'
    );
    toast('Database delete needs an entity ID input.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Missing entity id' },
      aiPrompt,
    };
  }

  let deleteResult: unknown = { ok: false };
  if (!executed.updater.has(node.id)) {
    if (dryRun) {
      deleteResult = { ok: true, dryRun: true, entityId, entityType };
      executed.updater.add(node.id);
    } else {
      if (entityType === 'product') {
        const productDeleteResult: { ok: boolean; error?: string } =
          await entityApi.deleteProduct(entityId);
        executed.updater.add(node.id);
        if (!productDeleteResult.ok) {
          reportAiPathsError(
            new Error(productDeleteResult.error),
            { action: 'deleteEntity', entityType, entityId, nodeId: node.id },
            'Database delete failed:'
          );
          toast(`Failed to delete ${entityType}.`, { variant: 'error' });
        } else {
          deleteResult = { ok: true, entityId };
          toast(`Deleted ${entityType} ${entityId}`, { variant: 'success' });
        }
      } else if (entityType === 'note') {
        const noteDeleteResult: { ok: boolean; error?: string } =
          await entityApi.deleteNote(entityId);
        executed.updater.add(node.id);
        if (!noteDeleteResult.ok) {
          reportAiPathsError(
            new Error(noteDeleteResult.error),
            { action: 'deleteEntity', entityType, entityId, nodeId: node.id },
            'Database delete failed:'
          );
          toast(`Failed to delete ${entityType}.`, { variant: 'error' });
        } else {
          deleteResult = { ok: true, entityId };
          toast(`Deleted ${entityType} ${entityId}`, { variant: 'success' });
        }
      } else {
        toast('Custom deletes are not supported yet.', { variant: 'error' });
        executed.updater.add(node.id);
        return {
          result: { ok: false },
          bundle: { ok: false, entityId },
          aiPrompt,
        };
      }
    }
  }

  return {
    result: deleteResult,
    bundle: deleteResult as Record<string, unknown>,
    aiPrompt,
  };
}
