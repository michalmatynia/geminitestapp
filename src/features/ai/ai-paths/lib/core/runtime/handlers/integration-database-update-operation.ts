import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
  UpdaterMapping,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import {
  parseJsonSafe,
  renderJsonTemplate,
} from '../../utils';
import {
  buildDbQueryPayload,
  resolveEntityIdFromInputs,
} from '../utils';
import {
  ParameterInferenceGateError,
  applyParameterInferenceGuard,
  coerceArrayLike,
  mergeParameterInferenceUpdates,
  normalizeNonEmptyString,
  toRecord,
} from './database-parameter-inference';
import { extractMissingTemplatePorts } from './integration-database-mongo-update-plan-helpers';
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

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const resolveCustomContentEnValue = (customUpdateDoc: unknown): string | undefined => {
  if (!isPlainRecord(customUpdateDoc)) return undefined;
  const directValue = customUpdateDoc['content_en'];
  if (typeof directValue === 'string') return directValue;
  const setDoc = customUpdateDoc['$set'];
  if (!isPlainRecord(setDoc)) return undefined;
  const setValue = setDoc['content_en'];
  return typeof setValue === 'string' ? setValue : undefined;
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
  const updatePayloadMode = dbConfig.updatePayloadMode ?? 'mapping';
  const isCustomPayloadMode = updatePayloadMode === 'custom';
  const parameterTargetPath =
    normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ??
    'parameters';

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

  let fallbackTarget = 'content_en';
  let mappings: UpdaterMapping[] = [];
  let updates: Record<string, unknown> = {};
  let guardApplied = false;
  let guardMeta: Record<string, unknown> | null = null;
  let mergeApplied = false;
  let mergeMeta: Record<string, unknown> | null = null;
  let customFilter: Record<string, unknown> | undefined;
  let customUpdateDoc: unknown;

  if (isCustomPayloadMode) {
    const updateTemplate = dbConfig.updateTemplate?.trim() ?? '';
    if (!updateTemplate) {
      return prevOutputs;
    }

    const missingFilterPorts = queryConfig.queryTemplate?.trim()
      ? extractMissingTemplatePorts(queryConfig.queryTemplate, templateInputs)
      : [];
    const missingUpdatePorts = extractMissingTemplatePorts(updateTemplate, templateInputs);
    if (missingFilterPorts.length > 0 || missingUpdatePorts.length > 0) {
      return prevOutputs;
    }

    const currentValueRaw: unknown =
      templateInputs['value'] ?? templateInputs['jobId'] ?? '';
    const currentValue = Array.isArray(currentValueRaw)
      ? (currentValueRaw as unknown[])[0]
      : currentValueRaw;
    const renderedUpdate = renderJsonTemplate(
      updateTemplate,
      templateInputs,
      currentValue,
    );
    const parsedUpdate = parseJsonSafe(renderedUpdate);
    if (
      !parsedUpdate ||
      (typeof parsedUpdate !== 'object' && !Array.isArray(parsedUpdate))
    ) {
      toast('Update template must be valid JSON.', { variant: 'error' });
      return {
        result: null,
        bundle: { error: 'Invalid update template' },
        debugPayload: {
          mode: 'custom',
          updateStrategy,
          collection: configuredCollection || null,
          updateTemplate,
        },
        aiPrompt,
      };
    }

    const renderedFilterPayload = buildDbQueryPayload(templateInputs, queryConfig);
    const renderedFilter = isPlainRecord(renderedFilterPayload.query)
      ? renderedFilterPayload.query
      : {};

    customUpdateDoc = parsedUpdate;
    customFilter = renderedFilter;
  } else {
    const {
      fallbackTarget: resolvedFallbackTarget,
      mappings: resolvedMappings,
      updates: mappingUpdates,
      requiredSourcePorts,
      unresolvedSourcePorts,
    } = resolveDatabaseUpdateMappings({
      dbConfig,
      nodeInputPorts,
      resolvedInputs,
      parameterTargetPath,
    });
    fallbackTarget = resolvedFallbackTarget;
    mappings = resolvedMappings;
    updates = mappingUpdates;

    const guardResult = applyParameterInferenceGuard({
      dbConfig,
      updates,
      templateInputs,
    });
    if (guardResult.applied) {
      updates = guardResult.updates;
      guardApplied = true;
      guardMeta = guardResult.meta ?? null;
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
      mergeApplied = true;
      mergeMeta = mergeResult.meta ?? null;
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
  }

  const debugPayload: Record<string, unknown> = {
    mode: updatePayloadMode,
    updateStrategy,
    entityType,
    collection: configuredCollection || null,
    forceCollectionUpdate,
    idField,
    entityId,
    ...(isCustomPayloadMode
      ? {
        filter: customFilter ?? {},
        updateDoc: customUpdateDoc,
        queryTemplate: queryConfig.queryTemplate ?? '',
        updateTemplate: dbConfig.updateTemplate ?? '',
      }
      : {
        updates,
        mappings,
        ...(guardApplied
          ? {
            parameterInferenceGuard: {
              ...(guardMeta ?? {}),
              ...(mergeApplied && mergeMeta
                ? { writePlan: mergeMeta }
                : {}),
            },
          }
          : {}),
      }),
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
    updatePayloadMode,
    ...(customFilter ? { customFilter } : {}),
    ...(customUpdateDoc !== undefined ? { customUpdateDoc } : {}),
  });
  if (executionResult.skipped) {
    return prevOutputs;
  }

  debugPayload['execution'] = executionResult.executionMeta;

  const updateResult: unknown = executionResult.updateResult;
  if (
    !isCustomPayloadMode &&
    guardApplied &&
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

  const primaryTarget =
    mappings.find((mapping: UpdaterMapping) => mapping.targetPath)?.targetPath ??
    fallbackTarget;
  const primaryValue = updates[primaryTarget];
  const customContentEnValue = isCustomPayloadMode
    ? resolveCustomContentEnValue(customUpdateDoc)
    : undefined;

  return {
    content_en:
      isCustomPayloadMode
        ? (customContentEnValue ?? (nodeInputs['content_en'] as string | undefined) ?? '')
        : primaryTarget === 'content_en'
          ? ((primaryValue as string | undefined) ??
            (nodeInputs['content_en'] as string | undefined) ??
            '')
          : (nodeInputs['content_en'] as string | undefined),
    bundle: isCustomPayloadMode
      ? {
        filter: customFilter ?? {},
        update: customUpdateDoc,
        ...(executionResult.executionMeta ?? {}),
      }
      : updates,
    result: updateResult,
    debugPayload,
    aiPrompt,
  };
}
