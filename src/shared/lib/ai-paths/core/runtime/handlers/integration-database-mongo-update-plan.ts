import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import {
  applyParameterInferenceGuard,
  mergeTranslatedParameterUpdates,
  materializeParameterInferenceUpdates,
  normalizeNonEmptyString,
  toRecord,
} from './database-parameter-inference';
import {
  buildMongoUpdateDebugPayload,
  resolveMongoUpdateFilter,
} from './integration-database-mongo-update-plan-helpers';
import { resolveDatabaseUpdateMappings } from './integration-database-update-mapping-resolution';
import {
  createWriteTemplateGuardrailOutput,
  resolveWriteTemplateGuardrail,
} from './integration-database-write-guardrails';

export type MongoUpdatePlan = {
  resolvedFilter: Record<string, unknown>;
  debugPayload: Record<string, unknown>;
  parameterTargetPath: string;
  updates: Record<string, unknown>;
  primaryTarget: string;
  updateDoc: unknown;
};

export type BuildMongoUpdatePlanResult = { output: RuntimePortValues } | { plan: MongoUpdatePlan };

export type BuildMongoUpdatePlanInput = {
  actionCategory: DatabaseActionCategory;
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  prevOutputs: RuntimePortValues;
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  resolvedInputs: Record<string, unknown>;
  nodeInputPorts: string[];
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  collection: string;
  filter: Record<string, unknown>;
  idType: unknown;
  updateTemplate: string;
  templateInputs: RuntimePortValues;
  parseJsonTemplate: (template: string) => unknown;
  ensureExistingParameterTemplateContext: (targetPath: string) => Promise<void>;
  aiPrompt: string;
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
  const record = toRecord(value);
  if (!record) return value;
  const hasTarget = Object.prototype.hasOwnProperty.call(nextUpdates, targetPath);
  const nextTargetValue = nextUpdates[targetPath];
  const setRecord = toRecord(record['$set']);
  if (setRecord) {
    const nextSet: Record<string, unknown> = { ...setRecord };
    if (hasTarget) {
      nextSet[targetPath] = nextTargetValue;
    } else {
      delete nextSet[targetPath];
    }
    return { ...record, $set: nextSet };
  }
  const hasOperator = Object.keys(record).some((key: string): boolean => key.startsWith('$'));
  if (hasOperator) return value;
  const nextRecord: Record<string, unknown> = { ...record };
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
  collection: string;
  resolvedFilter: Record<string, unknown>;
  unresolvedSourcePorts?: string[];
  translationParameterMergeMeta?: Record<string, unknown>;
  reportAiPathsError: BuildMongoUpdatePlanInput['reportAiPathsError'];
  toast: BuildMongoUpdatePlanInput['toast'];
  nodeId: string;
  mode?: 'mapping' | 'custom';
}): BuildMongoUpdatePlanResult => {
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
    output: {
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
        mode: args.mode ?? 'mapping',
        collection: args.collection,
        filter: args.resolvedFilter,
        ...(args.unresolvedSourcePorts && args.unresolvedSourcePorts.length > 0
          ? { unresolvedSourcePorts: args.unresolvedSourcePorts }
          : {}),
        ...(args.translationParameterMergeMeta
          ? { translationParameterMerge: args.translationParameterMergeMeta }
          : {}),
      },
      aiPrompt: args.aiPrompt,
    },
  };
};

