import type {
  DatabaseAction,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import {
  resolveParameterIdsFromInputs,
  shouldRunParameterDefinitionFallback,
} from './database-parameter-inference';
import { dbApi, ApiResponse } from '../../../api';

interface DbActionResult {
  items?: unknown[];
  item?: unknown;
  values?: unknown[];
  count?: number;
  modifiedCount?: number;
  matchedCount?: number;
}

export type HandleDatabaseMongoReadActionInput = {
  action: DatabaseAction;
  collection: string;
  filter: Record<string, unknown>;
  projection: unknown;
  sort: unknown;
  limit: unknown;
  idType: unknown;
  distinctField?: string | undefined;
  queryPayload: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  templateInputs: RuntimePortValues;
  parseJsonTemplate: (template: string) => unknown;
  toast: NodeHandlerContext['toast'];
  aiPrompt: string;
};

export async function handleDatabaseMongoReadAction({
  action,
  collection,
  filter,
  projection,
  sort,
  limit,
  idType,
  distinctField,
  queryPayload,
  queryConfig,
  dryRun,
  templateInputs,
  parseJsonTemplate,
  toast,
  aiPrompt,
}: HandleDatabaseMongoReadActionInput): Promise<RuntimePortValues> {
  if (action === 'distinct' && !distinctField) {
    toast('Distinct requires a field name.', { variant: 'error' });
    return {
      result: null,
      bundle: { error: 'Missing distinct field' },
      aiPrompt,
    };
  }
  if (action === 'aggregate') {
    const parsedPipeline: unknown = parseJsonTemplate(
      queryConfig.queryTemplate ?? '[]',
    );
    if (!Array.isArray(parsedPipeline)) {
      toast('Aggregation pipeline must be a JSON array.', {
        variant: 'error',
      });
      return {
        result: null,
        bundle: { error: 'Invalid pipeline' },
        aiPrompt,
      };
    }
    if (dryRun) {
      return {
        result: parsedPipeline,
        bundle: {
          dryRun: true,
          action,
          collection,
          pipeline: parsedPipeline,
        },
        aiPrompt,
      };
    }
    const aggResult: ApiResponse<DbActionResult> = await dbApi.action<DbActionResult>({ 
      action,
      collection,
      pipeline: parsedPipeline,
    });
    if (!aggResult.ok) {
      toast('Aggregation failed.', { variant: 'error' });
      return {
        result: null,
        bundle: { error: 'Aggregation failed' },
        aiPrompt,
      };
    }
    return {
      result: (aggResult.data as Record<string, unknown>)?.['items'] ?? [],
      bundle: {
        count:
        (aggResult.data as Record<string, unknown>)?.['count'] ??
        (Array.isArray((aggResult.data as Record<string, unknown>)?.['items'])
          ? ((aggResult.data as Record<string, unknown>)?.['items'] as unknown[]).length
          : 0),
        collection,
      },
      aiPrompt,
    };
  }

  if (dryRun) {
    return {
      result: filter,
      bundle: {
        dryRun: true,
        action,
        collection,
        filter,
        projection,
        sort,
        limit,
      },
      aiPrompt,
    };
  }
  const readResult: ApiResponse<DbActionResult> = await dbApi.action<DbActionResult>({ 
    ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
    action,
    collection,
    filter,
    ...(projection !== undefined ? { projection: projection as Record<string, unknown> } : {}),
    ...(sort !== undefined ? { sort: sort as Record<string, unknown> } : {}),
    ...(limit !== undefined ? { limit: limit as number } : {}),
    ...(idType !== undefined ? { idType: idType as string } : {}),
    ...(action === 'distinct' && distinctField ? { distinctField } : {}),
  });
  if (!readResult.ok) {
    toast(readResult.error || 'Database read failed.', { variant: 'error' });
    return { result: null, bundle: { error: 'Read failed' }, aiPrompt };
  }
  const data: DbActionResult = readResult.data;
  let result: unknown = data['item'] ?? data['items'] ?? data['values'] ?? data['count'] ?? [];
  let count: number =
  (data['count'] as number) ??
  (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0);
  let filterForBundle: Record<string, unknown> = filter;
  let fallbackMeta: Record<string, unknown> | undefined;
  if (
    (action === 'find' || action === 'findOne') &&
    shouldRunParameterDefinitionFallback({
      collection,
      query: filter,
      count,
      queryTemplate: queryConfig.queryTemplate ?? '',
    })
  ) {
    const parameterIds = resolveParameterIdsFromInputs(templateInputs);
    if (parameterIds.length > 0) {
      const fallbackFilter: Record<string, unknown> = {
        id: { $in: parameterIds },
      };
      const fallbackReadResult: ApiResponse<DbActionResult> = await dbApi.action<DbActionResult>({
        ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
        action: 'find',
        collection,
        filter: fallbackFilter,
        ...(projection !== undefined ? { projection: projection as Record<string, unknown> } : {}),
        ...(sort !== undefined ? { sort: sort as Record<string, unknown> } : {}),
        ...(limit !== undefined ? { limit: limit as number } : {}),
        ...(idType !== undefined ? { idType: idType as string } : {}),
      });
      if (fallbackReadResult.ok) {
        const fallbackData: DbActionResult = fallbackReadResult.data;
        const fallbackItems: unknown =
          fallbackData['items'] ?? fallbackData['item'] ?? [];
        const fallbackCount: number =
          (fallbackData['count'] as number) ??
          (Array.isArray(fallbackItems)
            ? (fallbackItems as unknown[]).length
            : fallbackItems
              ? 1
              : 0);
        if (fallbackCount > 0) {
          result = fallbackItems;
          count = fallbackCount;
          filterForBundle = fallbackFilter;
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
  toast(
    `Database query succeeded for ${collection} (${count} result${count === 1 ? '' : 's'}).`,
    { variant: 'success' },
  );
  return {
    result,
    bundle: {
      count,
      collection,
      filter: filterForBundle,
      ...(fallbackMeta ? { fallback: fallbackMeta } : {}),
    },
    aiPrompt,
  };
}
