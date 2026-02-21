import type {
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { dbApi, ApiResponse } from '../../../api';
import { parseJsonSafe } from '../../utils';

interface DbQueryResult {
  items?: unknown[];
  item?: unknown;
  count?: number;
  provider?: 'mongodb' | 'prisma';
  fallback?: Record<string, unknown>;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export type ExecuteDatabaseQueryInput = {
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  queryConfig: DbQueryConfig;
  query: Record<string, unknown>;
  querySource?: string;
  dryRun: boolean;
  aiPrompt: string;
};

export async function executeDatabaseQuery({
  reportAiPathsError,
  toast,
  queryConfig,
  query,
  querySource,
  dryRun,
  aiPrompt,
}: ExecuteDatabaseQueryInput): Promise<RuntimePortValues> {
  const projection: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.projection ?? '') as
    | Record<string, unknown>
    | undefined;
  const sort: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.sort ?? '') as
    | Record<string, unknown>
    | undefined;

  if (dryRun) {
    const requestedProvider =
      typeof queryConfig.provider === 'string' ? queryConfig.provider : 'auto';
    const resolvedProvider =
      requestedProvider === 'auto' ? null : requestedProvider;
    return {
      result: query,
      bundle: {
        dryRun: true,
        query,
        collection: queryConfig.collection,
        projection,
        sort,
        limit: queryConfig.limit,
        single: queryConfig.single,
        idType: queryConfig.idType,
        requestedProvider,
        resolvedProvider,
        ...(querySource ? { querySource } : {}),
      } as RuntimePortValues,
      aiPrompt,
    };
  }

  const queryResult: ApiResponse<DbQueryResult> = await dbApi.query<DbQueryResult>({
    provider: queryConfig.provider,
    collection: queryConfig.collection,
    query,
    projection,
    sort,
    limit: queryConfig.limit,
    single: queryConfig.single,
    idType: queryConfig.idType as 'string' | 'objectId' | undefined,
  });

  if (!queryResult.ok) {
    const requestedProvider =
      typeof queryConfig.provider === 'string' ? queryConfig.provider : 'auto';
    reportAiPathsError(
      new Error(queryResult.error),
      { action: 'dbQuery', collection: queryConfig.collection, query },
      'Database query failed:',
    );
    toast(queryResult.error || 'Database query failed.', { variant: 'error' });
    return {
      result: null,
      bundle: {
        count: 0,
        query,
        collection: queryConfig.collection,
        requestedProvider,
        error: 'Query failed',
        ...(querySource ? { querySource } : {}),
      },
      aiPrompt,
    };
  }

  const queryResultData = isPlainRecord(queryResult.data)
    ? queryResult.data
    : ({} as Record<string, unknown>);
  const requestedProvider =
    typeof queryConfig.provider === 'string' ? queryConfig.provider : 'auto';
  const responseProvider = queryResultData['provider'];
  const resolvedProvider =
    responseProvider === 'mongodb' || responseProvider === 'prisma'
      ? responseProvider
      : requestedProvider === 'auto'
        ? null
        : requestedProvider;
  const providerFallback = isPlainRecord(queryResultData['fallback'])
    ? queryResultData['fallback']
    : null;

  let result: unknown = queryConfig.single
    ? (queryResultData['item'] ?? null)
    : (queryResultData['items'] ?? []);
  let count: number =
    (queryResultData['count'] as number) ??
    (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0);

  const collectionLabel =
    typeof queryConfig.collection === 'string' && queryConfig.collection.trim()
      ? queryConfig.collection
      : 'collection';
  toast(
    `Database query succeeded for ${collectionLabel} (${count} result${count === 1 ? '' : 's'}).`,
    { variant: 'success' },
  );

  return {
    result,
    bundle: {
      count,
      query,
      collection: queryConfig.collection,
      requestedProvider,
      resolvedProvider,
      ...(querySource ? { querySource } : {}),
      ...(resolvedProvider ? { provider: resolvedProvider } : {}),
      ...(providerFallback ? { providerFallback } : {}),
    },
    aiPrompt,
  };
}
