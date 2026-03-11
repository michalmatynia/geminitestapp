import type { DatabaseConfig, DbQueryConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { parseJsonSafe, renderJsonTemplate } from '../../utils';
import { buildDbQueryPayload, resolveEntityIdFromInputs } from '../utils';
import {
  mergeTranslatedParameterUpdates,
  normalizeNonEmptyString,
} from './database-parameter-inference';
import { executeDatabaseUpdate } from './integration-database-update-execution';
import { resolveDatabaseUpdateMappings } from './integration-database-update-mapping-resolution';
import {
  createWriteTemplateGuardrailOutput,
  resolveWriteTemplateGuardrail,
} from './integration-database-write-guardrails';

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
  ensureExistingParameterTemplateContext: (
    targetPath: string,
    options?: { forceHydrateRichParameters?: boolean }
  ) => Promise<void>;
};

const resolveCustomContentEnValue = (customUpdateDoc: unknown): string | undefined => {
  if (!isObjectRecord(customUpdateDoc)) return undefined;
  const directValue = customUpdateDoc['content_en'];
  if (typeof directValue === 'string') return directValue;
  const setDoc = customUpdateDoc['$set'];
  if (!isObjectRecord(setDoc)) return undefined;
  const setValue = setDoc['content_en'];
  return typeof setValue === 'string' ? setValue : undefined;
};

const hasTranslationDescriptionMapping = (dbConfig: DatabaseConfig): boolean =>
  (dbConfig.mappings ?? []).some(
    (mapping): boolean =>
      mapping.targetPath === 'description_pl' &&
      mapping.sourcePort === 'value' &&
      (mapping.sourcePath === 'description_pl' || !mapping.sourcePath)
  );

const hasTranslationParameterMapping = (dbConfig: DatabaseConfig): boolean =>
  (dbConfig.mappings ?? []).some(
    (mapping): boolean =>
      mapping.targetPath === 'parameters' &&
      (mapping.sourcePort === 'result' || mapping.sourcePort === 'value')
  );

const isLegacyTranslationParameterUpdate = (dbConfig: DatabaseConfig): boolean =>
  hasTranslationDescriptionMapping(dbConfig) && hasTranslationParameterMapping(dbConfig);

const isResolvedTranslationParameterUpdate = (
  updates: Record<string, unknown>,
  parameterTargetPath: string
): boolean =>
  Object.prototype.hasOwnProperty.call(updates, 'description_pl') &&
  Object.prototype.hasOwnProperty.call(updates, parameterTargetPath);

const pruneEmptyTranslationDescriptionUpdate = (
  updates: Record<string, unknown>
): {
  updates: Record<string, unknown>;
  pruned: boolean;
} => {
  if (!Object.prototype.hasOwnProperty.call(updates, 'description_pl')) {
    return { updates, pruned: false };
  }
  const description = normalizeNonEmptyString(updates['description_pl']);
  if (description) {
    return { updates: { ...updates, description_pl: description }, pruned: false };
  }
  const nextUpdates = { ...updates };
  delete nextUpdates['description_pl'];
  return { updates: nextUpdates, pruned: true };
};

const patchTargetPathInUpdateDoc = (
  value: unknown,
  targetPath: string,
  nextUpdates: Record<string, unknown>
): unknown => {
  if (!isObjectRecord(value)) return value;
  const hasTarget = Object.prototype.hasOwnProperty.call(nextUpdates, targetPath);
  const nextTargetValue = nextUpdates[targetPath];
  const setDoc = value['$set'];
  if (isObjectRecord(setDoc)) {
    const nextSet: Record<string, unknown> = { ...setDoc };
    if (hasTarget) {
      nextSet[targetPath] = nextTargetValue;
    } else {
      delete nextSet[targetPath];
    }
    return { ...value, $set: nextSet };
  }
  const hasOperator = Object.keys(value).some((key: string): boolean => key.startsWith('$'));
  if (hasOperator) return value;
  const nextRecord: Record<string, unknown> = { ...value };
  if (hasTarget) {
    nextRecord[targetPath] = nextTargetValue;
  } else {
    delete nextRecord[targetPath];
  }
  return nextRecord;
};

