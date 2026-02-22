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
  materializeParameterInferenceUpdates,
  normalizeNonEmptyString,
  toRecord,
} from './database-parameter-inference';
import {
  buildMongoUpdateDebugPayload,
  extractMissingTemplatePorts,
  resolveMongoUpdateFilter,
} from './integration-database-mongo-update-plan-helpers';

export type MongoUpdatePlan = {
  resolvedFilter: Record<string, unknown>;
  debugPayload: Record<string, unknown>;
  parameterTargetPath: string;
  updates: Record<string, unknown>;
  primaryTarget: string;
  updateDoc: unknown;
};

export type BuildMongoUpdatePlanResult =
  | { output: RuntimePortValues }
  | { plan: MongoUpdatePlan };

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

export async function buildMongoUpdatePlan({
  actionCategory,
  action,
  node,
  prevOutputs: _prevOutputs,
  reportAiPathsError,
  toast,
  resolvedInputs,
  nodeInputPorts: _nodeInputPorts,
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
  if (updatePayloadMode !== 'custom') {
    const error =
      'Mapping-based update mode is disabled. Configure explicit filter and update document.';
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
          mode: 'mongo',
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
  const debugPayload: Record<string, unknown> = buildMongoUpdateDebugPayload({
    actionCategory,
    action,
    collection,
    resolvedFilter,
    updateTemplate,
    idType,
    resolvedInputs,
  });
  const parameterTargetPath =
    normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.targetPath) ??
    'parameters';

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
          ...debugPayload,
          guardrail: 'missing-update-template',
        },
        aiPrompt,
      },
    };
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

  const missingTemplatePorts: string[] = updateTemplate
    ? extractMissingTemplatePorts(updateTemplate, templateInputs)
    : [];
  if (missingTemplatePorts.length > 0) {
    const errorMessage = `Update template is missing connected inputs: ${missingTemplatePorts.join(
      ', '
    )}.`;
    reportAiPathsError(
      new Error(errorMessage),
      {
        action: 'dbUpdateTemplate',
        nodeId: node.id,
        missingTemplatePorts,
      },
      'Database update skipped:'
    );
    toast(errorMessage, { variant: 'error' });
    return {
      output: {
        result: null,
        bundle: {
          error: errorMessage,
          guardrail: 'update-template-inputs',
          missingTemplatePorts,
        },
        debugPayload: {
          ...debugPayload,
          guardrail: 'update-template-inputs',
          missingTemplatePorts,
        },
        aiPrompt,
      },
    };
  }
  const parsedUpdate: unknown = updateTemplate ? parseJsonTemplate(updateTemplate) : null;
  if (
    updateTemplate &&
  (!parsedUpdate ||
    (typeof parsedUpdate !== 'object' && !Array.isArray(parsedUpdate)))
  ) {
    toast('Update template must be valid JSON.', { variant: 'error' });
    return {
      output: {
        result: null,
        bundle: { error: 'Invalid update template' },
        debugPayload,
        aiPrompt,
      }
    };
  }
  const updateDocCandidate: unknown = parsedUpdate;
  if (
    !updateDocCandidate ||
  (typeof updateDocCandidate !== 'object' && !Array.isArray(updateDocCandidate))
  ) {
    toast('Update document is missing or invalid.', { variant: 'error' });
    return {
      output: {
        result: null,
        bundle: { error: 'Invalid update' },
        debugPayload,
        aiPrompt,
      }
    };
  }
  let updateDoc: unknown = updateDocCandidate;

  if (
    !Array.isArray(updateDoc) &&
  typeof updateDoc === 'object' &&
  Object.keys(updateDoc as Record<string, unknown>).length === 0
  ) {
    toast('Update document is empty.', { variant: 'error' });
    return {
      output: {
        result: null,
        bundle: { error: 'Empty update' },
        debugPayload,
        aiPrompt,
      }
    };
  }

  const extractUpdates = (value: unknown): Record<string, unknown> => {
    const record = toRecord(value);
    if (!record) return {};
    const setRecord = toRecord(record['$set']);
    if (setRecord) return setRecord;
    const hasOperator = Object.keys(record).some((key: string): boolean => key.startsWith('$'));
    if (hasOperator) return {};
    return record;
  };
  const patchTargetPathInUpdateDoc = (
    value: unknown,
    targetPath: string,
    nextUpdates: Record<string, unknown>
  ): unknown => {
    const record = toRecord(value);
    if (!record) return value;
    const hasTarget = Object.prototype.hasOwnProperty.call(
      nextUpdates,
      targetPath
    );
    const nextTargetValue = nextUpdates[targetPath];
    const setRecord = toRecord(record['$set']);
    if (setRecord) {
      const nextSet: Record<string, unknown> = { ...setRecord };
      if (hasTarget) {
        nextSet[targetPath] = nextTargetValue;
      } else {
        delete nextSet[targetPath];
      }
      return {
        ...record,
        $set: nextSet,
      };
    }
    const hasOperator = Object.keys(record).some((key: string): boolean =>
      key.startsWith('$')
    );
    if (hasOperator) return value;
    const nextRecord: Record<string, unknown> = { ...record };
    if (hasTarget) {
      nextRecord[targetPath] = nextTargetValue;
    } else {
      delete nextRecord[targetPath];
    }
    return nextRecord;
  };
  const isEmptyCustomUpdateDoc = (value: unknown): boolean => {
    const record = toRecord(value);
    if (!record) return true;
    const keys = Object.keys(record);
    if (keys.length === 0) return true;
    const operatorKeys = keys.filter((key: string): boolean =>
      key.startsWith('$')
    );
    if (operatorKeys.length === 0) {
      return keys.length === 0;
    }
    if (operatorKeys.length === 1 && operatorKeys[0] === '$set') {
      const setRecord = toRecord(record['$set']);
      return !setRecord || Object.keys(setRecord).length === 0;
    }
    return false;
  };
  const setParameterInferenceDebug = (meta: Record<string, unknown>): void => {
    const existingMeta = toRecord(debugPayload['parameterInferenceGuard']) ?? {};
    debugPayload['parameterInferenceGuard'] = {
      ...existingMeta,
      ...meta,
    };
  };
  const setParameterInferenceWritePlanDebug = (
    writePlanMeta: Record<string, unknown>
  ): void => {
    const existingMeta = toRecord(debugPayload['parameterInferenceGuard']) ?? {};
    const existingWritePlan = toRecord(existingMeta['writePlan']) ?? {};
    debugPayload['parameterInferenceGuard'] = {
      ...existingMeta,
      writePlan: {
        ...existingWritePlan,
        ...writePlanMeta,
      },
    };
  };

  let updates = extractUpdates(updateDoc);
  let primaryTarget = Object.keys(updates)[0] ?? 'content_en';

  if (dbConfig.parameterInferenceGuard?.enabled) {
    await ensureExistingParameterTemplateContext(parameterTargetPath);

    const guardResult = applyParameterInferenceGuard({
      dbConfig,
      updates,
      templateInputs,
    });
    if (guardResult.applied && guardResult.meta) {
      setParameterInferenceDebug(guardResult.meta);
      updates = guardResult.updates;
    }
    if (guardResult.blocked) {
      return {
        output: {
          result: null,
          bundle: {
            error:
              guardResult.errorMessage ??
              'Parameter inference guard blocked update.',
          },
          debugPayload,
          aiPrompt,
        },
      };
    }

    const definitionsPort =
      normalizeNonEmptyString(dbConfig.parameterInferenceGuard?.definitionsPort) ??
      'result';
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
        setParameterInferenceWritePlanDebug(materializeResult.meta);
      }
    }

    updateDoc = patchTargetPathInUpdateDoc(updateDoc, parameterTargetPath, updates);
    updates = extractUpdates(updateDoc);
    primaryTarget = Object.keys(updates)[0] ?? 'content_en';

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
