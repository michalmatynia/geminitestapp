import type {
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { executeDatabaseQuery } from './integration-database-query-execution';
import { resolveDatabaseQuery } from './integration-database-query-resolution';

export type HandleDatabaseQueryOperationInput = {
  nodeInputs: RuntimePortValues;
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedInputs: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  templateInputValue: unknown;
  templateInputs: RuntimePortValues;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
};

export async function handleDatabaseQueryOperation({
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
}: HandleDatabaseQueryOperationInput): Promise<RuntimePortValues> {
  const resolution = resolveDatabaseQuery({
    nodeInputs,
    toast,
    simulationEntityType,
    simulationEntityId,
    resolvedInputs,
    queryConfig,
    templateInputValue,
    templateContext,
    aiPrompt,
  });

  if ('output' in resolution) {
    return resolution.output;
  }

  return executeDatabaseQuery({
    reportAiPathsError,
    toast,
    queryConfig: resolution.queryConfig,
    query: resolution.query,
    querySource: resolution.querySource,
    dryRun,
    templateInputs,
    aiPrompt,
  });
}
