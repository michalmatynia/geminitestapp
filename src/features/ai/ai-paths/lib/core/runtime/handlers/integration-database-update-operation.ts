import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
  UpdaterMapping,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { resolveEntityIdFromInputs } from '../utils';
import {
  ParameterInferenceGateError,
  applyParameterInferenceGuard,
  coerceArrayLike,
  mergeParameterInferenceUpdates,
  normalizeNonEmptyString,
  toRecord,
} from './database-parameter-inference';
import { executeDatabaseUpdate } from './integration-database-update-execution';
import { resolveDatabaseUpdateMappings } from './integration-database-update-mapping-resolution';

export type HandleDatabaseUpdateOperationInput = {
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
  aiPrompt: string;
  ensureExistingParameterTemplateContext: (targetPath: string) => Promise<void>;
};

export async function handleDatabaseUpdateOperation({
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
  aiPrompt,
  ensureExistingParameterTemplateContext,
}: HandleDatabaseUpdateOperationInput): Promise<RuntimePortValues> {
  const parameterTargetPath =
    normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ??
    'parameters';
  const {
    fallbackTarget,
    mappings,
    updates: mappingUpdates,
    requiredSourcePorts,
    unresolvedSourcePorts,
  } = resolveDatabaseUpdateMappings({
    dbConfig,
    nodeInputPorts,
    resolvedInputs,
    parameterTargetPath,
  });
  let updates: Record<string, unknown> = mappingUpdates;

  const guardResult = applyParameterInferenceGuard({
    dbConfig,
    updates,
    templateInputs,
  });
  if (guardResult.applied) {
    updates = guardResult.updates;
  }
  if (guardResult.blocked) {
    const message =
      guardResult.errorMessage ??
      'Parameter inference blocked due to missing parameter definitions.';
    reportAiPathsError(
      new Error(message),
      {
        action: 'parameterInferenceGuard',
        nodeId: node.id,
        targetPath: parameterTargetPath,
      },
      'Parameter inference guard blocked update:',
    );
    toast(message, { variant: 'error' });
    throw new ParameterInferenceGateError(message);
  }

  await ensureExistingParameterTemplateContext(parameterTargetPath);
  const mergeResult = mergeParameterInferenceUpdates({
    targetPath: parameterTargetPath,
    updates,
    templateInputs,
  });
  if (mergeResult.applied) {
    updates = mergeResult.updates;
  }

  const missingSourcePorts: string[] = Array.from(requiredSourcePorts).filter(
    (sourcePort: string): boolean => resolvedInputs[sourcePort] === undefined,
  );
  const hasUpdates = Object.keys(updates).length > 0;
  if (missingSourcePorts.length > 0 || unresolvedSourcePorts.size > 0) {
    return prevOutputs;
  }
  if (!hasUpdates) {
    return prevOutputs;
  }

  const updateStrategy: 'one' | 'many' = dbConfig.updateStrategy ?? 'one';
  const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
  const configuredCollection = queryConfig.collection?.trim() ?? '';
  const configuredCollectionKey = configuredCollection.toLowerCase();
  const forceCollectionUpdate =
    configuredCollection.length > 0 &&
    !['product', 'products', 'note', 'notes'].includes(configuredCollectionKey);
  const shouldUseEntityUpdate =
    !forceCollectionUpdate && (entityType === 'product' || entityType === 'note');
  const idField = dbConfig.idField ?? 'entityId';
  const entityId = resolveEntityIdFromInputs(
    resolvedInputs,
    idField,
    simulationEntityType,
    simulationEntityId,
  );

  const debugPayload: Record<string, unknown> = {
    mode: 'mapping',
    updateStrategy,
    entityType,
    collection: configuredCollection || null,
    forceCollectionUpdate,
    idField,
    entityId,
    updates,
    mappings,
    ...(guardResult.applied
      ? {
        parameterInferenceGuard: {
          ...(guardResult.meta ?? {}),
          ...(mergeResult.applied && mergeResult.meta
            ? { writePlan: mergeResult.meta }
            : {}),
        },
      }
      : {}),
  };

  const executionResult = await executeDatabaseUpdate({
    nodeId: node.id,
    executed,
    reportAiPathsError,
    toast,
    dryRun,
    resolvedInputs,
    dbConfig,
    queryConfig,
    updates,
    updateStrategy,
    entityType,
    shouldUseEntityUpdate,
    idField,
    entityId,
    configuredCollection,
  });
  if (executionResult.skipped) {
    return prevOutputs;
  }

  const updateResult: unknown = executionResult.updateResult;
  const primaryTarget =
    mappings.find((mapping: UpdaterMapping) => mapping.targetPath)?.targetPath ??
    fallbackTarget;
  if (
    guardResult.applied &&
    debugPayload['parameterInferenceGuard'] &&
    typeof debugPayload['parameterInferenceGuard'] === 'object'
  ) {
    const updateResultRecord = toRecord(updateResult);
    const modifiedCountValue = updateResultRecord?.['modifiedCount'];
    const modifiedCount =
      typeof modifiedCountValue === 'number' ? modifiedCountValue : null;
    (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['written'] = {
      targetPath: parameterTargetPath,
      count: coerceArrayLike(updates[parameterTargetPath]).length,
      ...(modifiedCount !== null ? { modifiedCount } : {}),
    };
  }

  const primaryValue = updates[primaryTarget];
  return {
    content_en:
      primaryTarget === 'content_en'
        ? ((primaryValue as string | undefined) ??
          (nodeInputs['content_en'] as string | undefined) ??
          '')
        : (nodeInputs['content_en'] as string | undefined),
    bundle: updates,
    result: updateResult,
    debugPayload,
    aiPrompt,
  };
}
