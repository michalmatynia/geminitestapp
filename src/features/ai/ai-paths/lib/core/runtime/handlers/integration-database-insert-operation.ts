import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { executeDatabaseInsert } from './integration-database-insert-execution';
import { resolveDatabaseInsertPayload } from './integration-database-insert-payload';

export type HandleDatabaseInsertOperationInput = {
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  writeSourcePath: string;
  templateInputValue: unknown;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
};

export async function handleDatabaseInsertOperation({
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
}: HandleDatabaseInsertOperationInput): Promise<RuntimePortValues> {
  const resolution = resolveDatabaseInsertPayload({
    node,
    nodeInputs,
    reportAiPathsError,
    toast,
    dbConfig,
    queryConfig,
    writeSourcePath,
    templateInputValue,
    templateContext,
    aiPrompt,
  });

  if ('output' in resolution) {
    return resolution.output;
  }

  const insertResult = await executeDatabaseInsert({
    node,
    executed,
    reportAiPathsError,
    toast,
    queryConfig,
    templateContext,
    dryRun,
    payload: resolution.payload,
    entityType: resolution.entityType,
    configuredCollection: resolution.configuredCollection,
    forceCollectionInsert: resolution.forceCollectionInsert,
  });

  return {
    result: insertResult,
    bundle: insertResult as Record<string, unknown>,
    content_en:
      typeof (insertResult as Record<string, unknown>)?.['content_en'] ===
      'string'
        ? ((insertResult as Record<string, unknown>)['content_en'] as string)
        : undefined,
    aiPrompt,
  };
}
