import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { resolveEntityIdFromInputs } from '../utils';
import { executeMongoCollectionUpdate } from './integration-database-mongo-update-collection-executor';
import { executeMongoEntityUpdate } from './integration-database-mongo-update-entity-executor';
import { buildMongoUpdatePlan } from './integration-database-mongo-update-plan';

export type HandleDatabaseMongoUpdateActionInput = {
  actionCategory: DatabaseActionCategory;
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedInputs: Record<string, unknown>;
  nodeInputPorts: string[];
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  templateInputs: RuntimePortValues;
  queryPayload: Record<string, unknown>;
  collection: string;
  filter: Record<string, unknown>;
  idType: unknown;
  updateTemplate: string;
  parseJsonTemplate: (template: string) => unknown;
  ensureExistingParameterTemplateContext: (targetPath: string) => Promise<void>;
  aiPrompt: string;
};

export async function handleDatabaseMongoUpdateAction({
  actionCategory,
  action,
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  simulationEntityType,
  simulationEntityId,
  resolvedInputs,
  nodeInputPorts,
  dbConfig,
  queryConfig,
  dryRun,
  templateInputs,
  queryPayload,
  collection,
  filter,
  idType,
  updateTemplate,
  parseJsonTemplate,
  ensureExistingParameterTemplateContext,
  aiPrompt,
}: HandleDatabaseMongoUpdateActionInput): Promise<RuntimePortValues> {
  const planResult = await buildMongoUpdatePlan({
    actionCategory,
    action,
    node,
    prevOutputs,
    reportAiPathsError,
    toast,
    resolvedInputs,
    nodeInputPorts,
    dbConfig,
    queryConfig,
    collection,
    filter,
    idType,
    updateTemplate,
    templateInputs,
    parseJsonTemplate,
    ensureExistingParameterTemplateContext,
    aiPrompt,
  });

  if ('output' in planResult) {
    return planResult.output;
  }

  const {
    resolvedFilter,
    debugPayload,
    parameterTargetPath,
    updates,
    primaryTarget,
    updateDoc,
  } = planResult.plan;

  if (executed.updater.has(node.id)) {
    return prevOutputs;
  }

  if (dryRun) {
    executed.updater.add(node.id);
    return {
      result: updateDoc as Record<string, unknown>,
      bundle: {
        dryRun: true,
        action,
        collection,
        filter: resolvedFilter,
        update: updateDoc,
      } as RuntimePortValues,
      debugPayload,
      aiPrompt,
    };
  }

  const resolveEntityId = (): string | null => {
    const entityIdValue =
      typeof resolvedInputs['entityId'] === 'string'
        ? resolvedInputs['entityId']
        : typeof resolvedInputs['productId'] === 'string'
          ? resolvedInputs['productId']
          : null;
    if (entityIdValue?.trim()) return entityIdValue;

    const fallbackEntityId: string = resolveEntityIdFromInputs(
      resolvedInputs,
      dbConfig.idField ?? 'entityId',
      simulationEntityType,
      simulationEntityId,
    );
    if (fallbackEntityId.trim()) return fallbackEntityId;

    const filterId =
      typeof resolvedFilter['id'] === 'string'
        ? resolvedFilter['id']
        : typeof resolvedFilter['_id'] === 'string'
          ? resolvedFilter['_id']
          : null;
    return filterId?.trim() ? filterId : null;
  };

  const normalizedCollection: string = collection.trim().toLowerCase();
  const normalizedEntityType: string = (dbConfig.entityType ?? '').trim().toLowerCase();
  const isProductCollection: boolean =
    normalizedCollection === 'product' || normalizedCollection === 'products';
  const shouldUseEntityUpdate: boolean =
    action === 'updateOne' && (isProductCollection || normalizedEntityType === 'product');

  if (shouldUseEntityUpdate) {
    return await executeMongoEntityUpdate({
      action,
      node,
      nodeInputs,
      prevOutputs,
      executed,
      reportAiPathsError,
      toast,
      dbConfig,
      queryPayload,
      collection,
      templateInputs,
      debugPayload,
      parameterTargetPath,
      updates,
      primaryTarget,
      updateDoc,
      resolveEntityId,
      aiPrompt,
    });
  }

  return await executeMongoCollectionUpdate({
    action,
    node,
    nodeInputs,
    executed,
    reportAiPathsError,
    toast,
    queryPayload,
    collection,
    idType,
    debugPayload,
    parameterTargetPath,
    updates,
    primaryTarget,
    resolvedFilter,
    updateDoc,
    resolveEntityId,
    aiPrompt,
  });
}
