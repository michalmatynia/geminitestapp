import type {
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { dbApi, ApiResponse } from '../../../api';
import {
  coerceInput,
  parseJsonSafe,
  renderJsonTemplate,
} from '../../utils';
import {
  looksLikeObjectId,
  resolveEntityIdFromInputs,
} from '../utils';
import {
  resolveParameterIdsFromInputs,
  shouldRunParameterDefinitionFallback,
} from './database-parameter-inference';

interface DbQueryResult {
  items?: unknown[];
  item?: unknown;
  count?: number;
}

export type HandleDatabaseQueryOperationInput = {
  nodeInputs: RuntimePortValues;
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedInputs: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  templateInputValue: unknown;
  templateInputs: RuntimePortValues;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
};

export async function handleDatabaseQueryOperation({
  nodeInputs,
  reportAiPathsError,
  toast,
  simulationEntityType,
  simulationEntityId,
  resolvedInputs,
  queryConfig,
  dryRun,
  templateInputValue,
  templateInputs,
  templateContext,
  aiPrompt,
}: HandleDatabaseQueryOperationInput): Promise<RuntimePortValues> {
  const inputQuery: unknown = coerceInput(nodeInputs['query']);
  const callbackInput: unknown = coerceInput(nodeInputs['queryCallback']);
  const aiQueryInput: unknown = coerceInput(nodeInputs['aiQuery']);
  const resolvedEntityId: string | null = resolveEntityIdFromInputs(
  resolvedInputs as RuntimePortValues,
  undefined,
  simulationEntityType,
  simulationEntityId,
  );
  const inputValue: unknown = templateInputValue;
  const entityIdInput: unknown = coerceInput(resolvedInputs['entityId']);
  const productIdInput: unknown = coerceInput(resolvedInputs['productId']);
  const parseRenderedQuery = (raw: string): Record<string, unknown> | null => {
    const parsed: unknown = parseJsonSafe(
      renderJsonTemplate(
        raw,
        templateContext,
        inputValue ?? '',
      ),
    );
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  };
  const parseQueryInput = (value: unknown): Record<string, unknown> | null => {
    if (!value) return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      try {
        const serialized: string = JSON.stringify(value);
        return parseRenderedQuery(serialized) ?? (value as Record<string, unknown>);
      } catch {
        return value as Record<string, unknown>;
      }
    }
    if (typeof value === 'string') {
      const match: RegExpMatchArray | null = value.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr: string = match ? match[1]!.trim() : value.trim();
      return parseRenderedQuery(jsonStr);
    }
    return null;
  };
  const callbackTemplate: string | null =
  typeof callbackInput === 'string' && (callbackInput).trim()
    ? (callbackInput)
    : null;
  let query: Record<string, unknown> = {};

  // Priority 1: AI-generated query from model output
  if (aiQueryInput !== undefined && aiQueryInput !== null) {
    let parsedAiQuery: Record<string, unknown> | null = null;

    parsedAiQuery = parseQueryInput(aiQueryInput);

    if (parsedAiQuery && typeof parsedAiQuery === 'object') {
    // Handle nested query structure (AI might return {query: {...}, collection: "..."})
      if (parsedAiQuery['query'] && typeof parsedAiQuery['query'] === 'object') {
        query = parsedAiQuery['query'] as Record<string, unknown>;
        // Override collection if AI specified one
        if (typeof parsedAiQuery['collection'] === 'string') {
          queryConfig.collection = parsedAiQuery['collection'];
        }
      } else {
        query = parsedAiQuery;
      }
    } else {
      toast('AI query could not be parsed as valid JSON.', {
        variant: 'error',
      });
      return {
        result: null,
        bundle: {
          count: 0,
          query: {},
          collection: queryConfig.collection,
          error: 'Invalid AI query format',
          rawAiQuery: aiQueryInput,
        },
        aiPrompt,
      };
    }
  } else {
    const inlineQuery = parseQueryInput(inputQuery ?? callbackInput);
    if (inlineQuery) {
      query = inlineQuery;
    } else if (callbackTemplate) {
      const parsed: unknown = parseJsonSafe(
        renderJsonTemplate(
          callbackTemplate,
          templateContext,
          inputValue ?? '',
        ),
      );
      if (parsed && typeof parsed === 'object') {
        query = parsed as Record<string, unknown>;
      }
    } else if (queryConfig.mode === 'preset') {
      const presetValue: unknown =
      queryConfig.preset === 'by_productId'
        ? (productIdInput ?? inputValue)
        : queryConfig.preset === 'by_entityId'
          ? (entityIdInput ?? inputValue ?? resolvedEntityId)
          : (inputValue ??
            resolvedEntityId ??
            entityIdInput ??
            productIdInput);
      if (presetValue !== undefined) {
        let field: string =
        queryConfig.preset === 'by_productId'
          ? 'productId'
          : queryConfig.preset === 'by_entityId'
            ? 'entityId'
            : queryConfig.preset === 'by_field'
              ? queryConfig.field || 'id'
              : '_id';
        if (
          queryConfig.preset === 'by_id' &&
        field === '_id' &&
        !looksLikeObjectId(presetValue as string)
        ) {
          field = 'id';
        }
        query = { [field]: presetValue };
      } else {
        toast('Database query needs an ID/value input.', {
          variant: 'error',
        });
        return {
          result: null,
          bundle: {
            count: 0,
            query: {},
            collection: queryConfig.collection,
            error: 'Missing query value',
          },
          aiPrompt,
        };
      }
    } else {
      const parsed: unknown = parseJsonSafe(
        renderJsonTemplate(
          queryConfig.queryTemplate ?? '{}',
          templateContext,
          inputValue ?? '',
        ),
      );
      if (parsed && typeof parsed === 'object') {
        query = parsed as Record<string, unknown>;
      }
    }
  }
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
