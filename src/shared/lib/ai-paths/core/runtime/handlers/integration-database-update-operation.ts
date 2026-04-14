import type { DatabaseConfig, DbQueryConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { parseJsonSafe, renderJsonTemplate } from '../../utils';
import { buildDbQueryPayload, resolveEntityIdFromInputs } from '../utils';
import {
  mergeLocalizedParameterUpdates,
  normalizeNonEmptyString,
} from './database-parameter-inference';
import {
  applyTopLevelWriteValuePolicies,
  resolveLocalizedParameterMergeConfig,
} from './database-write-policies';
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

const createNoSafeUpdatesOutput = (args: {
  error: string;
  aiPrompt: string;
  entityType: string;
  collection: string;
  filter: Record<string, unknown> | null;
  unresolvedSourcePorts?: string[];
  localizedParameterMergeMeta?: Record<string, unknown>;
  reportAiPathsError: HandleDatabaseUpdateOperationInput['reportAiPathsError'];
  toast: HandleDatabaseUpdateOperationInput['toast'];
  nodeId: string;
  mode: 'mapping' | 'custom';
}): RuntimePortValues => {
  args.reportAiPathsError(
    new Error(args.error),
    {
      action: 'dbUpdatePolicy',
      nodeId: args.nodeId,
      ...(args.unresolvedSourcePorts && args.unresolvedSourcePorts.length > 0
        ? { unresolvedSourcePorts: args.unresolvedSourcePorts }
        : {}),
      ...(args.localizedParameterMergeMeta
        ? { localizedParameterMerge: args.localizedParameterMergeMeta }
        : {}),
    },
    'Database update blocked:'
  );
  args.toast(args.error, { variant: 'error' });
  return {
    result: null,
    bundle: {
      error: args.error,
      guardrail: 'no-safe-updates',
      guardrailMeta: {
        code: 'no-safe-updates',
        severity: 'error',
        message: args.error,
        ...(args.unresolvedSourcePorts && args.unresolvedSourcePorts.length > 0
          ? { unresolvedSourcePorts: args.unresolvedSourcePorts }
          : {}),
        ...(args.localizedParameterMergeMeta
          ? { localizedParameterMerge: args.localizedParameterMergeMeta }
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
      ...(args.localizedParameterMergeMeta
        ? { localizedParameterMerge: args.localizedParameterMergeMeta }
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
  const localizedParameterMergeConfig = resolveLocalizedParameterMergeConfig(dbConfig);
  const parameterTargetPath =
    normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ??
    localizedParameterMergeConfig?.targetPath ??
    'parameters';

  if (updatePayloadMode === 'mapping') {
    const mappingResult = resolveDatabaseUpdateMappings({
      dbConfig,
      nodeInputPorts,
      resolvedInputs,
      parameterTargetPath,
    });
    const unresolvedSourcePorts = Array.from(mappingResult.unresolvedSourcePorts);
    let updates: Record<string, unknown> = mappingResult.updates;
    const writePolicyResult = applyTopLevelWriteValuePolicies({ updates, dbConfig });
    updates = writePolicyResult.updates;
    let localizedParameterMergeMeta: Record<string, unknown> | undefined;

    if (
      localizedParameterMergeConfig &&
      Object.prototype.hasOwnProperty.call(updates, localizedParameterMergeConfig.targetPath)
    ) {
      await ensureExistingParameterTemplateContext(localizedParameterMergeConfig.targetPath, {
        forceHydrateRichParameters: true,
      });
      const localizedMergeResult = mergeLocalizedParameterUpdates({
        targetPath: localizedParameterMergeConfig.targetPath,
        updates,
        templateInputs,
        languageCode: localizedParameterMergeConfig.languageCode,
        requireFullCoverage: localizedParameterMergeConfig.requireFullCoverage,
      });
      if (localizedMergeResult.applied) {
        updates = localizedMergeResult.updates;
        localizedParameterMergeMeta = localizedMergeResult.meta;
      }
    }

    const writeValuePoliciesMeta =
      dbConfig.skipEmpty || dbConfig.trimStrings
        ? {
            skipEmpty: dbConfig.skipEmpty === true,
            trimStrings: dbConfig.trimStrings === true,
            changedTargets: writePolicyResult.changedTargets,
          }
        : undefined;

    if (Object.keys(updates).length === 0) {
      if (localizedParameterMergeConfig || writeValuePoliciesMeta) {
        return createNoSafeUpdatesOutput({
          error:
            'Database update blocked. No safe write candidates were resolved after applying the configured write policies.',
          aiPrompt,
          entityType,
          collection: configuredCollection,
          filter: entityId ? { id: entityId } : null,
          unresolvedSourcePorts,
          localizedParameterMergeMeta,
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
        debugPayload: {
          mode: 'mapping',
          updateStrategy,
          entityType,
          collection: configuredCollection || null,
          idField,
          entityId,
          mappings: mappingResult.mappings,
          updates,
          unresolvedSourcePorts,
        },
        aiPrompt,
      };
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
      ...(localizedParameterMergeMeta
        ? { localizedParameterMerge: localizedParameterMergeMeta }
        : {}),
      ...(writeValuePoliciesMeta ? { writeValuePolicies: writeValuePoliciesMeta } : {}),
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

  const currentValueRaw: unknown =
    templateInputs['value'] ?? templateInputs['result'] ?? templateInputs['jobId'] ?? '';
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
    if (hasMappingConfig) {
      const problemRoots = [
        ...new Set([
          ...(templateGuardrail.guardrailMeta.missingRoots ?? []),
          ...(templateGuardrail.guardrailMeta.emptyRoots ?? []),
          ...(templateGuardrail.guardrailMeta.unparseableRoots ?? []),
        ]),
      ];
      const rootHint =
        problemRoots.length > 0
          ? ` (unresolved port${problemRoots.length > 1 ? 's' : ''}: ${problemRoots.join(', ')})`
          : '';
      const fallbackWarning =
        `Update template has unresolved tokens${rootHint} — falling back to mapping rows automatically. ` +
        `To fix permanently: set Update Payload Mode to "mapping" on the Database node so it always uses the configured mapping rows.`;
      toast(fallbackWarning, { variant: 'warning' });
      reportAiPathsError(
        new Error(fallbackWarning),
        {
          action: 'dbUpdateTemplateFallback',
          nodeId: node.id,
          guardrailMeta: templateGuardrail.guardrailMeta,
        },
        'Database update template fallback to mapping mode:'
      );
      return handleDatabaseUpdateOperation({
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
        dbConfig: { ...dbConfig, updatePayloadMode: 'mapping' },
        queryConfig,
        dryRun,
        templateInputs,
        aiPrompt,
        ensureExistingParameterTemplateContext,
      });
    }
    const missingRoots = templateGuardrail.guardrailMeta.missingRoots ?? [];
    const portFix =
      missingRoots.length > 0
        ? `Fix: connect port${missingRoots.length > 1 ? 's' : ''} "${missingRoots.join('", "')}" to the Database node input, or add mapping rows and set Update Payload Mode to "mapping".`
        : 'Fix: connect all referenced input ports to the Database node, or add mapping rows and set Update Payload Mode to "mapping".';
    const error = `${templateGuardrail.message} ${portFix}`;
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
  const writePolicyResult = applyTopLevelWriteValuePolicies({ updates, dbConfig });
  updates = writePolicyResult.updates;
  writePolicyResult.changedTargets.forEach((targetPath: string) => {
    customUpdateDoc = patchTargetPathInUpdateDoc(customUpdateDoc, targetPath, updates);
  });
  let localizedParameterMergeMeta: Record<string, unknown> | undefined;

  if (
    localizedParameterMergeConfig &&
    Object.prototype.hasOwnProperty.call(updates, localizedParameterMergeConfig.targetPath)
  ) {
    await ensureExistingParameterTemplateContext(localizedParameterMergeConfig.targetPath, {
      forceHydrateRichParameters: true,
    });
    const localizedMergeResult = mergeLocalizedParameterUpdates({
      targetPath: localizedParameterMergeConfig.targetPath,
      updates,
      templateInputs,
      languageCode: localizedParameterMergeConfig.languageCode,
      requireFullCoverage: localizedParameterMergeConfig.requireFullCoverage,
    });
    if (localizedMergeResult.applied) {
      updates = localizedMergeResult.updates;
      localizedParameterMergeMeta = localizedMergeResult.meta;
      customUpdateDoc = patchTargetPathInUpdateDoc(
        customUpdateDoc,
        localizedParameterMergeConfig.targetPath,
        updates
      );
    }
  }

  const writeValuePoliciesMeta =
    dbConfig.skipEmpty || dbConfig.trimStrings
      ? {
          skipEmpty: dbConfig.skipEmpty === true,
          trimStrings: dbConfig.trimStrings === true,
          changedTargets: writePolicyResult.changedTargets,
        }
      : undefined;

  if (Object.keys(updates).length === 0 && (localizedParameterMergeConfig || writeValuePoliciesMeta)) {
    return createNoSafeUpdatesOutput({
      error:
        'Database update blocked. No safe write candidates were resolved after applying the configured write policies.',
      aiPrompt,
      entityType,
      collection: configuredCollection,
      filter: customFilter,
      localizedParameterMergeMeta,
      reportAiPathsError,
      toast,
      nodeId: node.id,
      mode: 'custom',
    });
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
    ...(localizedParameterMergeMeta
      ? { localizedParameterMerge: localizedParameterMergeMeta }
      : {}),
    ...(writeValuePoliciesMeta ? { writeValuePolicies: writeValuePoliciesMeta } : {}),
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
