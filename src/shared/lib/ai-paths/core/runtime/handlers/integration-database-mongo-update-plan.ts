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
  mergeLocalizedParameterUpdates,
  materializeParameterInferenceUpdates,
  normalizeNonEmptyString,
  toRecord,
} from './database-parameter-inference';
import {
  applyTopLevelWriteValuePolicies,
  resolveLocalizedParameterMergeConfig,
} from './database-write-policies';
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
  ensureExistingParameterTemplateContext: (
    targetPath: string,
    options?: { forceHydrateRichParameters?: boolean }
  ) => Promise<void>;
  aiPrompt: string;
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

const isImplicitEmptyArray = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.length === 0;

const isProductParameterUpdateTarget = (args: {
  collection: string;
  dbConfig: DatabaseConfig;
  targetPath: string;
}): boolean => {
  if (args.targetPath !== 'parameters') return false;
  const collection = args.collection.trim().toLowerCase();
  if (collection === 'products') return true;
  return normalizeNonEmptyString(args.dbConfig.entityType)?.toLowerCase() === 'product';
};

const pruneImplicitEmptyProductParameterUpdate = (args: {
  collection: string;
  dbConfig: DatabaseConfig;
  targetPath: string;
  updates: Record<string, unknown>;
  updateDoc: unknown;
}): {
  updates: Record<string, unknown>;
  updateDoc: unknown;
  pruned: boolean;
  meta?: Record<string, unknown>;
} => {
  if (args.dbConfig.parameterInferenceGuard?.enabled) {
    return {
      updates: args.updates,
      updateDoc: args.updateDoc,
      pruned: false,
    };
  }
  if (
    !isProductParameterUpdateTarget({
      collection: args.collection,
      dbConfig: args.dbConfig,
      targetPath: args.targetPath,
    })
  ) {
    return {
      updates: args.updates,
      updateDoc: args.updateDoc,
      pruned: false,
    };
  }
  if (!Object.prototype.hasOwnProperty.call(args.updates, args.targetPath)) {
    return {
      updates: args.updates,
      updateDoc: args.updateDoc,
      pruned: false,
    };
  }
  if (!isImplicitEmptyArray(args.updates[args.targetPath])) {
    return {
      updates: args.updates,
      updateDoc: args.updateDoc,
      pruned: false,
    };
  }

  const nextUpdates = { ...args.updates };
  delete nextUpdates[args.targetPath];
  return {
    updates: nextUpdates,
    updateDoc: patchTargetPathInUpdateDoc(args.updateDoc, args.targetPath, nextUpdates),
    pruned: true,
    meta: {
      targetPath: args.targetPath,
      reason: 'implicit_empty_parameter_array',
    },
  };
};

const createNoSafeUpdatesOutput = (args: {
  error: string;
  aiPrompt: string;
  collection: string;
  resolvedFilter: Record<string, unknown>;
  unresolvedSourcePorts?: string[];
  localizedParameterMergeMeta?: Record<string, unknown>;
  reportAiPathsError: BuildMongoUpdatePlanInput['reportAiPathsError'];
  toast: BuildMongoUpdatePlanInput['toast'];
  nodeId: string;
  mode?: 'mapping' | 'custom';
}): BuildMongoUpdatePlanResult => {
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
    output: {
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
        mode: args.mode ?? 'mapping',
        collection: args.collection,
        filter: args.resolvedFilter,
        ...(args.unresolvedSourcePorts && args.unresolvedSourcePorts.length > 0
          ? { unresolvedSourcePorts: args.unresolvedSourcePorts }
          : {}),
        ...(args.localizedParameterMergeMeta
          ? { localizedParameterMerge: args.localizedParameterMergeMeta }
          : {}),
      },
      aiPrompt: args.aiPrompt,
    },
  };
};

