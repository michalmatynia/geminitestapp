import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
  UpdaterMapping,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '../../../api';
import {
  coerceInput,
  getValueAtMappingPath,
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

interface DbActionResult {
  items?: unknown[];
  item?: unknown;
  values?: unknown[];
  count?: number;
  modifiedCount?: number;
  matchedCount?: number;
}

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
  const fallbackTarget: string = dbConfig.mappings?.[0]?.targetPath ?? 'content_en';
  const fallbackSourcePort: string = nodeInputPorts.includes('result')
    ? 'result'
    : 'content_en';
  const mappings: UpdaterMapping[] =
    dbConfig.mappings && dbConfig.mappings.length > 0
      ? dbConfig.mappings
      : [
        {
          targetPath: fallbackTarget,
          sourcePort: fallbackSourcePort,
        },
      ];
  const trimStrings: boolean = dbConfig.trimStrings ?? false;
  const skipEmpty: boolean = dbConfig.skipEmpty ?? false;
  const isEmptyValue = (value: unknown): boolean =>
    value === undefined ||
    value === null ||
    (typeof value === 'string' && (value).trim() === '') ||
    (Array.isArray(value) && (value as unknown[]).length === 0);
  const isEffectivelyMissing = (value: unknown): boolean =>
    isEmptyValue(value) ||
    (typeof value === 'object' &&
      !Array.isArray(value) &&
      value !== null &&
      Object.keys(value as Record<string, unknown>).length === 0);
  let updates: Record<string, unknown> = {};
  const requiredSourcePorts: Set<string> = new Set<string>();
  const unresolvedSourcePorts: Set<string> = new Set<string>();
  const parameterTargetPath =
      normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ??
      'parameters';
  const shouldPreserveArrayMappingValue = (
    mapping: UpdaterMapping,
    sourceValue: unknown
  ): boolean =>
    Boolean(
      dbConfig.parameterInferenceGuard?.enabled &&
          mapping.targetPath === parameterTargetPath &&
          Array.isArray(sourceValue),
    );
  mappings.forEach((mapping: UpdaterMapping) => {
    const sourcePort = mapping.sourcePort;
    if (!sourcePort) return;
    requiredSourcePorts.add(sourcePort);
    const sourceValue = resolvedInputs[sourcePort];
    if (sourceValue === undefined) return;
    let value: unknown = shouldPreserveArrayMappingValue(mapping, sourceValue)
      ? sourceValue
      : coerceInput(sourceValue);
    if (value && typeof value === 'object' && mapping.sourcePath) {
      const resolved = getValueAtMappingPath(value, mapping.sourcePath);
      if (resolved !== undefined) {
        value = resolved;
      } else if (sourcePort === 'result') {
        unresolvedSourcePorts.add(sourcePort);
        return;
      }
    }
    if (
      sourcePort === 'result' &&
      value &&
      typeof value === 'object' &&
      !mapping.sourcePath
    ) {
      const resultValue: unknown = (value as Record<string, unknown>)['result'];
      const descriptionValue: unknown = (value as Record<string, unknown>)['description'];
      const contentValue: unknown = (value as Record<string, unknown>)['content_en'];
      value = resultValue ?? descriptionValue ?? contentValue ?? value;
    }
    if (sourcePort === 'result' && isEffectivelyMissing(value)) {
      unresolvedSourcePorts.add(sourcePort);
      return;
    }
    if (typeof value === 'string' && trimStrings) {
      value = (value).trim();
    }
    if (skipEmpty && isEmptyValue(value)) {
      return;
    }
    if (mapping.targetPath) {
      updates[mapping.targetPath] = value;
    }
  });
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
      'Parameter inference guard blocked update:'
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
  const updateStrategy = dbConfig.updateStrategy ?? 'one';
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
    resolvedInputs as RuntimePortValues,
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
  let updateResult: unknown = updates;

  if (updateStrategy === 'many') {
    const queryPayload = buildDbQueryPayload(resolvedInputs as RuntimePortValues, queryConfig);
    const query = (queryPayload['query']) ?? {};
    const hasQuery =
      query && typeof query === 'object' && Object.keys(query).length > 0;

    if (
      hasUpdates &&
      dbConfig.mode === 'append' &&
      !executed.updater.has(node.id)
    ) {
      reportAiPathsError(
        new Error('Append mode is not supported for update many'),
        { action: 'updateMany', nodeId: node.id },
        'Database update many failed:',
      );
      toast('Update many does not support append mode.', {
        variant: 'error',
      });
      updateResult = {
        error: 'append_not_supported',
        updates,
        query,
        collection: queryPayload['collection'],
      };
      executed.updater.add(node.id);
    } else if (hasUpdates && !hasQuery && !executed.updater.has(node.id)) {
      return prevOutputs;
    } else if (hasUpdates && hasQuery && !executed.updater.has(node.id)) {
      if (dryRun) {
        updateResult = {
          dryRun: true,
          updateMany: true,
          collection: queryPayload['collection'],
          query,
          updates,
          mode: dbConfig.mode ?? 'replace',
        };
        executed.updater.add(node.id);
      } else {
        const dbUpdateResult: ApiResponse<DbActionResult> = await dbApi.update<DbActionResult>({ 
          provider: queryPayload.provider,
          collection: queryPayload.collection,
          query,
          updates,
          single: false,
          ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
        });
        executed.updater.add(node.id);
        if (!dbUpdateResult.ok) {
          reportAiPathsError(
            new Error(dbUpdateResult.error),
            {
              action: 'updateMany',
              collection: queryPayload['collection'],
              nodeId: node.id,
            },
            'Database update many failed:',
          );
          toast(`Failed to update ${queryPayload['collection']}.`, {
            variant: 'error',
          });
        } else {
          updateResult = dbUpdateResult.data;
          const modified: number = (dbUpdateResult.data as Record<string, unknown>)?.['modifiedCount'] as number ?? 0;
          const matched: number = (dbUpdateResult.data as Record<string, unknown>)?.['matchedCount'] as number ?? 0;
          const countLabel = modified || matched;
          toast(
            `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${queryPayload['collection']}.`,
            { variant: 'success' },
          );
        }
      }
    }
  } else if (!executed.updater.has(node.id)) {
    if (dryRun) {
      if (shouldUseEntityUpdate) {
        updateResult = {
          dryRun: true,
          entityType,
          entityId: entityId || undefined,
          updates,
          mode: dbConfig.mode ?? 'replace',
        };
      } else {
        const queryPayload = buildDbQueryPayload(
          resolvedInputs as RuntimePortValues,
          queryConfig,
        );
        const queryFromPayload =
          queryPayload['query'] &&
          typeof queryPayload['query'] === 'object' &&
          !Array.isArray(queryPayload['query'])
            ? (queryPayload['query'])
            : {};
        const fallbackQuery =
          Object.keys(queryFromPayload).length > 0
            ? queryFromPayload
            : entityId && idField.trim().length > 0
              ? { [idField]: entityId }
              : {};
        const collection =
          (queryPayload['collection'] as string | undefined)?.trim() || configuredCollection || entityType;
        updateResult = {
          dryRun: true,
          updateMany: false,
          collection,
          query: fallbackQuery,
          updates,
          mode: dbConfig.mode ?? 'replace',
        };
      }
      executed.updater.add(node.id);
    } else if (shouldUseEntityUpdate) {
      if (!entityId) {
        return prevOutputs;
      }
      try {
        const entityUpdateResult = await entityApi.update({
          entityType,
          entityId,
          updates,
          mode: dbConfig.mode ?? 'replace',
        });
        if (!entityUpdateResult.ok) {
          throw new Error(entityUpdateResult.error);
        }
        updateResult = entityUpdateResult.data ?? updates;
        executed.updater.add(node.id);
        const suffix = entityId ? ` ${entityId}` : '';
        toast(`Updated ${entityType}${suffix}`, { variant: 'success' });
      } catch (error: unknown) {
        reportAiPathsError(
          error,
          { action: 'updateEntity', entityType, entityId, nodeId: node.id },
          'Database update failed:',
        );
        toast(`Failed to update ${entityType}.`, { variant: 'error' });
        executed.updater.add(node.id);
      }
    } else {
      const queryPayload = buildDbQueryPayload(
        resolvedInputs as RuntimePortValues,
        queryConfig,
      );
      const queryFromPayload =
        queryPayload['query'] &&
        typeof queryPayload['query'] === 'object' &&
        !Array.isArray(queryPayload['query'])
          ? (queryPayload['query'])
          : {};
      const query =
        Object.keys(queryFromPayload).length > 0
          ? queryFromPayload
          : entityId && idField.trim().length > 0
            ? { [idField]: entityId }
            : {};
      const collection =
        (queryPayload['collection'] as string | undefined)?.trim() || configuredCollection || entityType;

      if (Object.keys(query).length === 0) {
        reportAiPathsError(
          new Error('Database update missing query filter'),
          {
            action: 'dbUpdateOne',
            collection,
            entityType,
            entityId,
            nodeId: node.id,
          },
          'Database update failed:',
        );
        toast('Database update requires a query filter.', { variant: 'error' });
        updateResult = { error: 'missing_query', collection, updates };
        executed.updater.add(node.id);
      } else {
        const dbUpdateResult: ApiResponse<DbActionResult> = await dbApi.update<DbActionResult>({
          provider: queryPayload.provider,
          collection,
          query,
          updates,
          single: true,
          ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
        });
        executed.updater.add(node.id);
        if (!dbUpdateResult.ok) {
          reportAiPathsError(
            new Error(dbUpdateResult.error),
            {
              action: 'dbUpdateOne',
              collection,
              entityType,
              nodeId: node.id,
            },
            'Database update failed:',
          );
          toast(dbUpdateResult.error || `Failed to update ${collection}.`, {
            variant: 'error',
          });
        } else {
          updateResult = dbUpdateResult.data;
          const modified: number = dbUpdateResult.data?.modifiedCount ?? 0;
          const matched: number = dbUpdateResult.data?.matchedCount ?? 0;
          const countLabel = modified || matched;
          toast(
            `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${collection}.`,
            { variant: 'success' },
          );
        }
      }
    }
  }

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