export async function buildMongoUpdatePlan({
  actionCategory,
  action,
  node,
  prevOutputs: _prevOutputs,
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
}: BuildMongoUpdatePlanInput): Promise<BuildMongoUpdatePlanResult> {
  const updatePayloadMode = dbConfig.updatePayloadMode ?? 'custom';
  const currentValueRaw: unknown = templateInputs['value'] ?? templateInputs['jobId'] ?? '';
  const currentValue = Array.isArray(currentValueRaw)
    ? (currentValueRaw as unknown[])[0]
    : currentValueRaw;

  if (
    updatePayloadMode !== 'custom' &&
    updatePayloadMode !== 'mapping' &&
    (updatePayloadMode as string) !== 'mongo'
  ) {
    const error =
      'Unsupported update mode. Configure explicit filter and update document or use mappings.';
    reportAiPathsError(
      new Error(error),
      {
        action: 'dbUpdateGuardrail',
        nodeId: node.id,
        updatePayloadMode,
      },
      'Database update blocked:'
    );
    toast(error, { variant: 'error' });
    return {
      output: {
        result: null,
        bundle: {
          error,
          guardrail: 'update-mode-explicit-only',
        },
        debugPayload: {
          mode: updatePayloadMode,
          guardrail: 'update-mode-explicit-only',
        },
        aiPrompt,
      },
    };
  }

  const resolvedFilter: Record<string, unknown> = resolveMongoUpdateFilter({
    filter,
    queryTemplate: queryConfig.queryTemplate,
    parseJsonTemplate,
  });

  const parameterTargetPath =
    normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ?? 'parameters';
  const isTranslationParameterUpdate = isLegacyTranslationParameterUpdate(dbConfig);

  let updates: Record<string, unknown> = {};
  let updateDoc: unknown = null;
  let translationParameterMergeMeta: Record<string, unknown> | undefined;

  if (updatePayloadMode === 'mapping') {
    const mappingResult = resolveDatabaseUpdateMappings({
      dbConfig,
      nodeInputPorts,
      resolvedInputs,
      parameterTargetPath,
    });
    updates = mappingResult.updates;

    if (isTranslationParameterUpdate) {
      const descriptionPruneResult = pruneEmptyTranslationDescriptionUpdate(updates);
      updates = descriptionPruneResult.updates;
    }

    if (
      isTranslationParameterUpdate &&
      Object.prototype.hasOwnProperty.call(updates, parameterTargetPath)
    ) {
      await ensureExistingParameterTemplateContext(parameterTargetPath);
      const translationMergeResult = mergeTranslatedParameterUpdates({
        targetPath: parameterTargetPath,
        updates,
        templateInputs,
        languageCode: 'pl',
        // Legacy translation mappings merge by existing parameterId, so recovered
        // partial payloads can be applied without clobbering untouched parameters.
        requireFullCoverage: false,
      });
      if (translationMergeResult.applied) {
        updates = translationMergeResult.updates;
        translationParameterMergeMeta = translationMergeResult.meta;
      }
    }

    if (Object.keys(updates).length === 0) {
      if (isTranslationParameterUpdate) {
        return createTranslationNoUpdatesOutput({
          error:
            'Translation update blocked. No safe description or parameter translation updates were resolved.',
          aiPrompt,
          collection,
          resolvedFilter,
          unresolvedSourcePorts: Array.from(mappingResult.unresolvedSourcePorts),
          translationParameterMergeMeta,
          reportAiPathsError,
          toast,
          nodeId: node.id,
          mode: 'mapping',
        });
      }
      return {
        output: {
          result: null,
          bundle: {
            skipped: true,
            reason: 'no_mapping_updates',
            unresolvedSourcePorts: Array.from(mappingResult.unresolvedSourcePorts),
          },
          debugPayload: {
            mode: 'mapping',
            collection,
            filter: resolvedFilter,
            unresolvedSourcePorts: Array.from(mappingResult.unresolvedSourcePorts),
          },
          aiPrompt,
        },
      };
    }
    updateDoc = { $set: updates };
  } else {
    if (!updateTemplate.trim()) {
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
        output: {
          result: null,
          bundle: {
            error,
            guardrail: 'missing-update-template',
          },
          debugPayload: {
            mode: 'custom',
            updateStrategy: dbConfig.updateStrategy ?? 'one',
            collection,
            filter: resolvedFilter,
          },
          aiPrompt,
        },
      };
    }

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
      const errorMessage = hasMappingConfig
        ? `${templateGuardrail.message} Configure update payload mode as "mapping" to apply mapping rows from the node UI.`
        : templateGuardrail.message;
      reportAiPathsError(
        new Error(errorMessage),
        {
          action: 'dbUpdateTemplate',
          nodeId: node.id,
          guardrailMeta: templateGuardrail.guardrailMeta,
        },
        'Database update blocked:'
      );
      toast(errorMessage, { variant: 'error' });
      return {
        output: createWriteTemplateGuardrailOutput({
          aiPrompt,
          message: errorMessage,
          guardrailMeta: templateGuardrail.guardrailMeta,
        }),
      };
    }

    if (!updateDoc) {
      const parsedUpdate: unknown = parseJsonTemplate(updateTemplate);
      if (!parsedUpdate || (typeof parsedUpdate !== 'object' && !Array.isArray(parsedUpdate))) {
        toast('Update template must be valid JSON.', { variant: 'error' });
        return {
          output: {
            result: null,
            bundle: { error: 'Invalid update template' },
            debugPayload: {
              mode: 'custom',
              collection,
              filter: resolvedFilter,
            },
            aiPrompt,
          },
        };
      }
      updateDoc = parsedUpdate;

      const extractUpdates = (value: unknown): Record<string, unknown> => {
        const record = toRecord(value);
        if (!record) return {};
        const setRecord = toRecord(record['$set']);
        if (setRecord) return setRecord;
        const hasOperator = Object.keys(record).some((key: string): boolean => key.startsWith('$'));
        if (hasOperator) return {};
        return record;
      };
      updates = extractUpdates(updateDoc);

      if (isTranslationParameterUpdate) {
        const descriptionPruneResult = pruneEmptyTranslationDescriptionUpdate(updates);
        updates = descriptionPruneResult.updates;
        if (descriptionPruneResult.pruned) {
          updateDoc = patchTargetPathInUpdateDoc(updateDoc, 'description_pl', updates);
        }

        if (Object.prototype.hasOwnProperty.call(updates, parameterTargetPath)) {
          await ensureExistingParameterTemplateContext(parameterTargetPath);
          const translationMergeResult = mergeTranslatedParameterUpdates({
            targetPath: parameterTargetPath,
            updates,
            templateInputs,
            languageCode: 'pl',
            // Legacy translation mappings merge by existing parameterId, so recovered
            // partial payloads can be applied without clobbering untouched parameters.
            requireFullCoverage: false,
          });
          if (translationMergeResult.applied) {
            updates = translationMergeResult.updates;
            translationParameterMergeMeta = translationMergeResult.meta;
            updateDoc = patchTargetPathInUpdateDoc(updateDoc, parameterTargetPath, updates);
          }
        }

        if (Object.keys(updates).length === 0) {
          return createTranslationNoUpdatesOutput({
            error:
              'Translation update blocked. No safe description or parameter translation updates were resolved.',
            aiPrompt,
            collection,
            resolvedFilter,
            translationParameterMergeMeta,
            reportAiPathsError,
            toast,
            nodeId: node.id,
            mode: 'custom',
          });
        }
      }
    }
  }

  const debugPayload: Record<string, unknown> = buildMongoUpdateDebugPayload({
    actionCategory,
    action,
    collection,
    resolvedFilter,
    updateTemplate,
    idType,
    resolvedInputs,
  });
  if (translationParameterMergeMeta) {
    debugPayload['translationParameterMerge'] = translationParameterMergeMeta;
  }

  if (!resolvedFilter || Object.keys(resolvedFilter).length === 0) {
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
      output: {
        result: null,
        bundle: {
          error,
          guardrail: 'missing-query-filter',
        },
        debugPayload: {
          ...debugPayload,
          guardrail: 'missing-query-filter',
        },
        aiPrompt,
      },
    };
  }

  let primaryTarget = Object.keys(updates)[0] ?? 'content_en';

  if (dbConfig.parameterInferenceGuard?.enabled) {
    await ensureExistingParameterTemplateContext(parameterTargetPath);

    const guardResult = applyParameterInferenceGuard({
      dbConfig,
      updates,
      templateInputs,
    });
    if (guardResult.applied && guardResult.meta) {
      const existingMeta = toRecord(debugPayload['parameterInferenceGuard']) ?? {};
      debugPayload['parameterInferenceGuard'] = { ...existingMeta, ...guardResult.meta };
      updates = guardResult.updates;
    }
    if (guardResult.blocked) {
      return {
        output: {
          result: null,
          bundle: {
            error: guardResult.errorMessage ?? 'Parameter inference guard blocked update.',
          },
          debugPayload,
          aiPrompt,
        },
      };
    }

    const definitionsPort =
      normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.definitionsPort) ?? 'result';
    const definitionsPath =
      normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.definitionsPath) ?? '';
    const materializeResult = materializeParameterInferenceUpdates({
      targetPath: parameterTargetPath,
      updates,
      templateInputs,
      definitionsPort,
      definitionsPath,
    });
    if (materializeResult.applied) {
      updates = materializeResult.updates;
      if (materializeResult.meta) {
        const existingMeta = toRecord(debugPayload['parameterInferenceGuard']) ?? {};
        const existingWritePlan = toRecord(existingMeta['writePlan']) ?? {};
        debugPayload['parameterInferenceGuard'] = {
          ...existingMeta,
          writePlan: {
            ...existingWritePlan,
            ...materializeResult.meta,
          },
        };
      }
    }

    // Patch updateDoc if it was custom
    if (updatePayloadMode !== 'mapping') {
      updateDoc = patchTargetPathInUpdateDoc(updateDoc, parameterTargetPath, updates);
    } else {
      updateDoc = { $set: updates };
    }

    primaryTarget = Object.keys(updates)[0] ?? 'content_en';

    const isEmptyCustomUpdateDoc = (value: unknown): boolean => {
      const record = toRecord(value);
      if (!record) return true;
      const keys = Object.keys(record);
      if (keys.length === 0) return true;
      const operatorKeys = keys.filter((key: string): boolean => key.startsWith('$'));
      if (operatorKeys.length === 0) return keys.length === 0;
      if (operatorKeys.length === 1 && operatorKeys[0] === '$set') {
        const setRecord = toRecord(record['$set']);
        return !setRecord || Object.keys(setRecord).length === 0;
      }
      return false;
    };

    if (isEmptyCustomUpdateDoc(updateDoc)) {
      return {
        output: {
          result: null,
          bundle: {
            skipped: true,
            reason: 'no_parameter_updates',
          },
          debugPayload,
          aiPrompt,
        },
      };
    }
  }

  debugPayload['updateDoc'] = updateDoc;

  return {
    plan: {
      resolvedFilter,
      debugPayload,
      parameterTargetPath,
      updates,
      primaryTarget,
      updateDoc,
    },
  };
}
