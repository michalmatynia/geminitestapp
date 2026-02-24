import type {
  DatabaseAction,
  DatabaseConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { coerceArrayLike } from './database-parameter-inference';
import { dbApi, ApiResponse } from '../../../api';
import {
  evaluateWriteOutcome,
  resolveWriteOutcomePolicy,
} from './integration-database-write-guardrails';

export type ExecuteMongoCollectionUpdateInput = {
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dbConfig: DatabaseConfig;
  queryPayload: Record<string, unknown>;
  collection: string;
  idType: unknown;
  debugPayload: Record<string, unknown>;
  parameterTargetPath: string;
  updates: Record<string, unknown>;
  primaryTarget: string;
  resolvedFilter: Record<string, unknown>;
  updateDoc: unknown;
  aiPrompt: string;
};

export async function executeMongoCollectionUpdate({
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
}: ExecuteMongoCollectionUpdateInput): Promise<RuntimePortValues> {
  let nextResolvedFilter: Record<string, unknown> = resolvedFilter;

  if (action === 'updateOne') {
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
    ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
    ...(queryPayload['collectionMap'] ? { collectionMap: queryPayload['collectionMap'] as Record<string, string> } : {}),
    action,
    collection,
    filter: nextResolvedFilter,
    update: updateDoc,
    ...(idType !== undefined ? { idType: idType as string } : {}),
    ...(action === 'findOneAndUpdate'
      ? { returnDocument: 'after' as const }
      : {}),
  });
  executed.updater.add(node.id);
  if (!updateResult.ok) {
    const updateErrorMessage =
      typeof updateResult.error === 'string' && updateResult.error.trim().length > 0
        ? updateResult.error.trim()
        : 'Update failed';
    reportAiPathsError(
      new Error(updateErrorMessage),
      { action: 'dbUpdate', collection, nodeId: node.id },
      'Database update failed:',
    );
    toast(updateErrorMessage || 'Database update failed.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: updateErrorMessage },
      debugPayload,
      aiPrompt,
    };
  }

  const writeOutcomeEvaluation = evaluateWriteOutcome({
    operation: 'update',
    action,
    result: updateResult.data,
    policy: resolveWriteOutcomePolicy(dbConfig),
  });
  const writeOutcome = writeOutcomeEvaluation.writeOutcome;
  if (writeOutcomeEvaluation.isZeroAffected) {
    const message =
      writeOutcome.message ??
      `Database write affected 0 records for update (${action}).`;
    if (writeOutcome.status === 'failed') {
      reportAiPathsError(
        new Error(message),
        {
          action: 'dbWriteOutcome',
          collection,
          nodeId: node.id,
          writeOutcome,
        },
        'Database update failed:',
      );
      toast(message, { variant: 'error' });
      throw new Error(message);
    }
    toast(message, { variant: 'warning' });
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
  if (writeOutcome.status !== 'warning') {
    toast(
      `Entity updated in ${collection} (${modifiedCount} row${modifiedCount === 1 ? '' : 's'}).`,
      { variant: 'success' },
    );
  }
  const primaryValue: unknown = updates[primaryTarget];
  return {
    content_en:
      primaryTarget === 'content_en'
        ? ((primaryValue as string | undefined) ??
          (nodeInputs['content_en'] as string | undefined))
        : (nodeInputs['content_en'] as string | undefined),
    result: updateResult.data,
    bundle: {
      ...(updateResult.data as Record<string, unknown>),
      writeOutcome,
    },
    debugPayload,
    writeOutcome,
    aiPrompt,
  };
}
