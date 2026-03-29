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

type DeleteEntityResult = { ok: boolean; error?: string };

const buildDeleteOperationResult = (
  deleteResult: Record<string, unknown>,
  aiPrompt: string
): RuntimePortValues => ({
  result: deleteResult,
  bundle: deleteResult,
  aiPrompt,
});

const buildMissingEntityIdResult = (aiPrompt: string): RuntimePortValues => ({
  result: null,
  bundle: { error: 'Missing entity id' },
  aiPrompt,
});

const reportMissingEntityId = (
  nodeId: string,
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'],
  toast: NodeHandlerContext['toast']
): void => {
  reportAiPathsError(
    new Error('Database delete missing entity id'),
    { action: 'deleteEntity', nodeId },
    'Database delete missing entity id:'
  );
  toast('Database delete needs an entity ID input.', { variant: 'error' });
};

const reportDeleteFailure = (input: {
  nodeId: string;
  entityType: string;
  entityId: string;
  error: string | undefined;
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
}): void => {
  input.reportAiPathsError(
    new Error(input.error),
    {
      action: 'deleteEntity',
      entityType: input.entityType,
      entityId: input.entityId,
      nodeId: input.nodeId,
    },
    'Database delete failed:'
  );
  input.toast(`Failed to delete ${input.entityType}.`, { variant: 'error' });
};

const reportDeleteSuccess = (
  entityType: string,
  entityId: string,
  toast: NodeHandlerContext['toast']
): void => {
  toast(`Deleted ${entityType} ${entityId}`, { variant: 'success' });
};

const buildUnsupportedDeleteResult = (entityId: string, aiPrompt: string): RuntimePortValues =>
  ({
    result: { ok: false },
    bundle: { ok: false, entityId },
    aiPrompt,
  });

const getDeleteEntityOperation = (
  entityType: string
): ((entityId: string) => Promise<DeleteEntityResult>) | null => {
  if (entityType === 'product') return entityApi.deleteProduct;
  if (entityType === 'note') return entityApi.deleteNote;
  return null;
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
    reportMissingEntityId(node.id, reportAiPathsError, toast);
    return buildMissingEntityIdResult(aiPrompt);
  }

  const defaultDeleteResult: Record<string, unknown> = { ok: false };
  if (executed.updater.has(node.id)) {
    return buildDeleteOperationResult(defaultDeleteResult, aiPrompt);
  }

  if (dryRun) {
    executed.updater.add(node.id);
    return buildDeleteOperationResult({ ok: true, dryRun: true, entityId, entityType }, aiPrompt);
  }

  const deleteEntity = getDeleteEntityOperation(entityType);
  if (!deleteEntity) {
    toast('Custom deletes are not supported yet.', { variant: 'error' });
    executed.updater.add(node.id);
    return buildUnsupportedDeleteResult(entityId, aiPrompt);
  }

  const deleteResult = await deleteEntity(entityId);
  executed.updater.add(node.id);
  if (!deleteResult.ok) {
    reportDeleteFailure({
      nodeId: node.id,
      entityType,
      entityId,
      error: deleteResult.error,
      reportAiPathsError,
      toast,
    });
    return buildDeleteOperationResult(defaultDeleteResult, aiPrompt);
  }

  reportDeleteSuccess(entityType, entityId, toast);
  return buildDeleteOperationResult({ ok: true, entityId }, aiPrompt);
}
