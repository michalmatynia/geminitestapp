import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import {
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
  ensureExistingParameterTemplateContext: _ensureExistingParameterTemplateContext,
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
  const updates = extractUpdates(updateDoc);
  const primaryTarget = Object.keys(updates)[0] ?? 'content_en';

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
