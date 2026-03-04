import type { DatabaseConfig, DbQueryConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { parseJsonSafe, renderJsonTemplate } from '../../utils';
import { buildDbQueryPayload, resolveEntityIdFromInputs } from '../utils';
import {
  createWriteTemplateGuardrailOutput,
  resolveWriteTemplateGuardrail,
} from './integration-database-write-guardrails';
import { resolveDatabaseUpdateMappings } from './integration-database-update-mapping-resolution';
import { executeDatabaseUpdate } from './integration-database-update-execution';
import { isObjectRecord } from '@/shared/utils/object-utils';

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

const resolveCustomContentEnValue = (customUpdateDoc: unknown): string | undefined => {
  if (!isObjectRecord(customUpdateDoc)) return undefined;
  const directValue = customUpdateDoc['content_en'];
  if (typeof directValue === 'string') return directValue;
  const setDoc = customUpdateDoc['$set'];
  if (!isObjectRecord(setDoc)) return undefined;
  const setValue = setDoc['content_en'];
  return typeof setValue === 'string' ? setValue : undefined;
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
  ensureExistingParameterTemplateContext: _ensureExistingParameterTemplateContext,
}: HandleDatabaseUpdateOperationInput): Promise<RuntimePortValues> {
  const updatePayloadMode =
    dbConfig.updatePayloadMode ?? (dbConfig.mappings?.length ? 'mapping' : 'custom');

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

  if (updatePayloadMode === 'mapping') {
    const parameterTargetPath = dbConfig.parameterInferenceGuard?.targetPath ?? 'parameters';
    const mappingResult = resolveDatabaseUpdateMappings({
      dbConfig,
      nodeInputPorts,
      resolvedInputs,
      parameterTargetPath,
    });

    const debugPayload: Record<string, unknown> = {
      mode: 'mapping',
      updateStrategy,
      entityType,
      collection: configuredCollection || null,
      idField,
      entityId,
      mappings: mappingResult.mappings,
      updates: mappingResult.updates,
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
      updates: mappingResult.updates,
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
        updates: mappingResult.updates,
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
    const error = templateGuardrail.message;
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

  const customUpdateDoc: unknown = parsedUpdate;
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
