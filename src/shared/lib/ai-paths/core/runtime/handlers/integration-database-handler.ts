import type {
  DatabaseConfig,
  DatabaseWriteOutcome,
  DbQueryConfig,
  RuntimePortValues,
  DatabaseOperation,
} from '@/shared/contracts/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import type { SchemaResponse } from '@/shared/lib/ai-paths/api/client';
import {
  extractAiPathsCollectionMapFromRunMeta,
  withAiPathsCollectionMapInput,
} from '@/shared/lib/ai-paths/core/utils/collection-mapping';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { ParameterInferenceGateError } from './database-parameter-inference';
import { resolveDatabaseInputs } from './integration-database-input-resolution';
import { handleDatabaseMongoAction } from './integration-database-mongo-actions';
import { handleDatabaseStandardOperation } from './integration-database-operations';
import { prepareDatabaseTemplateContext } from './integration-database-template-context';
import { getCachedSchema } from './integration-schema-handler';
import { DEFAULT_DB_QUERY } from '../../constants';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



const WRITE_ACTION_CATEGORIES = new Set<string>(['create', 'update', 'delete']);
const WRITE_ACTIONS = new Set<string>([
  'insertone',
  'insertmany',
  'create',
  'createone',
  'createmany',
  'updateone',
  'updatemany',
  'findoneandupdate',
  'replaceone',
  'update',
  'deleteone',
  'deletemany',
  'findoneanddelete',
  'delete',
]);

type DatabaseTerminalError = Error & {
  nodeOutput?: RuntimePortValues;
};

const createDatabaseTerminalError = (
  message: string,
  nodeOutput?: RuntimePortValues
): DatabaseTerminalError => {
  const error = new Error(message) as DatabaseTerminalError;
  if (nodeOutput) {
    error.nodeOutput = nodeOutput;
  }
  return error;
};

const isWriteDatabaseOperation = (config: DatabaseConfig): boolean => {
  const operation: DatabaseOperation = config.operation ?? 'query';
  if (operation === 'insert' || operation === 'update' || operation === 'delete') {
    return true;
  }
  const actionCategory = config.actionCategory ?? null;
  return Boolean(
    config.useMongoActions &&
    (actionCategory === 'create' || actionCategory === 'update' || actionCategory === 'delete')
  );
};

const isWriteResultOperation = (config: DatabaseConfig, result: RuntimePortValues): boolean => {
  if (isWriteDatabaseOperation(config)) return true;

  const debugPayload = result['debugPayload'];
  if (isObjectRecord(debugPayload)) {
    const actionCategory = debugPayload['actionCategory'];
    if (
      typeof actionCategory === 'string' &&
      WRITE_ACTION_CATEGORIES.has(actionCategory.toLowerCase())
    ) {
      return true;
    }
    const action = debugPayload['action'];
    if (typeof action === 'string' && WRITE_ACTIONS.has(action.toLowerCase())) {
      return true;
    }
  }

  const bundle = result['bundle'];
  if (isObjectRecord(bundle)) {
    const action = bundle['action'];
    if (typeof action === 'string' && WRITE_ACTIONS.has(action.toLowerCase())) {
      return true;
    }
    if (
      bundle['modifiedCount'] !== undefined ||
      bundle['matchedCount'] !== undefined ||
      bundle['upsertedCount'] !== undefined ||
      bundle['deletedCount'] !== undefined ||
      bundle['insertedCount'] !== undefined
    ) {
      return true;
    }
  }

  return false;
};

const extractDatabaseError = (result: RuntimePortValues): string | null => {
  const directError = result['error'];
  if (typeof directError === 'string' && directError.trim().length > 0) {
    return directError.trim();
  }
  const bundle = result['bundle'];
  if (isObjectRecord(bundle)) {
    const bundleError = bundle['error'];
    if (typeof bundleError === 'string' && bundleError.trim().length > 0) {
      return bundleError.trim();
    }
  }
  const resultPayload = result['result'];
  if (isObjectRecord(resultPayload)) {
    const payloadError = resultPayload['error'];
    if (typeof payloadError === 'string' && payloadError.trim().length > 0) {
      return payloadError.trim();
    }
  }
  return null;
};

const extractWriteOutcome = (result: RuntimePortValues): DatabaseWriteOutcome | null => {
  const direct = result['writeOutcome'];
  if (isObjectRecord(direct)) {
    return direct as DatabaseWriteOutcome;
  }
  const bundle = result['bundle'];
  if (isObjectRecord(bundle) && isObjectRecord(bundle['writeOutcome'])) {
    return bundle['writeOutcome'] as DatabaseWriteOutcome;
  }
  return null;
};

const extractGuardrailSeverity = (result: RuntimePortValues): 'warning' | 'error' | null => {
  const directMeta = result['guardrailMeta'];
  if (isObjectRecord(directMeta)) {
    const severity = directMeta['severity'];
    if (severity === 'warning' || severity === 'error') {
      return severity;
    }
  }
  const bundle = result['bundle'];
  if (isObjectRecord(bundle) && isObjectRecord(bundle['guardrailMeta'])) {
    const severity = bundle['guardrailMeta']['severity'];
    if (severity === 'warning' || severity === 'error') {
      return severity;
    }
  }
  return null;
};

