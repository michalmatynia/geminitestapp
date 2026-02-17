import type {
  DatabaseAction,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { coerceArrayLike } from './database-parameter-inference';
import { dbApi, ApiResponse } from '../../../api';

export type ExecuteMongoCollectionUpdateInput = {
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  queryPayload: Record<string, unknown>;
  collection: string;
  idType: unknown;
  debugPayload: Record<string, unknown>;
  parameterTargetPath: string;
  updates: Record<string, unknown>;
  primaryTarget: string;
  resolvedFilter: Record<string, unknown>;
  updateDoc: unknown;
  resolveEntityId: () => string | null;
  aiPrompt: string;
};

export async function executeMongoCollectionUpdate({
  action,
  node,
  nodeInputs,
  executed,
  reportAiPathsError,
  toast,
  queryPayload,
  collection,
  idType,
  debugPayload,
  parameterTargetPath,
  updates,
  primaryTarget,
  resolvedFilter,
  updateDoc,
  resolveEntityId,
  aiPrompt,
}: ExecuteMongoCollectionUpdateInput): Promise<RuntimePortValues> {
  let nextResolvedFilter: Record<string, unknown> = resolvedFilter;

  if (action === 'updateOne') {
    const hasFilter: boolean =
      nextResolvedFilter &&
      typeof nextResolvedFilter === 'object' &&
      Object.keys(nextResolvedFilter).length > 0;
    if (!hasFilter) {
      const fallbackEntityId = resolveEntityId();
      if (fallbackEntityId) {
        nextResolvedFilter = { id: fallbackEntityId };
      }
    }
    if (!nextResolvedFilter || Object.keys(nextResolvedFilter).length === 0) {
      reportAiPathsError(
        new Error('Database update missing filter'),
        { action: 'dbUpdate', collection, nodeId: node.id, provider: queryPayload['provider'] },
        'Database update skipped:',
      );
      toast('Database update skipped: missing query filter.', { variant: 'error' });
      return {
        result: null,
        bundle: { error: 'Missing query filter' },
        debugPayload,
        aiPrompt,
      };
    }
  }

  const updateResult: ApiResponse<unknown> = await dbApi.action({
    ...(queryPayload['provider'] ? { provider: queryPayload['provider'] } : {}),
    action,
    collection,
    filter: nextResolvedFilter,
    update: updateDoc,
    ...(idType !== undefined ? { idType: idType } : {}),
  });
  executed.updater.add(node.id);
  if (!updateResult.ok) {
    reportAiPathsError(
      new Error(updateResult.error),
      { action: 'dbUpdate', collection, nodeId: node.id },
      'Database update failed:',
    );
    toast(updateResult.error || 'Database update failed.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Update failed' },
      debugPayload,
      aiPrompt,
    };
  }

  const modifiedCount: number =
    typeof (updateResult.data as Record<string, unknown> | null)?.['modifiedCount'] === 'number'
      ? ((updateResult.data as Record<string, unknown>)['modifiedCount'] as number)
      : 1;
  if (
    debugPayload['parameterInferenceGuard'] &&
    typeof debugPayload['parameterInferenceGuard'] === 'object'
  ) {
    (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['written'] = {
      targetPath: parameterTargetPath,
      count: coerceArrayLike(updates[parameterTargetPath]).length,
      modifiedCount,
    };
  }
  toast(
    `Entity updated in ${collection} (${modifiedCount} row${modifiedCount === 1 ? '' : 's'}).`,
    { variant: 'success' },
  );
  const primaryValue: unknown = updates[primaryTarget];
  return {
    content_en:
      primaryTarget === 'content_en'
        ? ((primaryValue as string | undefined) ??
          (nodeInputs['content_en'] as string | undefined))
        : (nodeInputs['content_en'] as string | undefined),
    result: updateResult.data,
    bundle: updateResult.data as Record<string, unknown>,
    debugPayload,
    aiPrompt,
  };
}