const createTranslationNoUpdatesOutput = (args: {
  error: string;
  aiPrompt: string;
  entityType: string;
  collection: string;
  filter: Record<string, unknown> | null;
  unresolvedSourcePorts?: string[];
  translationParameterMergeMeta?: Record<string, unknown>;
  reportAiPathsError: HandleDatabaseUpdateOperationInput['reportAiPathsError'];
  toast: HandleDatabaseUpdateOperationInput['toast'];
  nodeId: string;
  mode: 'mapping' | 'custom';
}): RuntimePortValues => {
  args.reportAiPathsError(
    new Error(args.error),
    {
      action: 'dbTranslationUpdate',
      nodeId: args.nodeId,
      ...(args.unresolvedSourcePorts && args.unresolvedSourcePorts.length > 0
        ? { unresolvedSourcePorts: args.unresolvedSourcePorts }
        : {}),
      ...(args.translationParameterMergeMeta
        ? { translationParameterMerge: args.translationParameterMergeMeta }
        : {}),
    },
    'Database update blocked:'
  );
  args.toast(args.error, { variant: 'error' });
  return {
    result: null,
    bundle: {
      error: args.error,
      guardrail: 'translation-no-updates',
      guardrailMeta: {
        code: 'translation-no-updates',
        severity: 'error',
        message: args.error,
        ...(args.unresolvedSourcePorts && args.unresolvedSourcePorts.length > 0
          ? { unresolvedSourcePorts: args.unresolvedSourcePorts }
          : {}),
        ...(args.translationParameterMergeMeta
          ? { translationParameterMerge: args.translationParameterMergeMeta }
          : {}),
      },
    },
    debugPayload: {
      mode: args.mode,
      entityType: args.entityType,
      collection: args.collection || null,
      ...(args.filter ? { filter: args.filter } : {}),
      ...(args.unresolvedSourcePorts && args.unresolvedSourcePorts.length > 0
        ? { unresolvedSourcePorts: args.unresolvedSourcePorts }
        : {}),
      ...(args.translationParameterMergeMeta
        ? { translationParameterMerge: args.translationParameterMergeMeta }
        : {}),
    },
    aiPrompt: args.aiPrompt,
  };
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
  const updatePayloadMode = dbConfig.updatePayloadMode ?? 'custom';

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
    simulationEntityId
  );
  const parameterTargetPath =
    normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ?? 'parameters';
  const isConfiguredTranslationParameterUpdate = isLegacyTranslationParameterUpdate(dbConfig);

  if (updatePayloadMode === 'mapping') {
    const mappingResult = resolveDatabaseUpdateMappings({
      dbConfig,
      nodeInputPorts,
      resolvedInputs,
      parameterTargetPath,
    });
    const unresolvedSourcePorts = Array.from(mappingResult.unresolvedSourcePorts);
    let updates: Record<string, unknown> = mappingResult.updates;
    let translationParameterMergeMeta: Record<string, unknown> | undefined;
    const isTranslationParameterUpdate =
      isConfiguredTranslationParameterUpdate ||
      isResolvedTranslationParameterUpdate(updates, parameterTargetPath);

    if (isTranslationParameterUpdate) {
      const descriptionPruneResult = pruneEmptyTranslationDescriptionUpdate(updates);
      updates = descriptionPruneResult.updates;

      if (Object.prototype.hasOwnProperty.call(updates, parameterTargetPath)) {
        await ensureExistingParameterTemplateContext(parameterTargetPath, {
          forceHydrateRichParameters: true,
        });
        const translationMergeResult = mergeTranslatedParameterUpdates({
          targetPath: parameterTargetPath,
          updates,
          templateInputs,
          languageCode: 'pl',
          requireFullCoverage: false,
        });
        if (translationMergeResult.applied) {
          updates = translationMergeResult.updates;
          translationParameterMergeMeta = translationMergeResult.meta;
        }
      }
    }

    const debugPayload: Record<string, unknown> = {
      mode: 'mapping',
      updateStrategy,
      entityType,
      collection: configuredCollection || null,
      idField,
      entityId,
      mappings: mappingResult.mappings,
      updates,
      unresolvedSourcePorts,
      ...(translationParameterMergeMeta
        ? { translationParameterMerge: translationParameterMergeMeta }
        : {}),
    };

    if (Object.keys(updates).length === 0) {
      if (isTranslationParameterUpdate) {
        return createTranslationNoUpdatesOutput({
          error:
            'Translation update blocked. No safe description or parameter translation updates were resolved.',
          aiPrompt,
          entityType,
          collection: configuredCollection,
          filter: entityId ? { id: entityId } : null,
          unresolvedSourcePorts,
          translationParameterMergeMeta,
          reportAiPathsError,
          toast,
          nodeId: node.id,
          mode: 'mapping',
        });
      }
      return {
        ...prevOutputs,
        result: null,
        bundle: {
          skipped: true,
          reason: 'no_mapping_updates',
          unresolvedSourcePorts,
        },
        debugPayload,
        aiPrompt,
      };
    }

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
      entityId,
      configuredCollection,
      updatePayloadMode: 'mapping',
    });

    if (executionResult.skipped) {
      return {
        ...prevOutputs,
        result: null,
        bundle: {
          error: 'Database update was skipped.',
          guardrail: 'update-skipped',
        },
        debugPayload,
        aiPrompt,
      };
    }

    return {
      content_en: (nodeInputs['content_en'] as string | undefined) ?? '',
      bundle: {
        updates,
        ...(executionResult.executionMeta ?? {}),
        ...(executionResult.writeOutcome ? { writeOutcome: executionResult.writeOutcome } : {}),
      },
      result: executionResult.updateResult,
      debugPayload: {
        ...debugPayload,
        execution: executionResult.executionMeta,
      },
      ...(executionResult.writeOutcome ? { writeOutcome: executionResult.writeOutcome } : {}),
      aiPrompt,
    };
  }

  const updateTemplate = dbConfig.updateTemplate?.trim() ?? '';
  if (!updateTemplate) {
    const error = 'No explicit update document provided.';
    reportAiPathsError(
      new Error(error),
      {
        action: 'dbUpdateGuardrail',
        nodeId: node.id,
        guardrail: 'missing_update_template',
      },
      'Database update blocked:'
    );
    toast(error, { variant: 'error' });
    return {
      result: null,
      bundle: {
        error,
        guardrail: 'missing-update-template',
      },
      debugPayload: {
        mode: 'custom',
        updateStrategy,
        entityType,
        collection: configuredCollection || null,
        idField,
        entityId,
      },
      aiPrompt,
    };
  }

  const currentValueRaw: unknown = templateInputs['value'] ?? templateInputs['jobId'] ?? '';
  const currentValue = Array.isArray(currentValueRaw)
    ? (currentValueRaw as unknown[])[0]
    : currentValueRaw;
  const templateGuardrail = resolveWriteTemplateGuardrail({
    templates: [
      {
        name: 'queryTemplate',
        template: queryConfig.queryTemplate ?? '',
      },
      {
        name: 'updateTemplate',
        template: updateTemplate,
      },
    ],
    templateContext: templateInputs,
    currentValue,
  });
  if (!templateGuardrail.ok) {
    const hasMappingConfig = Array.isArray(dbConfig.mappings) && dbConfig.mappings.length > 0;
    const error = hasMappingConfig
      ? `${templateGuardrail.message} Configure update payload mode as "mapping" to apply mapping rows from the node UI.`
      : templateGuardrail.message;
    reportAiPathsError(
      new Error(error),
      {
        action: 'dbUpdateTemplate',
        nodeId: node.id,
        guardrailMeta: templateGuardrail.guardrailMeta,
      },
      'Database update blocked:'
    );
    toast(error, { variant: 'error' });
    return createWriteTemplateGuardrailOutput({
      aiPrompt,
      message: error,
      guardrailMeta: templateGuardrail.guardrailMeta,
    });
  }

  const renderedUpdate = renderJsonTemplate(updateTemplate, templateInputs, currentValue);
  const parsedUpdate = parseJsonSafe(renderedUpdate);
  if (!parsedUpdate || (typeof parsedUpdate !== 'object' && !Array.isArray(parsedUpdate))) {
    const error = 'Update template must be valid JSON.';
    toast(error, { variant: 'error' });
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
  const customFilter = isObjectRecord(renderedFilterPayload.filter)
    ? renderedFilterPayload.filter
    : {};
  if (Object.keys(customFilter).length === 0) {
    const error = 'No explicit update filter provided.';
    reportAiPathsError(
      new Error(error),
      {
        action: 'dbUpdateGuardrail',
        nodeId: node.id,
        guardrail: 'missing_query_filter',
      },
      'Database update blocked:'
    );
    toast(error, { variant: 'error' });
    return {
      result: null,
      bundle: {
        error,
        guardrail: 'missing-query-filter',
      },
      debugPayload: {
        mode: 'custom',
        updateStrategy,
        entityType,
        collection: configuredCollection || null,
        idField,
        entityId,
      },
      aiPrompt,
    };
  }

  let customUpdateDoc: unknown = parsedUpdate;
  const extractUpdates = (value: unknown): Record<string, unknown> => {
    if (!isObjectRecord(value)) return {};
    const setDoc = value['$set'];
    if (isObjectRecord(setDoc)) return setDoc;
    const hasOperator = Object.keys(value).some((key: string): boolean => key.startsWith('$'));
    if (hasOperator) return {};
    return value;
  };
  let updates: Record<string, unknown> = extractUpdates(customUpdateDoc);
  let translationParameterMergeMeta: Record<string, unknown> | undefined;
  const isTranslationParameterUpdate =
    isConfiguredTranslationParameterUpdate ||
    isResolvedTranslationParameterUpdate(updates, parameterTargetPath);

  if (isTranslationParameterUpdate) {
    const descriptionPruneResult = pruneEmptyTranslationDescriptionUpdate(updates);
    updates = descriptionPruneResult.updates;
    if (descriptionPruneResult.pruned) {
      customUpdateDoc = patchTargetPathInUpdateDoc(customUpdateDoc, 'description_pl', updates);
    }

    if (Object.prototype.hasOwnProperty.call(updates, parameterTargetPath)) {
      await ensureExistingParameterTemplateContext(parameterTargetPath, {
        forceHydrateRichParameters: true,
      });
      const translationMergeResult = mergeTranslatedParameterUpdates({
        targetPath: parameterTargetPath,
        updates,
        templateInputs,
        languageCode: 'pl',
        requireFullCoverage: false,
      });
      if (translationMergeResult.applied) {
        updates = translationMergeResult.updates;
        translationParameterMergeMeta = translationMergeResult.meta;
        customUpdateDoc = patchTargetPathInUpdateDoc(customUpdateDoc, parameterTargetPath, updates);
      }
    }

    if (Object.keys(updates).length === 0) {
      return createTranslationNoUpdatesOutput({
        error:
          'Translation update blocked. No safe description or parameter translation updates were resolved.',
        aiPrompt,
        entityType,
        collection: configuredCollection,
        filter: customFilter,
        translationParameterMergeMeta,
        reportAiPathsError,
        toast,
        nodeId: node.id,
        mode: 'custom',
      });
    }
  }

  const debugPayload: Record<string, unknown> = {
    mode: 'custom',
    updateStrategy,
    entityType,
    collection: configuredCollection || null,
    forceCollectionUpdate,
    idField,
    entityId,
    filter: customFilter,
    updateDoc: customUpdateDoc,
    queryTemplate: queryConfig.queryTemplate ?? '',
    updateTemplate: dbConfig.updateTemplate ?? '',
    ...(translationParameterMergeMeta
      ? { translationParameterMerge: translationParameterMergeMeta }
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
    updates: {},
    updateStrategy,
    entityType,
    shouldUseEntityUpdate,
    entityId,
    configuredCollection,
    updatePayloadMode: 'custom',
    customFilter,
    customUpdateDoc,
  });
  if (executionResult.skipped) {
    return {
      ...prevOutputs,
      result: null,
      bundle: {
        error: 'Database update was skipped.',
        guardrail: 'update-skipped',
      },
      debugPayload,
      aiPrompt,
    };
  }

  debugPayload['execution'] = executionResult.executionMeta;

  const updateResult: unknown = executionResult.updateResult;
  const customContentEnValue = resolveCustomContentEnValue(customUpdateDoc);

  return {
    content_en: customContentEnValue ?? (nodeInputs['content_en'] as string | undefined) ?? '',
    bundle: {
      filter: customFilter,
      update: customUpdateDoc,
      ...(executionResult.executionMeta ?? {}),
      ...(executionResult.writeOutcome ? { writeOutcome: executionResult.writeOutcome } : {}),
    },
    result: updateResult,
    debugPayload,
    ...(executionResult.writeOutcome ? { writeOutcome: executionResult.writeOutcome } : {}),
    aiPrompt,
  };
}
