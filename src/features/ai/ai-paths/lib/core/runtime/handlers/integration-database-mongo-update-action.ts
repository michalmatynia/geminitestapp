import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
  UpdaterMapping,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '../../../api';
import { coerceInput, getValueAtMappingPath } from '../../utils';
import { resolveEntityIdFromInputs } from '../utils';
import {
  ParameterInferenceGateError,
  applyParameterInferenceGuard,
  coerceArrayLike,
  mergeParameterInferenceUpdates,
  normalizeNonEmptyString,
  resolveObjectPathValue,
  toRecord,
} from './database-parameter-inference';

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
  let resolvedFilter: Record<string, unknown> = filter;
  if (queryConfig.queryTemplate?.trim()) {
    const parsedFilter: unknown = parseJsonTemplate(queryConfig.queryTemplate);
    if (
      parsedFilter &&
    typeof parsedFilter === 'object' &&
    !Array.isArray(parsedFilter)
    ) {
      resolvedFilter = parsedFilter as Record<string, unknown>;
    }
  }
  const debugPayload: Record<string, unknown> = {
    mode: 'mongo',
    actionCategory,
    action,
    collection,
    filter: resolvedFilter,
    updateTemplate: updateTemplate || undefined,
    idType,
    entityId: resolvedInputs['entityId'],
    productId: resolvedInputs['productId'],
    entityType: resolvedInputs['entityType'],
  };
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
  const buildUpdatesFromMappings = (): {
  updates: Record<string, unknown>;
  primaryTarget: string;
  missingSourcePorts: string[];
  unresolvedSourcePorts: string[];
} => {
    const fallbackTarget: string =
    dbConfig.mappings?.[0]?.['targetPath'] ?? 'content_en';
    const fallbackSourcePort: string = nodeInputPorts.includes('result')
      ? 'result'
      : 'content_en';
    const mappings: UpdaterMapping[] =
    dbConfig.mappings && dbConfig.mappings.length > 0
      ? dbConfig.mappings
      :
      [
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
    const updates: Record<string, unknown> = {};
    const requiredSourcePorts: Set<string> = new Set<string>();
    const unresolvedSourcePorts: Set<string> = new Set<string>();
    mappings.forEach((mapping: UpdaterMapping): void => {
      const sourcePort: string = mapping.sourcePort;
      if (!sourcePort) return;
      requiredSourcePorts.add(sourcePort);
      const sourceValue: unknown = templateInputs[sourcePort];
      if (sourceValue === undefined) return;
      let value: unknown = shouldPreserveArrayMappingValue(
        mapping,
        sourceValue
      )
        ? sourceValue
        : coerceInput(sourceValue);
      if (value && typeof value === 'object' && mapping.sourcePath) {
        const resolved: unknown = getValueAtMappingPath(value, mapping.sourcePath);
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
    const missingSourcePorts: string[] = Array.from(requiredSourcePorts).filter(
      (sourcePort: string): boolean => templateInputs[sourcePort] === undefined,
    );
    return {
      updates,
      primaryTarget:
      mappings.find((m: UpdaterMapping): boolean => !!m.targetPath)?.targetPath ?? fallbackTarget,
      missingSourcePorts,
      unresolvedSourcePorts: Array.from(unresolvedSourcePorts),
    };
  };

  let {
    updates,
    primaryTarget,
    missingSourcePorts,
    unresolvedSourcePorts,
  } = buildUpdatesFromMappings();
  const guardResult = applyParameterInferenceGuard({
    dbConfig,
    updates,
    templateInputs,
  });
  if (guardResult.applied) {
    updates = guardResult.updates;
    debugPayload['parameterInferenceGuard'] = guardResult.meta ?? {
      targetPath: dbConfig.parameterInferenceGuard?.targetPath ?? 'parameters',
    };
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
    if (
      debugPayload['parameterInferenceGuard'] &&
      typeof debugPayload['parameterInferenceGuard'] === 'object'
    ) {
      (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['writePlan'] =
        mergeResult.meta ?? null;
    }
  }
  const extractMissingTemplatePorts = (template: string): string[] => {
    const missing: Set<string> = new Set<string>();
    const tokenRegex: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([^\]]+)\s*\]/g;
    let match: RegExpExecArray | null = tokenRegex.exec(template);
    while (match) {
      const token: string = (match[1] ?? match[2] ?? '').trim();
      if (token) {
        const rootPort: string = token.split('.')[0]?.trim() ?? '';
        if (
          rootPort &&
        rootPort !== 'value' &&
        rootPort !== 'current' &&
        templateInputs[rootPort] === undefined
        ) {
          missing.add(rootPort);
        }
      }
      match = tokenRegex.exec(template);
    }
    return Array.from(missing);
  };
  const missingTemplatePorts: string[] = updateTemplate
    ? extractMissingTemplatePorts(updateTemplate)
    : [];
  if (!updateTemplate) {
    if (missingSourcePorts.length > 0 || unresolvedSourcePorts.length > 0) {
      return prevOutputs;
    }
    if (Object.keys(updates).length === 0) {
      return prevOutputs;
    }
  }
  if (missingTemplatePorts.length > 0) {
    return prevOutputs;
  }
  const parsedUpdate: unknown = updateTemplate ? parseJsonTemplate(updateTemplate) : null;
  if (
    updateTemplate &&
  (!parsedUpdate ||
    (typeof parsedUpdate !== 'object' && !Array.isArray(parsedUpdate)))
  ) {
    toast('Update template must be valid JSON.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Invalid update template' },
      debugPayload,
      aiPrompt,
    };
  }
  const updateDoc: unknown = parsedUpdate ?? updates;
  if (
    !updateDoc ||
  (typeof updateDoc !== 'object' && !Array.isArray(updateDoc))
  ) {
    toast('Update document is missing or invalid.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Invalid update' },
      debugPayload,
      aiPrompt,
    };
  }
  if (
    !Array.isArray(updateDoc) &&
  typeof updateDoc === 'object' &&
  Object.keys(updateDoc as Record<string, unknown>).length === 0
  ) {
    toast('Update document is empty.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Empty update' },
      debugPayload,
      aiPrompt,
    };
  }
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
      ? (resolvedInputs['entityId'])
      : typeof resolvedInputs['productId'] === 'string'
        ? (resolvedInputs['productId'])
        : null;
    if (entityIdValue?.trim()) return entityIdValue;
    const fallbackEntityId: string = resolveEntityIdFromInputs(
    resolvedInputs as RuntimePortValues,
    dbConfig.idField ?? 'entityId',
    simulationEntityType,
    simulationEntityId,
    );
    if (fallbackEntityId.trim()) return fallbackEntityId;
    const filterId =
    typeof resolvedFilter['id'] === 'string'
      ? (resolvedFilter['id'])
      : typeof resolvedFilter['_id'] === 'string'
        ? (resolvedFilter['_id'])
        : null;
    return filterId?.trim() ? filterId : null;
  };
  const normalizedCollection: string = collection.trim().toLowerCase();
  const normalizedEntityType: string = (dbConfig.entityType ?? '').trim().toLowerCase();
  const isProductCollection: boolean =
  normalizedCollection === 'product' || normalizedCollection === 'products';
  const shouldUseEntityUpdate =
  action === 'updateOne' && (isProductCollection || normalizedEntityType === 'product');
  if (shouldUseEntityUpdate) {
    const updateDocRecord =
    updateDoc && typeof updateDoc === 'object' && !Array.isArray(updateDoc)
      ? (updateDoc as Record<string, unknown>)
      : null;
    const updateSet =
    updateDocRecord?.['$set'] &&
    typeof updateDocRecord['$set'] === 'object' &&
    !Array.isArray(updateDocRecord['$set'])
      ? (updateDocRecord['$set'] as Record<string, unknown>)
      : null;
    const updatePlain =
    updateDocRecord && !Object.keys(updateDocRecord).some((key) => key.startsWith('$'))
      ? updateDocRecord
      : null;
    let updatesForEntity =
    updateSet ?? updatePlain ?? updates;
    const mergeForEntityResult = mergeParameterInferenceUpdates({
      targetPath: parameterTargetPath,
      updates: updatesForEntity,
      templateInputs,
    });
    if (mergeForEntityResult.applied) {
      updatesForEntity = mergeForEntityResult.updates;
      if (
        debugPayload['parameterInferenceGuard'] &&
        typeof debugPayload['parameterInferenceGuard'] === 'object'
      ) {
        (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['writePlan'] = {
          ...((debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['writePlan'] as Record<string, unknown> | undefined),
          ...(mergeForEntityResult.meta ?? {}),
        };
      }
    }
    if (!updatesForEntity || Object.keys(updatesForEntity).length === 0) {
      return prevOutputs;
    }
    const entityIdValue = resolveEntityId();
    if (!entityIdValue) {
      reportAiPathsError(
        new Error('Database update missing entity id'),
        {
          action: 'updateEntity',
          collection,
          nodeId: node.id,
          provider: queryPayload['provider'],
        },
        'Database update skipped:',
      );
      toast('Database update skipped: missing entity ID.', { variant: 'error' });
      return {
        result: null,
        bundle: { error: 'Missing entity id' },
        debugPayload,
        aiPrompt,
      };
    }
    const updateResult = await entityApi.update({
      entityType: 'product',
      entityId: entityIdValue,
      updates: updatesForEntity,
      mode: dbConfig.mode ?? 'replace',
    });
    executed.updater.add(node.id);
    if (!updateResult.ok) {
      reportAiPathsError(
        new Error(updateResult.error),
        { action: 'updateEntity', collection, nodeId: node.id },
        'Database update failed:',
      );
      toast('Database update failed.', { variant: 'error' });
      return {
        result: null,
        bundle: { error: 'Update failed' },
        debugPayload,
        aiPrompt,
      };
    }
    const modifiedCount: number =
    typeof (updateResult.data as Record<string, unknown> | null)?.['modifiedCount'] === 'number'
      ? ((updateResult.data as Record<string, unknown>)['modifiedCount'] as number)
      : 1;
    if (
      debugPayload['parameterInferenceGuard'] &&
      typeof debugPayload['parameterInferenceGuard'] === 'object'
    ) {
      const writeTarget = resolveObjectPathValue(
        toRecord(updatesForEntity),
        parameterTargetPath
      );
      (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['written'] = {
        targetPath: parameterTargetPath,
        count: coerceArrayLike(writeTarget).length,
        modifiedCount,
      };
    }
    toast(
      `Entity updated in ${collection} (${modifiedCount} row${modifiedCount === 1 ? '' : 's'}).`,
      { variant: 'success' },
    );
    const primaryValue: unknown = updates[primaryTarget];
    return {
      content_en:
      primaryTarget === 'content_en'
        ? ((primaryValue as string | undefined) ??
          (nodeInputs['content_en'] as string | undefined))
        : (nodeInputs['content_en'] as string | undefined),
      result: updateResult.data,
      bundle: updateResult.data as Record<string, unknown>,
      debugPayload,
      aiPrompt,
    };
  }
  if (action === 'updateOne') {
    const hasFilter: boolean =
    resolvedFilter &&
    typeof resolvedFilter === 'object' &&
    Object.keys(resolvedFilter).length > 0;
    if (!hasFilter) {
      const fallbackEntityId = resolveEntityId();
      if (fallbackEntityId) {
        resolvedFilter = { id: fallbackEntityId };
      }
    }
    if (!resolvedFilter || Object.keys(resolvedFilter).length === 0) {
      reportAiPathsError(
        new Error('Database update missing filter'),
        { action: 'dbUpdate', collection, nodeId: node.id, provider: queryPayload['provider'] },
        'Database update skipped:',
      );
      toast('Database update skipped: missing query filter.', { variant: 'error' });
      return {
        result: null,
        bundle: { error: 'Missing query filter' },
        debugPayload,
        aiPrompt,
      };
    }
  }
  const updateResult: ApiResponse<unknown> = await dbApi.action({
    ...(queryPayload['provider'] ? { provider: queryPayload['provider'] } : {}),
    action,
    collection,
    filter: resolvedFilter,
    update: updateDoc,
    ...(idType !== undefined ? { idType: idType } : {}),
  });
  executed.updater.add(node.id);
  if (!updateResult.ok) {
    reportAiPathsError(
      new Error(updateResult.error),
      { action: 'dbUpdate', collection, nodeId: node.id },
      'Database update failed:',
    );
    toast(updateResult.error || 'Database update failed.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Update failed' },
      debugPayload,
      aiPrompt,
    };
  }
  const modifiedCount: number =
  typeof (updateResult.data as Record<string, unknown> | null)?.['modifiedCount'] === 'number'
    ? ((updateResult.data as Record<string, unknown>)['modifiedCount'] as number)
    : 1;
  if (
    debugPayload['parameterInferenceGuard'] &&
    typeof debugPayload['parameterInferenceGuard'] === 'object'
  ) {
    (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['written'] = {
      targetPath: parameterTargetPath,
      count: coerceArrayLike(updates[parameterTargetPath]).length,
      modifiedCount,
    };
  }
  toast(
    `Entity updated in ${collection} (${modifiedCount} row${modifiedCount === 1 ? '' : 's'}).`,
    { variant: 'success' },
  );
  const primaryValue: unknown = updates[primaryTarget];
  return {
    content_en:
    primaryTarget === 'content_en'
      ? ((primaryValue as string | undefined) ??
        (nodeInputs['content_en'] as string | undefined))
      : (nodeInputs['content_en'] as string | undefined),
    result: updateResult.data,
    bundle: updateResult.data as Record<string, unknown>,
    debugPayload,
    aiPrompt,
  };
}