const shouldTreatWriteErrorAsTerminal = (result: RuntimePortValues): boolean => {
  const writeOutcome = extractWriteOutcome(result);
  if (writeOutcome?.status === 'failed') return true;
  if (writeOutcome?.status === 'warning') return false;
  const guardrailSeverity = extractGuardrailSeverity(result);
  if (guardrailSeverity === 'error') return true;
  if (guardrailSeverity === 'warning') return false;
  return true;
};

export const handleDatabase: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  fetchEntityCached,
  simulationEntityType,
  simulationEntityId,
  triggerContext,
  fallbackEntityId,
  strictFlowMode = true,
  runMeta,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const defaultQuery: DbQueryConfig = DEFAULT_DB_QUERY;
  const dbConfig: DatabaseConfig = (node.config?.database as DatabaseConfig) ?? {
    operation: 'query',
    entityType: 'product',
    idField: 'entityId',
    mode: 'replace',
    mappings: [],
    query: defaultQuery,
    writeSource: 'bundle',
    writeSourcePath: '',
    dryRun: false,
    writeOutcomePolicy: {
      onZeroAffected: 'fail',
    },
  };
  let writeOperationDetected = isWriteDatabaseOperation(dbConfig);

  try {
    const resolvedInputsBase: Record<string, unknown> = resolveDatabaseInputs({
      nodeInputs: nodeInputs,
      triggerContext,
      fallbackEntityId,
      simulationEntityType,
      strictFlowMode,
    });
    const collectionMap = extractAiPathsCollectionMapFromRunMeta(runMeta);
    const resolvedInputs: Record<string, unknown> = withAiPathsCollectionMapInput(
      resolvedInputsBase,
      collectionMap
    );
    const nodeInputPorts: string[] = Array.isArray(node.inputs) ? node.inputs : [];
    const operation: DatabaseOperation = dbConfig.operation ?? 'query';
    const queryConfig: DbQueryConfig = { ...defaultQuery, ...(dbConfig.query ?? {}) };
    const dryRun: boolean = dbConfig.dryRun ?? false;
    const writeSourcePath: string = dbConfig.writeSourcePath?.trim() ?? '';
    const aiPromptTemplate: string = dbConfig.aiPrompt ?? '';
    const useMongoActions: boolean = Boolean(
      dbConfig.useMongoActions && dbConfig.actionCategory && dbConfig.action
    );

    const templateSources: string[] = [
      aiPromptTemplate,
      queryConfig.queryTemplate ?? '',
      dbConfig.updateTemplate ?? '',
    ].filter((value: string): boolean => value.trim().length > 0);
    const wantsSchemaPlaceholders = templateSources.some((value: string) =>
      value.includes('{{Collection:')
    );
    const schemaInput = resolvedInputs['schema'];
    let schemaData: SchemaResponse | null = null;
    if (wantsSchemaPlaceholders) {
      if (
        schemaInput &&
        typeof schemaInput === 'object' &&
        'collections' in (schemaInput as Record<string, unknown>)
      ) {
        schemaData = schemaInput as SchemaResponse;
      } else {
        const schemaResult = await getCachedSchema();
        if (schemaResult.ok) {
          schemaData = schemaResult.data as SchemaResponse;
        }
      }
    }
    const {
      templateInputValue,
      templateInputs,
      templateContext,
      aiPrompt,
      ensureExistingParameterTemplateContext,
    } = prepareDatabaseTemplateContext({
      resolvedInputs,
      dbConfig,
      aiPromptTemplate,
      simulationEntityType,
      fallbackEntityId,
      fetchEntityCached,
      schemaData,
      strictFlowMode,
    });

    if (useMongoActions) {
      const mongoActionResult = await handleDatabaseMongoAction({
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
        templateInputValue,
        templateInputs,
        templateContext,
        aiPrompt,
        ensureExistingParameterTemplateContext,
        strictFlowMode,
      });
      if (mongoActionResult) {
        writeOperationDetected =
          writeOperationDetected || isWriteResultOperation(dbConfig, mongoActionResult);
        const mongoError = extractDatabaseError(mongoActionResult);
        if (
          writeOperationDetected &&
          mongoError &&
          shouldTreatWriteErrorAsTerminal(mongoActionResult)
        ) {
          throw createDatabaseTerminalError(mongoError, mongoActionResult);
        }
        return mongoActionResult;
      }
    }

    const operationResult = await handleDatabaseStandardOperation({
      operation,
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
      writeSourcePath,
      templateInputValue,
      templateInputs,
      templateContext,
      aiPrompt,
      ensureExistingParameterTemplateContext,
      strictFlowMode,
    });
    writeOperationDetected =
      writeOperationDetected || isWriteResultOperation(dbConfig, operationResult);
    const operationError = extractDatabaseError(operationResult);
    if (
      writeOperationDetected &&
      operationError &&
      shouldTreatWriteErrorAsTerminal(operationResult)
    ) {
      throw createDatabaseTerminalError(operationError, operationResult);
    }
    return operationResult;
  } catch (error) {
    logClientError(error);
    if (error instanceof ParameterInferenceGateError) {
      throw error;
    }
    reportAiPathsError(
      error,
      { action: 'handleDatabase', nodeId: node.id },
      'Unexpected database node failure:'
    );
    if (writeOperationDetected) {
      if (error instanceof Error) {
        throw error;
      }
      throw createDatabaseTerminalError(
        typeof error === 'string' ? error : 'Database write failed'
      );
    }
    return {
      result: null,
      bundle: { error: error instanceof Error ? error.message : 'Unknown database error' },
    };
  }
};
