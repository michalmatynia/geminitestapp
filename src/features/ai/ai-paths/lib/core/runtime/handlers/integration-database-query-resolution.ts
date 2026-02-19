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
import { extractMissingTemplatePorts } from './integration-database-mongo-update-plan-helpers';

export type QueryResolutionSource =
  | 'aiQuery'
  | 'input'
  | 'callback'
  | 'preset'
  | 'customTemplate';

export type ResolveDatabaseQueryResult =
  | { output: RuntimePortValues }
  | {
    query: Record<string, unknown>;
    queryConfig: DbQueryConfig;
    querySource: QueryResolutionSource;
  };

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

type QueryTemplateParseResult =
  | { ok: true; query: Record<string, unknown> }
  | { ok: false; error: string };

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildResolutionErrorOutput = (args: {
  aiPrompt: string;
  collection: string;
  error: string;
  querySource: QueryResolutionSource;
  rawInput?: unknown;
  rawTemplate?: string;
}): ResolveDatabaseQueryResult => ({
  output: {
    result: null,
    bundle: {
      count: 0,
      query: {},
      collection: args.collection,
      error: args.error,
      querySource: args.querySource,
      guardrail: 'query-resolution',
      ...(args.rawInput !== undefined ? { rawInput: args.rawInput } : {}),
      ...(args.rawTemplate !== undefined ? { rawTemplate: args.rawTemplate } : {}),
    },
    aiPrompt: args.aiPrompt,
  },
});

const parseRenderedQueryTemplate = (args: {
  template: string;
  label: string;
  templateContext: Record<string, unknown>;
  inputValue: unknown;
}): QueryTemplateParseResult => {
  const missingPorts = extractMissingTemplatePorts(
    args.template,
    args.templateContext,
  );
  if (missingPorts.length > 0) {
    return {
      ok: false,
      error: `${args.label} is missing connected inputs: ${missingPorts.join(', ')}.`,
    };
  }

  const parsed: unknown = parseJsonSafe(
    renderJsonTemplate(
      args.template,
      args.templateContext,
      args.inputValue,
    ),
  );

  if (!isPlainRecord(parsed)) {
    return {
      ok: false,
      error: `${args.label} must render to a valid JSON object.`,
    };
  }

  return {
    ok: true,
    query: parsed,
  };
};

const parseQueryInputValue = (args: {
  value: unknown;
  label: string;
  templateContext: Record<string, unknown>;
  inputValue: unknown;
}): QueryTemplateParseResult => {
  if (!args.value) {
    return {
      ok: false,
      error: `${args.label} is empty.`,
    };
  }

  if (isPlainRecord(args.value)) {
    const template = JSON.stringify(args.value);
    return parseRenderedQueryTemplate({
      template,
      label: args.label,
      templateContext: args.templateContext,
      inputValue: args.inputValue,
    });
  }

  if (typeof args.value === 'string') {
    const match: RegExpMatchArray | null = args.value.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr: string = match ? match[1]!.trim() : args.value.trim();
    return parseRenderedQueryTemplate({
      template: jsonStr,
      label: args.label,
      templateContext: args.templateContext,
      inputValue: args.inputValue,
    });
  }

  return {
    ok: false,
    error: `${args.label} must be a JSON object or JSON string.`,
  };
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
    resolvedInputs,
    undefined,
    simulationEntityType,
    simulationEntityId,
  );

  const inputValue: unknown = templateInputValue;
  const entityIdInput: unknown = coerceInput(resolvedInputs['entityId']);
  const productIdInput: unknown = coerceInput(resolvedInputs['productId']);

  let query: Record<string, unknown> = {};
  let nextQueryConfig: DbQueryConfig = { ...queryConfig };
  let querySource: QueryResolutionSource = 'customTemplate';

  if (aiQueryInput !== undefined && aiQueryInput !== null) {
    const parsedAiQuery = parseQueryInputValue({
      value: aiQueryInput,
      label: 'AI query',
      templateContext,
      inputValue,
    });

    if (!parsedAiQuery.ok) {
      toast(parsedAiQuery.error, {
        variant: 'error',
      });
      return buildResolutionErrorOutput({
        aiPrompt,
        collection: nextQueryConfig.collection,
        error: parsedAiQuery.error,
        querySource: 'aiQuery',
        rawInput: aiQueryInput,
      });
    }

    if (isPlainRecord(parsedAiQuery.query['query'])) {
      query = parsedAiQuery.query['query'];
      if (typeof parsedAiQuery.query['collection'] === 'string') {
        nextQueryConfig = {
          ...nextQueryConfig,
          collection: parsedAiQuery.query['collection'],
        };
      }
    } else {
      query = parsedAiQuery.query;
    }

    querySource = 'aiQuery';
  } else if (inputQuery !== undefined && inputQuery !== null) {
    const parsedInputQuery = parseQueryInputValue({
      value: inputQuery,
      label: 'Query input',
      templateContext,
      inputValue,
    });

    if (!parsedInputQuery.ok) {
      toast(parsedInputQuery.error, { variant: 'error' });
      return buildResolutionErrorOutput({
        aiPrompt,
        collection: nextQueryConfig.collection,
        error: parsedInputQuery.error,
        querySource: 'input',
        rawInput: inputQuery,
      });
    }

    query = parsedInputQuery.query;
    querySource = 'input';
  } else if (callbackInput !== undefined && callbackInput !== null) {
    const parsedCallbackQuery = parseQueryInputValue({
      value: callbackInput,
      label: 'Query callback',
      templateContext,
      inputValue,
    });

    if (!parsedCallbackQuery.ok) {
      toast(parsedCallbackQuery.error, { variant: 'error' });
      return buildResolutionErrorOutput({
        aiPrompt,
        collection: nextQueryConfig.collection,
        error: parsedCallbackQuery.error,
        querySource: 'callback',
        rawInput: callbackInput,
      });
    }

    query = parsedCallbackQuery.query;
    querySource = 'callback';
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
      querySource = 'preset';
    } else {
      toast('Database query needs an ID/value input.', {
        variant: 'error',
      });
      return buildResolutionErrorOutput({
        aiPrompt,
        collection: nextQueryConfig.collection,
        error: 'Missing query value',
        querySource: 'preset',
      });
    }
  } else {
    const template = nextQueryConfig.queryTemplate ?? '';
    if (!template.trim()) {
      const error =
        'Custom query template is empty. Use {} explicitly for full collection scans.';
      toast(error, { variant: 'error' });
      return buildResolutionErrorOutput({
        aiPrompt,
        collection: nextQueryConfig.collection,
        error,
        querySource: 'customTemplate',
        rawTemplate: template,
      });
    }

    const parsedTemplateQuery = parseRenderedQueryTemplate({
      template,
      label: 'Query template',
      templateContext,
      inputValue,
    });

    if (!parsedTemplateQuery.ok) {
      toast(parsedTemplateQuery.error, { variant: 'error' });
      return buildResolutionErrorOutput({
        aiPrompt,
        collection: nextQueryConfig.collection,
        error: parsedTemplateQuery.error,
        querySource: 'customTemplate',
        rawTemplate: template,
      });
    }

    query = parsedTemplateQuery.query;
    querySource = 'customTemplate';
  }

  return {
    query,
    queryConfig: nextQueryConfig,
    querySource,
  };
}
