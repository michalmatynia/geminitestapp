import type {
  DatabaseConfig,
  DbQueryConfig,
  DatabaseOperation,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { handleDatabaseDeleteOperation } from './integration-database-delete-operation';
import { handleDatabaseInsertOperation } from './integration-database-insert-operation';
import { handleDatabaseQueryOperation } from './integration-database-query-operation';
import { handleDatabaseUpdateOperation } from './integration-database-update-operation';

export type HandleDatabaseStandardOperationInput = {
  operation: DatabaseOperation;
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
  writeSourcePath: string;
  templateInputValue: unknown;
  templateInputs: RuntimePortValues;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
  ensureExistingParameterTemplateContext: (targetPath: string) => Promise<void>;
  strictFlowMode: boolean;
};

type DatabaseStandardOperationHandler = (
  args: HandleDatabaseStandardOperationInput
) => Promise<RuntimePortValues>;

const queryOperationHandler: DatabaseStandardOperationHandler = async ({
  nodeInputs,
  reportAiPathsError,
  toast,
  simulationEntityType,
  simulationEntityId,
  resolvedInputs,
  queryConfig,
  dryRun,
  templateInputValue,
  templateInputs,
  templateContext,
  aiPrompt,
  strictFlowMode,
}) =>
  await handleDatabaseQueryOperation({
    nodeInputs,
    reportAiPathsError,
    toast,
    simulationEntityType,
    simulationEntityId,
    resolvedInputs,
    queryConfig,
    dryRun,
    templateInputValue,
    templateInputs,
    templateContext,
    aiPrompt,
    strictFlowMode,
  });

const updateOperationHandler: DatabaseStandardOperationHandler = async ({
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
}) =>
  await handleDatabaseUpdateOperation({
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
  });

const insertOperationHandler: DatabaseStandardOperationHandler = async ({
  node,
  nodeInputs,
  executed,
  reportAiPathsError,
  toast,
  dbConfig,
  queryConfig,
  dryRun,
  writeSourcePath,
  templateInputValue,
  templateContext,
  aiPrompt,
}) =>
  await handleDatabaseInsertOperation({
    node,
    nodeInputs,
    executed,
    reportAiPathsError,
    toast,
    dbConfig,
    queryConfig,
    dryRun,
    writeSourcePath,
    templateInputValue,
    templateContext,
    aiPrompt,
  });

const deleteOperationHandler: DatabaseStandardOperationHandler = async ({
  node,
  nodeInputs,
  executed,
  reportAiPathsError,
  toast,
  simulationEntityType,
  simulationEntityId,
  dbConfig,
  dryRun,
  aiPrompt,
}) =>
  await handleDatabaseDeleteOperation({
    node,
    nodeInputs,
    executed,
    reportAiPathsError,
    toast,
    simulationEntityType,
    simulationEntityId,
    dbConfig,
    dryRun,
    aiPrompt,
  });

const OPERATION_HANDLERS: Partial<Record<DatabaseOperation, DatabaseStandardOperationHandler>> = {
  query: queryOperationHandler,
  update: updateOperationHandler,
  insert: insertOperationHandler,
  delete: deleteOperationHandler,
};

export async function handleDatabaseStandardOperation({
  operation,
  aiPrompt,
  ...rest
}: HandleDatabaseStandardOperationInput): Promise<RuntimePortValues> {
  const operationHandler = OPERATION_HANDLERS[operation];
  if (!operationHandler) {
    return { aiPrompt };
  }
  return await operationHandler({
    operation,
    aiPrompt,
    ...rest,
  });
}
