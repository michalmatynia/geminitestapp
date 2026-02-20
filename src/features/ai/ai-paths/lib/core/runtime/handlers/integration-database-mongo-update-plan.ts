import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import {
  ParameterInferenceGateError,
  applyParameterInferenceGuard,
  mergeParameterInferenceUpdates,
  normalizeNonEmptyString,
} from './database-parameter-inference';
import {
  buildMongoUpdateDebugPayload,
  buildMongoUpdatesFromMappings,
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
}: BuildMongoUpdatePlanInput): Promise<BuildMongoUpdatePlanResult> {
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
  let {
    updates,
    primaryTarget,
    missingSourcePorts,
    unresolvedSourcePorts,
  } = buildMongoUpdatesFromMappings({
    dbConfig,
    nodeInputPorts,
    templateInputs,
    parameterTargetPath,
  });
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
  const missingTemplatePorts: string[] = updateTemplate
    ? extractMissingTemplatePorts(updateTemplate, templateInputs)
    : [];
  if (!updateTemplate) {
    if (missingSourcePorts.length > 0 || unresolvedSourcePorts.length > 0) {
      return { output: prevOutputs };
    }
    if (Object.keys(updates).length === 0) {
      return { output: prevOutputs };
    }
  }
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
  const updateDocCandidate: unknown = parsedUpdate ?? updates;
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
    dbConfig.parameterInferenceGuard?.enabled &&
    updates[parameterTargetPath] !== undefined &&
    updateDoc &&
    typeof updateDoc === 'object' &&
    !Array.isArray(updateDoc)
  ) {
    const updateDocRecord = updateDoc as Record<string, unknown>;
    const updateSet =
      updateDocRecord['$set'] &&
      typeof updateDocRecord['$set'] === 'object' &&
      !Array.isArray(updateDocRecord['$set'])
        ? (updateDocRecord['$set'] as Record<string, unknown>)
        : null;
    if (updateSet && Object.prototype.hasOwnProperty.call(updateSet, parameterTargetPath)) {
      updateDoc = {
        ...updateDocRecord,
        $set: {
          ...updateSet,
          [parameterTargetPath]: updates[parameterTargetPath],
        },
      };
    } else if (Object.prototype.hasOwnProperty.call(updateDocRecord, parameterTargetPath)) {
      updateDoc = {
        ...updateDocRecord,
        [parameterTargetPath]: updates[parameterTargetPath],
      };
    }
  }

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
