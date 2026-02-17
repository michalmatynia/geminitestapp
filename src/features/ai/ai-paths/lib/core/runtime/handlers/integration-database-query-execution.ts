import type {
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import {
  resolveParameterIdsFromInputs,
  shouldRunParameterDefinitionFallback,
} from './database-parameter-inference';
import { dbApi, ApiResponse } from '../../../api';
import { parseJsonSafe } from '../../utils';

interface DbQueryResult {
  items?: unknown[];
  item?: unknown;
  count?: number;
}

export type ExecuteDatabaseQueryInput = {
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  queryConfig: DbQueryConfig;
  query: Record<string, unknown>;
  dryRun: boolean;
  templateInputs: RuntimePortValues;
  aiPrompt: string;
};

export async function executeDatabaseQuery({
  reportAiPathsError,
  toast,
  queryConfig,
  query,
  dryRun,
  templateInputs,
  aiPrompt,
}: ExecuteDatabaseQueryInput): Promise<RuntimePortValues> {
  const projection: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.projection ?? '') as
    | Record<string, unknown>
    | undefined;
  const sort: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.sort ?? '') as
    | Record<string, unknown>
    | undefined;

  if (dryRun) {
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
        error: 'Query failed',
      },
      aiPrompt,
    };
  }

  let result: unknown = queryConfig.single
    ? ((queryResult.data as Record<string, unknown>)['item'] ?? null)
    : ((queryResult.data as Record<string, unknown>)['items'] ?? []);
  let count: number =
    ((queryResult.data as Record<string, unknown>)['count'] as number) ??
    (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0);
  let queryForBundle: Record<string, unknown> = query;
  let fallbackMeta: Record<string, unknown> | undefined;

  if (
    shouldRunParameterDefinitionFallback({
      collection: queryConfig.collection,
      query,
      count,
      queryTemplate: queryConfig.queryTemplate ?? '',
    })
  ) {
    const parameterIds = resolveParameterIdsFromInputs(templateInputs);
    if (parameterIds.length > 0) {
      const fallbackQuery: Record<string, unknown> = {
        id: { $in: parameterIds },
      };
      const fallbackQueryResult: ApiResponse<DbQueryResult> = await dbApi.query<DbQueryResult>({
        provider: queryConfig.provider,
        collection: queryConfig.collection,
        query: fallbackQuery,
        projection,
        sort,
        limit: Math.max(queryConfig.limit ?? 20, parameterIds.length),
        single: false,
        idType: queryConfig.idType as 'string' | 'objectId' | undefined,
      });
      if (fallbackQueryResult.ok) {
        const fallbackItems: unknown =
          (fallbackQueryResult.data as Record<string, unknown>)['items'] ?? [];
        const fallbackCount: number =
          ((fallbackQueryResult.data as Record<string, unknown>)['count'] as number) ??
          (Array.isArray(fallbackItems)
            ? (fallbackItems as unknown[]).length
            : fallbackItems
              ? 1
              : 0);
        if (fallbackCount > 0) {
          result = fallbackItems;
          count = fallbackCount;
          queryForBundle = fallbackQuery;
          fallbackMeta = {
            used: true,
            reason: 'catalogId_missing',
            by: 'product_parameter_ids',
            parameterIds: parameterIds.slice(0, 50),
          };
        }
      }
    }
  }

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
      query: queryForBundle,
      collection: queryConfig.collection,
      ...(fallbackMeta ? { fallback: fallbackMeta } : {}),
    },
    aiPrompt,
  };
}
