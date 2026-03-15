import type {
  DatabaseAction,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import type { HttpResult } from '@/shared/contracts/http';
import { dbApi } from '@/shared/lib/ai-paths/api';

import {
  createWriteTemplateGuardrailOutput,
  evaluateWriteOutcome,
  resolveWriteTemplateGuardrail,
  resolveWriteOutcomePolicy,
} from './integration-database-write-guardrails';

export type HandleDatabaseMongoDeleteActionInput = {
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  prevOutputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dbConfig: DatabaseConfig;
  dryRun: boolean;
  collection: string;
  filter: Record<string, unknown>;
  idType: unknown;
  queryPayload: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  templateInputs: RuntimePortValues;
  templateInputValue: unknown;
  aiPrompt: string;
};

export async function handleDatabaseMongoDeleteAction({
  action,
  node,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  dbConfig,
  dryRun,
  collection,
  filter,
  idType,
  queryPayload,
  queryConfig,
  templateInputs,
  templateInputValue,
  aiPrompt,
}: HandleDatabaseMongoDeleteActionInput): Promise<RuntimePortValues> {
  const queryTemplate = queryConfig.queryTemplate?.trim() ?? '';
  if (queryTemplate) {
    const templateGuardrail = resolveWriteTemplateGuardrail({
      templates: [{ name: 'queryTemplate', template: queryTemplate }],
      templateContext: templateInputs,
      currentValue: templateInputValue,
    });
    if (!templateGuardrail.ok) {
      const errorMessage = templateGuardrail.message;
      reportAiPathsError(
        new Error(errorMessage),
        {
          action: 'dbDelete',
          collection,
          nodeId: node.id,
          guardrailMeta: templateGuardrail.guardrailMeta,
        },
        'Database delete blocked:'
      );
      toast(errorMessage, { variant: 'error' });
      return createWriteTemplateGuardrailOutput({
        aiPrompt,
        message: errorMessage,
        guardrailMeta: templateGuardrail.guardrailMeta,
      });
    }
  }
  if (executed.updater.has(node.id)) {
    return prevOutputs;
  }
  if (dryRun) {
    executed.updater.add(node.id);
    const dryRunWriteOutcome = evaluateWriteOutcome({
      operation: 'delete',
      action,
      result: { deletedCount: 1 },
      policy: resolveWriteOutcomePolicy(dbConfig),
    }).writeOutcome;
    return {
      result: { dryRun: true, action, collection, filter },
      bundle: { dryRun: true, writeOutcome: dryRunWriteOutcome } as RuntimePortValues,
      writeOutcome: dryRunWriteOutcome,
      aiPrompt,
    };
  }
  const deleteResult: HttpResult<unknown> = await dbApi.action({
    ...(queryPayload['provider']
      ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' }
      : {}),
    ...(queryPayload['collectionMap']
      ? { collectionMap: queryPayload['collectionMap'] as Record<string, string> }
      : {}),
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
      'Database delete failed:'
    );
    toast(deleteResult.error || 'Database delete failed.', { variant: 'error' });
    return { result: null, bundle: { error: 'Delete failed' }, aiPrompt };
  }
  const writeOutcomeEvaluation = evaluateWriteOutcome({
    operation: 'delete',
    action,
    result: deleteResult.data,
    policy: resolveWriteOutcomePolicy(dbConfig),
  });
  const writeOutcome = writeOutcomeEvaluation.writeOutcome;
  if (writeOutcomeEvaluation.isZeroAffected) {
    const message =
      writeOutcome.message ?? `Database write affected 0 records for delete (${action}).`;
    if (writeOutcome.status === 'failed') {
      reportAiPathsError(
        new Error(message),
        {
          action: 'dbWriteOutcome',
          collection,
          nodeId: node.id,
          writeOutcome,
        },
        'Database delete failed:'
      );
      toast(message, { variant: 'error' });
      throw new Error(message);
    }
    toast(message, { variant: 'warning' });
  } else {
    toast('Delete completed.', { variant: 'success' });
  }
  return {
    result: deleteResult.data,
    bundle: {
      ...(deleteResult.data as Record<string, unknown>),
      writeOutcome,
    },
    writeOutcome,
    aiPrompt,
  };
}
