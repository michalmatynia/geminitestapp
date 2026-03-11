import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { executeMongoCollectionUpdate } from './integration-database-mongo-update-collection-executor';
import { buildMongoUpdatePlan } from './integration-database-mongo-update-plan';

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
  ensureExistingParameterTemplateContext: (
    targetPath: string,
    options?: { forceHydrateRichParameters?: boolean }
  ) => Promise<void>;
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
  simulationEntityType: _simulationEntityType,
  simulationEntityId: _simulationEntityId,
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
  const planResult = await buildMongoUpdatePlan({
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
  });

  if ('output' in planResult) {
    return planResult.output;
  }

  const { resolvedFilter, debugPayload, parameterTargetPath, updates, primaryTarget, updateDoc } =
    planResult.plan;

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

  const updatePayloadMode = dbConfig.updatePayloadMode ?? 'custom';

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
      result: null,
      bundle: {
        error,
        guardrail: 'update-mode-explicit-only',
      },
      debugPayload: {
        ...debugPayload,
        guardrail: 'update-mode-explicit-only',
      },
      aiPrompt,
    };
  }

  return await executeMongoCollectionUpdate({
    action,
    node,
    nodeInputs,
    executed,
    reportAiPathsError,
    toast,
    dbConfig,
    queryPayload,
    collection,
    idType,
    debugPayload,
    parameterTargetPath,
    updates,
    primaryTarget,
    resolvedFilter,
    updateDoc,
    aiPrompt,
  });
}
