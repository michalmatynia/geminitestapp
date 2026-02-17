import type {
  DatabaseAction,
  DatabaseConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import {
  coerceArrayLike,
  mergeParameterInferenceUpdates,
  resolveObjectPathValue,
  toRecord,
} from './database-parameter-inference';
import { entityApi } from '../../../api';

export type ExecuteMongoEntityUpdateInput = {
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dbConfig: DatabaseConfig;
  queryPayload: Record<string, unknown>;
  collection: string;
  templateInputs: RuntimePortValues;
  debugPayload: Record<string, unknown>;
  parameterTargetPath: string;
  updates: Record<string, unknown>;
  primaryTarget: string;
  updateDoc: unknown;
  resolveEntityId: () => string | null;
  aiPrompt: string;
};

export async function executeMongoEntityUpdate({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  dbConfig,
  queryPayload,
  collection,
  templateInputs,
  debugPayload,
  parameterTargetPath,
  updates,
  primaryTarget,
  updateDoc,
  resolveEntityId,
  aiPrompt,
}: ExecuteMongoEntityUpdateInput): Promise<RuntimePortValues> {
  const updateDocRecord =
    updateDoc && typeof updateDoc === 'object' && !Array.isArray(updateDoc)
      ? (updateDoc as Record<string, unknown>)
      : null;
  const updateSet =
    updateDocRecord?.['$set'] &&
    typeof updateDocRecord['$set'] === 'object' &&
    !Array.isArray(updateDocRecord['$set'])
      ? (updateDocRecord['$set'] as Record<string, unknown>)
      : null;
  const updatePlain =
    updateDocRecord && !Object.keys(updateDocRecord).some((key) => key.startsWith('$'))
      ? updateDocRecord
      : null;
  let updatesForEntity =
    updateSet ?? updatePlain ?? updates;
  const mergeForEntityResult = mergeParameterInferenceUpdates({
    targetPath: parameterTargetPath,
    updates: updatesForEntity,
    templateInputs,
  });
  if (mergeForEntityResult.applied) {
    updatesForEntity = mergeForEntityResult.updates;
    if (
      debugPayload['parameterInferenceGuard'] &&
      typeof debugPayload['parameterInferenceGuard'] === 'object'
    ) {
      (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['writePlan'] = {
        ...((debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['writePlan'] as Record<string, unknown> | undefined),
        ...(mergeForEntityResult.meta ?? {}),
      };
    }
  }
  if (!updatesForEntity || Object.keys(updatesForEntity).length === 0) {
    return prevOutputs;
  }
  const entityIdValue = resolveEntityId();
  if (!entityIdValue) {
    reportAiPathsError(
      new Error('Database update missing entity id'),
      {
        action: 'updateEntity',
        collection,
        nodeId: node.id,
        provider: queryPayload['provider'],
      },
      'Database update skipped:',
    );
    toast('Database update skipped: missing entity ID.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Missing entity id' },
      debugPayload,
      aiPrompt,
    };
  }
  const updateResult = await entityApi.update({
    entityType: 'product',
    entityId: entityIdValue,
    updates: updatesForEntity,
    mode: dbConfig.mode ?? 'replace',
  });
  executed.updater.add(node.id);
  if (!updateResult.ok) {
    reportAiPathsError(
      new Error(updateResult.error),
      { action: 'updateEntity', collection, nodeId: node.id },
      'Database update failed:',
    );
    toast('Database update failed.', { variant: 'error' });
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
    const writeTarget = resolveObjectPathValue(
      toRecord(updatesForEntity),
      parameterTargetPath,
    );
    (debugPayload['parameterInferenceGuard'] as Record<string, unknown>)['written'] = {
      targetPath: parameterTargetPath,
      count: coerceArrayLike(writeTarget).length,
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
