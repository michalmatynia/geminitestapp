import type {
  DatabaseAction,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { dbApi, ApiResponse } from '../../../api';

export type HandleDatabaseMongoDeleteActionInput = {
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  prevOutputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dryRun: boolean;
  collection: string;
  filter: Record<string, unknown>;
  idType: unknown;
  queryPayload: Record<string, unknown>;
  aiPrompt: string;
};

export async function handleDatabaseMongoDeleteAction({
  action,
  node,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  dryRun,
  collection,
  filter,
  idType,
  queryPayload,
  aiPrompt,
}: HandleDatabaseMongoDeleteActionInput): Promise<RuntimePortValues> {
  if (executed.updater.has(node.id)) {
    return prevOutputs;
  }
  if (dryRun) {
    executed.updater.add(node.id);
    return {
      result: { dryRun: true, action, collection, filter },
      bundle: { dryRun: true } as RuntimePortValues,
      aiPrompt,
    };
  }
  const deleteResult: ApiResponse<unknown> = await dbApi.action({
    ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
    action,
    collection,
    filter,
    ...(idType !== undefined ? { idType: idType as string } : {}),
  });
  executed.updater.add(node.id);
  if (!deleteResult.ok) {
    reportAiPathsError(
      new Error(deleteResult.error),
      { action: 'dbDelete', collection, nodeId: node.id },
      'Database delete failed:',
    );
    toast(deleteResult.error || 'Database delete failed.', { variant: 'error' });
    return { result: null, bundle: { error: 'Delete failed' }, aiPrompt };
  }
  toast('Delete completed.', { variant: 'success' });
  return {
    result: deleteResult.data,
    bundle: deleteResult.data as Record<string, unknown>,
    aiPrompt,
  };
}
