import type {
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import {
  coerceInput,
  parseJsonSafe,
  renderJsonTemplate,
} from '../../utils';
import {
  looksLikeObjectId,
  resolveEntityIdFromInputs,
} from '../utils';

export type ResolveDatabaseQueryResult =
  | { output: RuntimePortValues }
  | { query: Record<string, unknown>; queryConfig: DbQueryConfig };

export type ResolveDatabaseQueryInput = {
  nodeInputs: RuntimePortValues;
  toast: NodeHandlerContext['toast'];
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedInputs: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  templateInputValue: unknown;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
};

export function resolveDatabaseQuery({
  nodeInputs,
  toast,
  simulationEntityType,
  simulationEntityId,
  resolvedInputs,
  queryConfig,
  templateInputValue,
  templateContext,
  aiPrompt,
}: ResolveDatabaseQueryInput): ResolveDatabaseQueryResult {
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
      ? callbackInput
      : null;

  let query: Record<string, unknown> = {};
  let nextQueryConfig: DbQueryConfig = { ...queryConfig };

  // Priority 1: AI-generated query from model output.
  if (aiQueryInput !== undefined && aiQueryInput !== null) {
    const parsedAiQuery: Record<string, unknown> | null = parseQueryInput(aiQueryInput);

    if (parsedAiQuery && typeof parsedAiQuery === 'object') {
      // AI can return nested { query, collection } payload.
      if (parsedAiQuery['query'] && typeof parsedAiQuery['query'] === 'object') {
        query = parsedAiQuery['query'] as Record<string, unknown>;
        if (typeof parsedAiQuery['collection'] === 'string') {
          nextQueryConfig = {
            ...nextQueryConfig,
            collection: parsedAiQuery['collection'],
          };
        }
      } else {
        query = parsedAiQuery;
      }
    } else {
      toast('AI query could not be parsed as valid JSON.', {
        variant: 'error',
      });
      return {
        output: {
          result: null,
          bundle: {
            count: 0,
            query: {},
            collection: nextQueryConfig.collection,
            error: 'Invalid AI query format',
            rawAiQuery: aiQueryInput,
          },
          aiPrompt,
        },
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
    } else if (nextQueryConfig.mode === 'preset') {
      const presetValue: unknown =
        nextQueryConfig.preset === 'by_productId'
          ? (productIdInput ?? inputValue)
          : nextQueryConfig.preset === 'by_entityId'
            ? (entityIdInput ?? inputValue ?? resolvedEntityId)
            : (inputValue ??
              resolvedEntityId ??
              entityIdInput ??
              productIdInput);
      if (presetValue !== undefined) {
        let field: string =
          nextQueryConfig.preset === 'by_productId'
            ? 'productId'
            : nextQueryConfig.preset === 'by_entityId'
              ? 'entityId'
              : nextQueryConfig.preset === 'by_field'
                ? nextQueryConfig.field || 'id'
                : '_id';
        if (
          nextQueryConfig.preset === 'by_id' &&
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
          output: {
            result: null,
            bundle: {
              count: 0,
              query: {},
              collection: nextQueryConfig.collection,
              error: 'Missing query value',
            },
            aiPrompt,
          },
        };
      }
    } else {
      const parsed: unknown = parseJsonSafe(
        renderJsonTemplate(
          nextQueryConfig.queryTemplate ?? '{}',
          templateContext,
          inputValue ?? '',
        ),
      );
      if (parsed && typeof parsed === 'object') {
        query = parsed as Record<string, unknown>;
      }
    }
  }

  return {
    query,
    queryConfig: nextQueryConfig,
  };
}
