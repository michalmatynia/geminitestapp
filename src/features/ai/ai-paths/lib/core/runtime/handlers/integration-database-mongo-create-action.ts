import type {
  DatabaseAction,
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { dbApi, ApiResponse } from '../../../api';
import { coerceInput, parseJsonSafe } from '../../utils';

export type HandleDatabaseMongoCreateActionInput = {
  action: DatabaseAction;
  node: NodeHandlerContext['node'];
  prevOutputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  resolvedInputs: Record<string, unknown>;
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  collection: string;
  queryPayload: Record<string, unknown>;
  parseJsonTemplate: (template: string) => unknown;
  aiPrompt: string;
};

export async function handleDatabaseMongoCreateAction({
  action,
  node,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  resolvedInputs,
  dbConfig,
  queryConfig,
  dryRun,
  collection,
  queryPayload,
  parseJsonTemplate,
  aiPrompt,
}: HandleDatabaseMongoCreateActionInput): Promise<RuntimePortValues> {
  const payloadTemplate: string = queryConfig.queryTemplate?.trim() ?? '';
  const parsedPayload: unknown = payloadTemplate
    ? parseJsonTemplate(payloadTemplate)
    : null;
  if (
    payloadTemplate &&
  (!parsedPayload ||
    (typeof parsedPayload !== 'object' && !Array.isArray(parsedPayload)))
  ) {
    toast('Insert template must be valid JSON.', {
      variant: 'error',
    });
    return {
      result: null,
      bundle: { error: 'Invalid insert template' },
      aiPrompt,
    };
  }
  const payloadFromTemplate: unknown =
  parsedPayload && typeof parsedPayload === 'object'
    ? parsedPayload
    : null;
  const rawPayload: unknown =
  payloadFromTemplate ??
  coerceInput(resolvedInputs[dbConfig.writeSource ?? 'bundle']);
  const coercePayloadObject = (value: unknown): Record<string, unknown> | null => {
    if (!value) return null;
    if (typeof value === 'string') {
      const parsed: unknown = parseJsonSafe(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  };
  const payloadObject: Record<string, unknown> | null = coercePayloadObject(rawPayload);
  const payloadArray: unknown[] | null = Array.isArray(rawPayload)
    ? (rawPayload as unknown[])
    : null;
  const payload: unknown[] | Record<string, unknown> | null = payloadArray ?? payloadObject;
  if (!payload) {
    toast('Insert requires a JSON payload.', { variant: 'error' });
    return { result: null, bundle: { error: 'Missing payload' }, aiPrompt };
  }
  if (action === 'insertOne' && !payloadObject) {
    toast('insertOne requires a single JSON object.', { variant: 'error' });
    return { result: null, bundle: { error: 'Invalid payload' }, aiPrompt };
  }
  if (executed.updater.has(node.id)) {
    return prevOutputs;
  }
  if (dryRun) {
    executed.updater.add(node.id);
    return {
      result: payload,
      bundle: { dryRun: true, action, collection, payload } as RuntimePortValues,
      aiPrompt,
    };
  }
  const insertActionPayload = {
    ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
    action,
    collection,
    ...(action === 'insertOne' && payloadObject
      ? { document: payloadObject }
      : {}),
    ...(action === 'insertMany'
      ? { documents: Array.isArray(payload) ? (payload) : [payload] }
      : {}),
  };
  const insertResult: ApiResponse<unknown> = await dbApi.action(insertActionPayload);
  executed.updater.add(node.id);
  if (!insertResult.ok) {
    reportAiPathsError(
      new Error(insertResult.error),
      { action: 'dbInsert', collection, nodeId: node.id },
      'Database insert failed:',
    );
    toast(insertResult.error || 'Database insert failed.', { variant: 'error' });
    return { result: null, bundle: { error: 'Insert failed' }, aiPrompt };
  }
  const insertedCount: number =
  typeof (insertResult.data as Record<string, unknown> | null)?.['insertedCount'] === 'number'
    ? ((insertResult.data as Record<string, unknown>)['insertedCount'] as number)
    : 1;
  toast(
    `Entity created in ${collection} (${insertedCount} row${insertedCount === 1 ? '' : 's'}).`,
    { variant: 'success' },
  );
  return {
    result: insertResult.data,
    bundle: insertResult.data as Record<string, unknown>,
    aiPrompt,
  };
}
