import type { DbQueryConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { extractMissingTemplatePorts } from './integration-database-mongo-update-plan-helpers';
import { coerceInput, parseJsonSafe, renderJsonTemplate } from '../../utils';

export type QueryResolutionSource = 'aiQuery' | 'input' | 'callback' | 'customTemplate';

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
  const missingPorts = extractMissingTemplatePorts(args.template, args.templateContext);
  if (missingPorts.length > 0) {
    return {
      ok: false,
      error: `${args.label} is missing connected inputs: ${missingPorts.join(', ')}.`,
    };
  }

  const parsed: unknown = parseJsonSafe(
    renderJsonTemplate(args.template, args.templateContext, args.inputValue)
  );

  if (!isObjectRecord(parsed)) {
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

  if (isObjectRecord(args.value)) {
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

const buildQueryResolutionFailure = (args: {
  toast: NodeHandlerContext['toast'];
  aiPrompt: string;
  collection: string;
  error: string;
  querySource: QueryResolutionSource;
  rawInput?: unknown;
  rawTemplate?: string;
}): ResolveDatabaseQueryResult => {
  args.toast(args.error, { variant: 'error' });
  return buildResolutionErrorOutput({
    aiPrompt: args.aiPrompt,
    collection: args.collection,
    error: args.error,
    querySource: args.querySource,
    ...(args.rawInput !== undefined ? { rawInput: args.rawInput } : {}),
    ...(args.rawTemplate !== undefined ? { rawTemplate: args.rawTemplate } : {}),
  });
};

const resolveParsedInputQuery = (args: {
  value: unknown;
  label: string;
  templateContext: Record<string, unknown>;
  inputValue: unknown;
  toast: NodeHandlerContext['toast'];
  aiPrompt: string;
  collection: string;
  querySource: QueryResolutionSource;
}): ResolveDatabaseQueryResult | { query: Record<string, unknown>; querySource: QueryResolutionSource } => {
  const parsedQuery = parseQueryInputValue({
    value: args.value,
    label: args.label,
    templateContext: args.templateContext,
    inputValue: args.inputValue,
  });

  if (!parsedQuery.ok) {
    return buildQueryResolutionFailure({
      toast: args.toast,
      aiPrompt: args.aiPrompt,
      collection: args.collection,
      error: parsedQuery.error,
      querySource: args.querySource,
      rawInput: args.value,
    });
  }

  return {
    query: parsedQuery.query,
    querySource: args.querySource,
  };
};

const resolveAiQueryPayload = (args: {
  query: Record<string, unknown>;
  queryConfig: DbQueryConfig;
}): { query: Record<string, unknown>; queryConfig: DbQueryConfig } => {
  if (!isObjectRecord(args.query['query'])) {
    return {
      query: args.query,
      queryConfig: args.queryConfig,
    };
  }

  return {
    query: args.query['query'],
    queryConfig:
      typeof args.query['collection'] === 'string'
        ? {
            ...args.queryConfig,
            collection: args.query['collection'],
          }
        : args.queryConfig,
  };
};

const resolveCustomTemplateQuery = (args: {
  queryConfig: DbQueryConfig;
  toast: NodeHandlerContext['toast'];
  aiPrompt: string;
  templateContext: Record<string, unknown>;
  inputValue: unknown;
}): ResolveDatabaseQueryResult | {
  query: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  querySource: QueryResolutionSource;
} => {
  if (args.queryConfig.mode === 'preset') {
    const error =
      'Preset query mode is disabled. Define an explicit query template or connect an explicit query input.';
    return buildQueryResolutionFailure({
      toast: args.toast,
      aiPrompt: args.aiPrompt,
      collection: args.queryConfig.collection,
      error,
      querySource: 'customTemplate',
    });
  }

  const template = args.queryConfig.queryTemplate ?? '';
  if (!template.trim()) {
    const error =
      'No explicit query provided. Define queryTemplate or connect query/queryCallback/aiQuery input.';
    return buildQueryResolutionFailure({
      toast: args.toast,
      aiPrompt: args.aiPrompt,
      collection: args.queryConfig.collection,
      error,
      querySource: 'customTemplate',
      rawTemplate: template,
    });
  }

  const parsedTemplateQuery = parseRenderedQueryTemplate({
    template,
    label: 'Query template',
    templateContext: args.templateContext,
    inputValue: args.inputValue,
  });

  if (!parsedTemplateQuery.ok) {
    return buildQueryResolutionFailure({
      toast: args.toast,
      aiPrompt: args.aiPrompt,
      collection: args.queryConfig.collection,
      error: parsedTemplateQuery.error,
      querySource: 'customTemplate',
      rawTemplate: template,
    });
  }

  return {
    query: parsedTemplateQuery.query,
    queryConfig: args.queryConfig,
    querySource: 'customTemplate',
  };
};

export function resolveDatabaseQuery({
  nodeInputs,
  toast,
  simulationEntityType: _simulationEntityType,
  simulationEntityId: _simulationEntityId,
  resolvedInputs: _resolvedInputs,
  queryConfig,
  templateInputValue,
  templateContext,
  aiPrompt,
}: ResolveDatabaseQueryInput): ResolveDatabaseQueryResult {
  const inputQuery: unknown = coerceInput(nodeInputs['query']);
  const callbackInput: unknown = coerceInput(nodeInputs['queryCallback']);
  const aiQueryInput: unknown = coerceInput(nodeInputs['aiQuery']);

  const inputValue: unknown = templateInputValue;

  if (aiQueryInput !== undefined && aiQueryInput !== null) {
    const resolvedAiQuery = resolveParsedInputQuery({
      value: aiQueryInput,
      label: 'AI query',
      templateContext,
      inputValue,
      toast,
      aiPrompt,
      collection: queryConfig.collection,
      querySource: 'aiQuery',
    });
    if ('output' in resolvedAiQuery) {
      return resolvedAiQuery;
    }

    const aiQueryPayload = resolveAiQueryPayload({
      query: resolvedAiQuery.query,
      queryConfig: { ...queryConfig },
    });
    return {
      query: aiQueryPayload.query,
      queryConfig: aiQueryPayload.queryConfig,
      querySource: resolvedAiQuery.querySource,
    };
  }

  if (inputQuery !== undefined && inputQuery !== null) {
    const resolvedInputQuery = resolveParsedInputQuery({
      value: inputQuery,
      label: 'Query input',
      templateContext,
      inputValue,
      toast,
      aiPrompt,
      collection: queryConfig.collection,
      querySource: 'input',
    });
    if ('output' in resolvedInputQuery) {
      return resolvedInputQuery;
    }

    return {
      query: resolvedInputQuery.query,
      queryConfig: { ...queryConfig },
      querySource: resolvedInputQuery.querySource,
    };
  }

  if (callbackInput !== undefined && callbackInput !== null) {
    const resolvedCallbackQuery = resolveParsedInputQuery({
      value: callbackInput,
      label: 'Query callback',
      templateContext,
      inputValue,
      toast,
      aiPrompt,
      collection: queryConfig.collection,
      querySource: 'callback',
    });
    if ('output' in resolvedCallbackQuery) {
      return resolvedCallbackQuery;
    }

    return {
      query: resolvedCallbackQuery.query,
      queryConfig: { ...queryConfig },
      querySource: resolvedCallbackQuery.querySource,
    };
  }

  const resolvedTemplateQuery = resolveCustomTemplateQuery({
    queryConfig: { ...queryConfig },
    toast,
    aiPrompt,
    templateContext,
    inputValue,
  });
  if ('output' in resolvedTemplateQuery) {
    return resolvedTemplateQuery;
  }

  return {
    query: resolvedTemplateQuery.query,
    queryConfig: resolvedTemplateQuery.queryConfig,
    querySource: resolvedTemplateQuery.querySource,
  };
}
