import type { DbQueryConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { dbApi, ApiResponse } from '@/shared/lib/ai-paths/api';
import type { AiPathsCollectionMap } from '@/shared/lib/ai-paths/core/utils/collection-mapping';
import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  resolveParameterIdsFromInputs,
  shouldRunParameterDefinitionFallback,
} from './database-parameter-inference';
import { parseJsonSafe } from '../../utils';

interface DbQueryResult {
  items?: unknown[];
  item?: unknown;
  count?: number;
  requestedProvider?: 'auto' | 'mongodb';
  resolvedProvider?: 'mongodb';
}

export type ExecuteDatabaseQueryInput = {
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  queryConfig: DbQueryConfig;
  query: Record<string, unknown>;
  querySource?: string;
  collectionMap?: AiPathsCollectionMap;
  templateInputs?: RuntimePortValues;
  dryRun: boolean;
  aiPrompt: string;
};

export async function executeDatabaseQuery({
  reportAiPathsError,
  toast,
  queryConfig,
  query,
  querySource,
  collectionMap,
  templateInputs,
  dryRun,
  aiPrompt,
}: ExecuteDatabaseQueryInput): Promise<RuntimePortValues> {
  const projection: Record<string, unknown> | undefined = parseJsonSafe(
    queryConfig.projection ?? ''
  ) as Record<string, unknown> | undefined;
  const sort: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.sort ?? '') as
    | Record<string, unknown>
    | undefined;

  if (dryRun) {
    const requestedProvider =
      typeof queryConfig.provider === 'string' ? queryConfig.provider : 'auto';
    const resolvedProvider = requestedProvider === 'auto' ? null : requestedProvider;
    return {
      result: query,
      bundle: {
        dryRun: true,
        query,
        collection: queryConfig.collection,
        ...(collectionMap ? { collectionMap } : {}),
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
    filter: query,
    projection,
    sort,
    limit: queryConfig.limit,
    single: queryConfig.single,
    ...(collectionMap ? { collectionMap } : {}),
    idType: queryConfig.idType as 'string' | 'objectId' | undefined,
  });

  if (!queryResult.ok) {
    const requestedProvider =
      typeof queryConfig.provider === 'string' ? queryConfig.provider : 'auto';
    reportAiPathsError(
      new Error(queryResult.error),
      { action: 'dbQuery', collection: queryConfig.collection, query },
      'Database query failed:'
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

  const queryResultData = isObjectRecord(queryResult.data)
    ? queryResult.data
    : ({} as Record<string, unknown>);
  const requestedProvider =
    queryResultData['requestedProvider'] === 'auto' ||
    queryResultData['requestedProvider'] === 'mongodb'
      ? queryResultData['requestedProvider']
      : queryConfig.provider === 'mongodb'
        ? 'mongodb'
        : 'auto';
  const hasResolvedProvider =
    queryResultData['resolvedProvider'] === 'mongodb';
  const resolvedProvider = hasResolvedProvider
    ? queryResultData['resolvedProvider']
    : requestedProvider === 'auto'
      ? null
      : requestedProvider;

  let result: unknown = queryConfig.single
    ? (queryResultData['item'] ?? null)
    : (queryResultData['items'] ?? []);
  let count: number =
    (queryResultData['count'] as number) ??
    (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0);
  let fallback: Record<string, unknown> | undefined;

  const fallbackParameterIds =
    templateInputs && !queryConfig.single ? resolveParameterIdsFromInputs(templateInputs) : [];
  if (
    fallbackParameterIds.length > 0 &&
    shouldRunParameterDefinitionFallback({
      collection: queryConfig.collection,
      query,
      count,
      queryTemplate: queryConfig.queryTemplate ?? '',
    })
  ) {
    const parameterIds = Array.from(new Set(fallbackParameterIds));
    const fallbackQuery = {
      id: {
        $in: parameterIds,
      },
    };
    const fallbackQueryResult: ApiResponse<DbQueryResult> = await dbApi.query<DbQueryResult>({
      provider: queryConfig.provider,
      collection: queryConfig.collection,
      filter: fallbackQuery,
      projection,
      sort,
      limit: Math.max(queryConfig.limit ?? parameterIds.length, parameterIds.length),
      single: false,
      ...(collectionMap ? { collectionMap } : {}),
      idType: queryConfig.idType as 'string' | 'objectId' | undefined,
    });

    if (!fallbackQueryResult.ok) {
      reportAiPathsError(
        new Error(fallbackQueryResult.error),
        { action: 'dbQueryFallback', collection: queryConfig.collection, query: fallbackQuery },
        'Database fallback query failed:'
      );
      fallback = {
        strategy: 'parameterId',
        query: fallbackQuery,
        parameterIds,
        error: 'Query failed',
      };
    } else {
      const fallbackData = isObjectRecord(fallbackQueryResult.data)
        ? fallbackQueryResult.data
        : ({} as Record<string, unknown>);
      const fallbackResult = fallbackData['items'] ?? [];
      const fallbackCount =
        (fallbackData['count'] as number) ??
        (Array.isArray(fallbackResult) ? fallbackResult.length : fallbackResult ? 1 : 0);

      fallback = {
        strategy: 'parameterId',
        query: fallbackQuery,
        parameterIds,
        count: fallbackCount,
      };

      if (fallbackCount > 0) {
        result = fallbackResult;
        count = fallbackCount;
      }
    }
  }

  const collectionLabel =
    typeof queryConfig.collection === 'string' && queryConfig.collection.trim()
      ? queryConfig.collection
      : 'collection';
  toast(
    `Database query succeeded for ${collectionLabel} (${count} result${count === 1 ? '' : 's'}).`,
    { variant: 'success' }
  );

  return {
    result,
    bundle: {
      count,
      query,
      collection: queryConfig.collection,
      requestedProvider,
      resolvedProvider,
      ...(fallback ? { fallback } : {}),
      ...(querySource ? { querySource } : {}),
    },
    aiPrompt,
  };
}