const createNoParameterUpdatesOutput = (args: {
  aiPrompt: string;
  collection: string;
  resolvedFilter: Record<string, unknown>;
  mode: 'mapping' | 'custom';
  debugMeta?: Record<string, unknown>;
}): BuildMongoUpdatePlanResult => ({
  output: {
    result: null,
    bundle: {
      skipped: true,
      reason: 'no_parameter_updates',
    },
    debugPayload: {
      mode: args.mode,
      collection: args.collection,
      filter: args.resolvedFilter,
      ...(args.debugMeta ?? {}),
    },
    aiPrompt: args.aiPrompt,
  },
});

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
  const currentValueRaw: unknown =
    templateInputs['value'] ?? templateInputs['result'] ?? templateInputs['jobId'] ?? '';
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

  const localizedParameterMergeConfig = resolveLocalizedParameterMergeConfig(dbConfig);
  const parameterTargetPath =
    normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ??
    localizedParameterMergeConfig?.targetPath ??
    'parameters';

  let updates: Record<string, unknown> = {};
  let updateDoc: unknown = null;
  let localizedParameterMergeMeta: Record<string, unknown> | undefined;
  let implicitEmptyParameterPruneMeta: Record<string, unknown> | undefined;
  let writeValuePoliciesMeta: Record<string, unknown> | undefined;

  if (updatePayloadMode === 'mapping') {
    const mappingResult = resolveDatabaseUpdateMappings({
      dbConfig,
      nodeInputPorts,
      resolvedInputs,
      parameterTargetPath,
    });
    updates = mappingResult.updates;
    const writePolicyResult = applyTopLevelWriteValuePolicies({ updates, dbConfig });
    updates = writePolicyResult.updates;
    writeValuePoliciesMeta =
      dbConfig.skipEmpty || dbConfig.trimStrings
        ? {
            skipEmpty: dbConfig.skipEmpty === true,
            trimStrings: dbConfig.trimStrings === true,
            changedTargets: writePolicyResult.changedTargets,
          }
        : undefined;

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

    const prunedEmptyParameterUpdate = pruneImplicitEmptyProductParameterUpdate({
      collection,
      dbConfig,
      targetPath: parameterTargetPath,
      updates,
      updateDoc,
    });
    if (prunedEmptyParameterUpdate.pruned) {
      updates = prunedEmptyParameterUpdate.updates;
      implicitEmptyParameterPruneMeta = prunedEmptyParameterUpdate.meta;
    }

    if (Object.keys(updates).length === 0) {
      if (localizedParameterMergeConfig || writeValuePoliciesMeta) {
        return createNoSafeUpdatesOutput({
          error:
            'Database update blocked. No safe write candidates were resolved after applying the configured write policies.',
          aiPrompt,
          collection,
          resolvedFilter,
          unresolvedSourcePorts: Array.from(mappingResult.unresolvedSourcePorts),
          localizedParameterMergeMeta,
          reportAiPathsError,
          toast,
          nodeId: node.id,
          mode: 'mapping',
        });
      }
      if (implicitEmptyParameterPruneMeta) {
        return createNoParameterUpdatesOutput({
          aiPrompt,
          collection,
          resolvedFilter,
          mode: 'mapping',
          debugMeta: {
            parameterWriteGuard: implicitEmptyParameterPruneMeta,
            unresolvedSourcePorts: Array.from(mappingResult.unresolvedSourcePorts),
          },
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
      const writePolicyResult = applyTopLevelWriteValuePolicies({ updates, dbConfig });
      updates = writePolicyResult.updates;
      writeValuePoliciesMeta =
        dbConfig.skipEmpty || dbConfig.trimStrings
          ? {
              skipEmpty: dbConfig.skipEmpty === true,
              trimStrings: dbConfig.trimStrings === true,
              changedTargets: writePolicyResult.changedTargets,
            }
          : undefined;
      writePolicyResult.changedTargets.forEach((targetPath: string) => {
        updateDoc = patchTargetPathInUpdateDoc(updateDoc, targetPath, updates);
      });

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
          updateDoc = patchTargetPathInUpdateDoc(
            updateDoc,
            localizedParameterMergeConfig.targetPath,
            updates
          );
        }
      }

      if (
        Object.keys(updates).length === 0 &&
        (localizedParameterMergeConfig || writeValuePoliciesMeta)
      ) {
        return createNoSafeUpdatesOutput({
          error:
            'Database update blocked. No safe write candidates were resolved after applying the configured write policies.',
          aiPrompt,
          collection,
          resolvedFilter,
          localizedParameterMergeMeta,
          reportAiPathsError,
          toast,
          nodeId: node.id,
          mode: 'custom',
        });
      }

      const prunedEmptyParameterUpdate = pruneImplicitEmptyProductParameterUpdate({
        collection,
        dbConfig,
        targetPath: parameterTargetPath,
        updates,
        updateDoc,
      });
      if (prunedEmptyParameterUpdate.pruned) {
        updates = prunedEmptyParameterUpdate.updates;
        updateDoc = prunedEmptyParameterUpdate.updateDoc;
        implicitEmptyParameterPruneMeta = prunedEmptyParameterUpdate.meta;
      }

      if (Object.keys(updates).length === 0 && implicitEmptyParameterPruneMeta) {
        return createNoParameterUpdatesOutput({
          aiPrompt,
          collection,
          resolvedFilter,
          mode: 'custom',
          debugMeta: {
            parameterWriteGuard: implicitEmptyParameterPruneMeta,
          },
        });
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
  if (localizedParameterMergeMeta) {
    debugPayload['localizedParameterMerge'] = localizedParameterMergeMeta;
  }
  if (writeValuePoliciesMeta) {
    debugPayload['writeValuePolicies'] = writeValuePoliciesMeta;
  }
  if (implicitEmptyParameterPruneMeta) {
    debugPayload['parameterWriteGuard'] = implicitEmptyParameterPruneMeta;
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
    const languageCode =
      normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.languageCode) ?? 'en';
    const materializeResult = materializeParameterInferenceUpdates({
      targetPath: parameterTargetPath,
      updates,
      templateInputs,
      definitionsPort,
      definitionsPath,
      languageCode,
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
