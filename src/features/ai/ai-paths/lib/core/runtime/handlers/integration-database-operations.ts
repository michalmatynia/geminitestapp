import type {
  DatabaseConfig,
  DbQueryConfig,
  DatabaseOperation,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

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
};

export async function handleDatabaseStandardOperation({
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
}: HandleDatabaseStandardOperationInput): Promise<RuntimePortValues> {
  if (operation === 'query') {
    return await handleDatabaseQueryOperation({
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
    });
  }

  if (operation === 'update') {
    return await handleDatabaseUpdateOperation({
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
  }

  if (operation === 'insert') {
    return await handleDatabaseInsertOperation({
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
  }

  if (operation === 'delete') {
    return await handleDatabaseDeleteOperation({
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
  }

  return { aiPrompt };
}
