export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import {
  dbApi,
  type DbActionPayload,
  type DbQueryPayload,
} from '@/features/ai/ai-paths/lib/api/client';
import { getValueAtMappingPath } from '@/features/ai/ai-paths/lib/core/utils/json';
import { renderTemplate } from '@/features/ai/ai-paths/lib/core/utils/template';
import { ErrorSystem } from '@/features/observability/server';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import { getSettingValue, getValidationPatternRepository } from '@/features/products/server';
import {
  isPatternEnabledForValidationScope,
  isPatternLaunchEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
  normalizeProductValidationInstanceScope,
} from '@/features/products/utils/validator-instance-behavior';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
  ProductValidationSeverity,
} from '@/shared/types/domain/products';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';

const evaluateRuntimeSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  latestProductValues: z.record(z.string(), z.unknown()).nullable().optional(),
  patternIds: z.array(z.string().trim().min(1)).optional(),
  validationScope: z.enum(['draft_template', 'product_create', 'product_edit']).optional(),
});

type RuntimeOperator =
  | 'truthy'
  | 'falsy'
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

type RuntimeFieldIssue = {
  patternId: string;
  message: string;
  severity: ProductValidationSeverity;
  matchText: string;
  index: number;
  length: number;
  regex: string;
  flags: string | null;
  replacementValue: string | null;
  replacementApplyMode: 'replace_whole_field' | 'replace_matched_segment';
  replacementScope: 'none' | 'global' | 'field';
  replacementActive: boolean;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  debounceMs: number;
};

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

const normalizeDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const normalizePostAcceptBehavior = (value: unknown): ProductValidationPostAcceptBehavior =>
  value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate';

const normalizeRuntimeOperator = (value: unknown): RuntimeOperator => {
  switch (value) {
    case 'truthy':
    case 'falsy':
    case 'equals':
    case 'not_equals':
    case 'contains':
    case 'starts_with':
    case 'ends_with':
    case 'regex':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
    case 'is_empty':
    case 'is_not_empty':
      return value;
    default:
      return 'truthy';
  }
};

const toComparableString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const evaluateRuntimeCondition = (
  operator: RuntimeOperator,
  value: unknown,
  operand: unknown,
  flags: string | null
): boolean => {
  const text = toComparableString(value);
  const compareText = toComparableString(operand);
  switch (operator) {
    case 'truthy':
      return Boolean(value);
    case 'falsy':
      return !value;
    case 'equals':
      return text === compareText;
    case 'not_equals':
      return text !== compareText;
    case 'contains':
      return text.includes(compareText);
    case 'starts_with':
      return text.startsWith(compareText);
    case 'ends_with':
      return text.endsWith(compareText);
    case 'is_empty':
      return text.trim().length === 0;
    case 'is_not_empty':
      return text.trim().length > 0;
    case 'regex': {
      try {
        return new RegExp(compareText, flags ?? undefined).test(text);
      } catch {
        return false;
      }
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = Number(value);
      const right = Number(operand);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (operator === 'gt') return left > right;
      if (operator === 'gte') return left >= right;
      if (operator === 'lt') return left < right;
      return left <= right;
    }
    default:
      return Boolean(value);
  }
};

const resolveFieldTargetAndLocale = (
  fieldName: string
): { target: 'name' | 'description' | 'sku' | 'price' | 'stock' | null; locale: string | null } => {
  let target: 'name' | 'description' | 'sku' | 'price' | 'stock' | null = null;
  if (fieldName.startsWith('name_')) {
    target = 'name';
  } else if (fieldName.startsWith('description_')) {
    target = 'description';
  } else if (fieldName === 'sku') {
    target = 'sku';
  } else if (fieldName === 'price') {
    target = 'price';
  } else if (fieldName === 'stock') {
    target = 'stock';
  }
  const localeMatch = /_(en|pl|de)$/i.exec(fieldName);
  const locale = localeMatch?.[1]?.toLowerCase() ?? null;
  return { target, locale };
};

const isPatternLocaleMatch = (patternLocale: string | null, fieldLocale: string | null): boolean => {
  if (!patternLocale) return true;
  if (!fieldLocale) return false;
  return patternLocale.toLowerCase() === fieldLocale.toLowerCase();
};

const resolvePatternLaunchSourceValue = ({
  pattern,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): string => {
  if (!pattern.launchEnabled || pattern.launchSourceMode === 'current_field') {
    return fieldValue;
  }
  if (pattern.launchSourceMode === 'form_field') {
    return toComparableString(values[pattern.launchSourceField ?? '']);
  }
  return toComparableString(latestProductValues?.[pattern.launchSourceField ?? '']);
};

const shouldLaunchPattern = ({
  pattern,
  validationScope,
  fieldValue,
  values,
  latestProductValues,
}: {
  pattern: ProductValidationPattern;
  validationScope: ProductValidationInstanceScope;
  fieldValue: string;
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
}): boolean => {
  if (!pattern.launchEnabled) return true;
  if (
    !isPatternLaunchEnabledForValidationScope(
      pattern.launchAppliesToScopes,
      validationScope,
      pattern.appliesToScopes
    )
  ) {
    return false;
  }
  if (pattern.launchSourceMode !== 'current_field' && !pattern.launchSourceField?.trim()) {
    return false;
  }
  const sourceValue = resolvePatternLaunchSourceValue({
    pattern,
    fieldValue,
    values,
    latestProductValues,
  });
  return evaluateRuntimeCondition(
    normalizeRuntimeOperator(pattern.launchOperator ?? 'equals'),
    sourceValue,
    pattern.launchValue ?? null,
    pattern.launchFlags ?? null
  );
};

const buildTemplateContext = ({
  values,
  latestProductValues,
  fieldName,
  fieldValue,
  pattern,
}: {
  values: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
  fieldName: string;
  fieldValue: string;
  pattern: ProductValidationPattern;
}): Record<string, unknown> => ({
  ...values,
  values,
  latest: latestProductValues ?? {},
  latestProduct: latestProductValues ?? {},
  fieldName,
  fieldValue,
  patternId: pattern.id,
  patternLabel: pattern.label,
  target: pattern.target,
  locale: pattern.locale,
});

const renderUnknown = (
  value: unknown,
  context: Record<string, unknown>,
  currentValue: unknown
): unknown => {
  if (typeof value === 'string') {
    return renderTemplate(value, context, currentValue);
  }
  if (Array.isArray(value)) {
    return value.map((entry: unknown) => renderUnknown(entry, context, currentValue));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]: [string, unknown]) => [
        key,
        renderUnknown(entry, context, currentValue),
      ])
    );
  }
  return value;
};

const parseRuntimeConfig = (value: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const parseAiJson = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const stripped = trimmed.startsWith('```')
    ? trimmed.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim()
    : trimmed;
  try {
    const parsed = JSON.parse(stripped) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const resolveAiMatch = (parsed: Record<string, unknown> | null): boolean | null => {
  if (!parsed) return null;
  const positiveBooleanKeys = ['match', 'isMatch', 'trigger', 'shouldValidate', 'isViolation', 'violation'];
  for (const key of positiveBooleanKeys) {
    const value = parsed[key];
    if (typeof value === 'boolean') return value;
  }
  const inverseBooleanKeys = ['valid', 'isValid', 'accepted'];
  for (const key of inverseBooleanKeys) {
    const value = parsed[key];
    if (typeof value === 'boolean') return !value;
  }
  return null;
};

const getClient = (
  modelName: string,
  apiKey: string | null
): { openai: OpenAI; isOllama: boolean } => {
  const modelLower = modelName.toLowerCase();
  const isOpenAI =
    (modelLower.startsWith('gpt-') && !modelLower.includes('oss')) ||
    modelLower.startsWith('ft:gpt-') ||
    modelLower.startsWith('o1-');

  if (isOpenAI) {
    if (!apiKey) {
      throw new Error('OpenAI API key is missing for GPT model.');
    }
    return { openai: new OpenAI({ apiKey }), isOllama: false };
  }

  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    isOllama: true,
  };
};

const deriveDiffSegment = (
  before: string,
  after: string
): { index: number; length: number; matchText: string } => {
  if (before === after) {
    const fallback = before.slice(0, 1) || ' ';
    return { index: 0, length: 1, matchText: fallback };
  }

  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start += 1;
  }

  let endBefore = before.length - 1;
  let endAfter = after.length - 1;
  while (endBefore >= start && endAfter >= start && before[endBefore] === after[endAfter]) {
    endBefore -= 1;
    endAfter -= 1;
  }

  const removed = before.slice(start, endBefore + 1);
  return {
    index: start,
    length: Math.max(1, removed.length),
    matchText: removed || before.slice(start, start + 1) || ' ',
  };
};

const resolveReplacementFromResult = (
  config: Record<string, unknown>,
  resultData: unknown,
  context: Record<string, unknown>,
  currentValue: string
): string | null => {
  const replacementPath =
    typeof config['replacementPath'] === 'string' ? config['replacementPath'].trim() : '';
  if (replacementPath) {
    const value = getValueAtMappingPath(resultData, replacementPath);
    const resolved = toComparableString(value).trim();
    return resolved.length > 0 ? resolved : null;
  }
  if (typeof config['replacementValue'] === 'string') {
    const rendered = renderTemplate(config['replacementValue'], context, currentValue).trim();
    return rendered.length > 0 ? rendered : null;
  }
  if (typeof config['replacementValue'] === 'number' || typeof config['replacementValue'] === 'boolean') {
    return String(config['replacementValue']);
  }
  return null;
};

const evaluateDatabaseRuntime = async ({
  config,
  context,
  currentValue,
}: {
  config: Record<string, unknown>;
  context: Record<string, unknown>;
  currentValue: string;
}): Promise<{ matched: boolean; resultData: unknown }> => {
  const operation = config['operation'] === 'action' ? 'action' : 'query';
  const payloadSource =
    config['payload'] && typeof config['payload'] === 'object' && !Array.isArray(config['payload'])
      ? (config['payload'] as Record<string, unknown>)
      : config;
  const renderedPayload = renderUnknown(payloadSource, context, currentValue) as Record<string, unknown>;

  if (operation === 'action') {
    const provider =
      renderedPayload['provider'] === 'mongodb' || renderedPayload['provider'] === 'prisma'
        ? renderedPayload['provider']
        : 'auto';
    const payload: DbActionPayload = {
      provider,
      collection: String(renderedPayload['collection'] ?? ''),
      action: String(renderedPayload['action'] ?? 'find'),
    };
    if (renderedPayload['filter'] !== undefined) payload.filter = renderedPayload['filter'];
    if (Array.isArray(renderedPayload['pipeline'])) payload.pipeline = renderedPayload['pipeline'] as unknown[];
    if (renderedPayload['document'] !== undefined) payload.document = renderedPayload['document'];
    if (Array.isArray(renderedPayload['documents'])) payload.documents = renderedPayload['documents'] as unknown[];
    if (renderedPayload['update'] !== undefined) payload.update = renderedPayload['update'];
    if (renderedPayload['projection'] !== undefined) payload.projection = renderedPayload['projection'];
    if (renderedPayload['sort'] !== undefined) payload.sort = renderedPayload['sort'];
    if (typeof renderedPayload['limit'] === 'number') payload.limit = renderedPayload['limit'];
    if (typeof renderedPayload['idType'] === 'string') payload.idType = renderedPayload['idType'];
    if (typeof renderedPayload['distinctField'] === 'string') payload.distinctField = renderedPayload['distinctField'];
    if (typeof renderedPayload['upsert'] === 'boolean') payload.upsert = renderedPayload['upsert'];
    if (renderedPayload['returnDocument'] === 'before' || renderedPayload['returnDocument'] === 'after') {
      payload.returnDocument = renderedPayload['returnDocument'];
    }
    if (!payload.collection.trim()) {
      throw new Error('Runtime DB action requires a collection.');
    }
    const response = await dbApi.action<Record<string, unknown>>(payload);
    if (!response.ok) {
      throw new Error(response.error || 'Runtime DB action failed.');
    }
    const resultData = response.data ?? {};
    const resultPath = typeof config['resultPath'] === 'string' ? config['resultPath'].trim() : '';
    const operator = normalizeRuntimeOperator(config['operator']);
    const operand = config['operand'] ?? config['value'] ?? config['expected'] ?? null;
    const flags = typeof config['flags'] === 'string' ? config['flags'] : null;
    const candidate = resultPath ? getValueAtMappingPath(resultData, resultPath) : resultData;
    return {
      matched: evaluateRuntimeCondition(operator, candidate, operand, flags),
      resultData,
    };
  }

  const payload: DbQueryPayload = {
    provider: String(renderedPayload['provider'] ?? 'auto'),
    collection: String(renderedPayload['collection'] ?? ''),
    query:
      renderedPayload['query'] && typeof renderedPayload['query'] === 'object'
        ? renderedPayload['query']
        : {},
    ...(renderedPayload['projection'] && typeof renderedPayload['projection'] === 'object'
      ? { projection: renderedPayload['projection'] }
      : {}),
    ...(renderedPayload['sort'] && typeof renderedPayload['sort'] === 'object'
      ? { sort: renderedPayload['sort'] }
      : {}),
    ...(typeof renderedPayload['limit'] === 'number' ? { limit: renderedPayload['limit'] } : {}),
    ...(typeof renderedPayload['single'] === 'boolean' ? { single: renderedPayload['single'] } : {}),
    ...(typeof renderedPayload['idType'] === 'string' ? { idType: renderedPayload['idType'] } : {}),
  };
  if (!payload.collection.trim()) {
    throw new Error('Runtime DB query requires a collection.');
  }
  const response = await dbApi.query<Record<string, unknown>>(payload);
  if (!response.ok) {
    throw new Error(response.error || 'Runtime DB query failed.');
  }
  const resultData = response.data ?? {};
  const defaultResultPath = payload.single ? 'item' : 'count';
  const resultPath = typeof config['resultPath'] === 'string' ? config['resultPath'].trim() : defaultResultPath;
  const operator = normalizeRuntimeOperator(config['operator'] ?? (resultPath === 'count' ? 'gt' : 'truthy'));
  const operand = config['operand'] ?? config['value'] ?? config['expected'] ?? (resultPath === 'count' ? 0 : null);
  const flags = typeof config['flags'] === 'string' ? config['flags'] : null;
  const candidate = resultPath ? getValueAtMappingPath(resultData, resultPath) : resultData;
  return {
    matched: evaluateRuntimeCondition(operator, candidate, operand, flags),
    resultData,
  };
};

const evaluateAiRuntime = async ({
  config,
  context,
  currentValue,
}: {
  config: Record<string, unknown>;
  context: Record<string, unknown>;
  currentValue: string;
}): Promise<{
  matched: boolean;
  resultData: unknown;
  message: string | null;
  replacementValue: string | null;
  severity: ProductValidationSeverity | null;
}> => {
  const modelFromConfig =
    typeof config['model'] === 'string' && config['model'].trim()
      ? config['model'].trim()
      : null;
  const defaultModel = (await getSettingValue('openai_model'))?.trim() || 'gpt-4o-mini';
  const model = modelFromConfig || defaultModel;
  const apiKey = (await getSettingValue('openai_api_key')) ?? process.env['OPENAI_API_KEY'] ?? null;
  const { openai, isOllama } = getClient(model, apiKey);

  const systemPromptRaw =
    typeof config['systemPrompt'] === 'string'
      ? config['systemPrompt']
      : 'You are a strict product validation runtime. Return concise JSON when possible.';
  const promptTemplate =
    typeof config['promptTemplate'] === 'string'
      ? config['promptTemplate']
      : 'Validate field [fieldName] with value [fieldValue]. Return JSON: {"match": boolean, "message": string, "replacementValue": string|null}.';

  const systemPrompt = renderTemplate(systemPromptRaw, context, currentValue);
  const prompt = renderTemplate(promptTemplate, context, currentValue);
  const temperature =
    typeof config['temperature'] === 'number' && Number.isFinite(config['temperature'])
      ? config['temperature']
      : 0;
  const maxTokens =
    typeof config['maxTokens'] === 'number' && Number.isFinite(config['maxTokens'])
      ? Math.max(50, Math.floor(config['maxTokens']))
      : 300;
  const forceJson = config['responseFormat'] === 'json';

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_completion_tokens: maxTokens,
    ...(forceJson && !isOllama ? { response_format: { type: 'json_object' as const } } : {}),
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
  const parsed = parseAiJson(raw);
  const resultData = parsed ? { raw, parsed, ...parsed } : { raw };
  const parsedMatch = resolveAiMatch(parsed);

  let matched = false;
  if (parsedMatch !== null) {
    matched = parsedMatch;
  } else {
    const resultPath = typeof config['resultPath'] === 'string' ? config['resultPath'].trim() : 'raw';
    const operator = normalizeRuntimeOperator(config['operator'] ?? 'truthy');
    const operand = config['operand'] ?? config['value'] ?? config['expected'] ?? null;
    const flags = typeof config['flags'] === 'string' ? config['flags'] : null;
    const candidate = resultPath ? getValueAtMappingPath(resultData, resultPath) : resultData;
    matched = evaluateRuntimeCondition(operator, candidate, operand, flags);
  }

  const message =
    typeof parsed?.['message'] === 'string' && parsed['message'].trim().length > 0
      ? parsed['message'].trim()
      : null;
  const replacementValue =
    typeof parsed?.['replacementValue'] === 'string' && parsed['replacementValue'].trim().length > 0
      ? parsed['replacementValue'].trim()
      : typeof parsed?.['replacement'] === 'string' && parsed['replacement'].trim().length > 0
        ? parsed['replacement'].trim()
        : typeof parsed?.['proposedValue'] === 'string' && parsed['proposedValue'].trim().length > 0
          ? parsed['proposedValue'].trim()
          : null;
  const severity =
    parsed?.['severity'] === 'error' || parsed?.['severity'] === 'warning'
      ? (parsed['severity'] as ProductValidationSeverity)
      : null;

  return {
    matched,
    resultData,
    message,
    replacementValue,
    severity,
  };
};

const buildRuntimeIssue = ({
  pattern,
  fieldName,
  fieldValue,
  replacementValue,
  message,
  severity,
  validationScope,
}: {
  pattern: ProductValidationPattern;
  fieldName: string;
  fieldValue: string;
  replacementValue: string | null;
  message: string;
  severity: ProductValidationSeverity;
  validationScope: 'draft_template' | 'product_create' | 'product_edit';
}): RuntimeFieldIssue => {
  const replacementFields = normalizeReplacementFields(pattern.replacementFields);
  const replacementScope: RuntimeFieldIssue['replacementScope'] = !pattern.replacementEnabled
    ? 'none'
    : replacementFields.length === 0
      ? 'global'
      : 'field';
  const replacementAllowed =
    replacementScope === 'global' ||
    (replacementScope === 'field' && replacementFields.includes(fieldName));
  const replacementEnabledForScope = isPatternReplacementEnabledForValidationScope(
    pattern.replacementAppliesToScopes,
    validationScope,
    pattern.appliesToScopes
  );
  const effectiveReplacementValue =
    pattern.replacementEnabled && replacementAllowed && replacementEnabledForScope
      ? replacementValue
      : null;

  const diff = deriveDiffSegment(fieldValue, effectiveReplacementValue ?? fieldValue);
  return {
    patternId: pattern.id,
    message,
    severity,
    matchText: diff.matchText,
    index: diff.index,
    length: diff.length,
    regex: pattern.regex,
    flags: pattern.flags ?? null,
    replacementValue: effectiveReplacementValue,
    replacementApplyMode: 'replace_whole_field',
    replacementScope,
    replacementActive: Boolean(effectiveReplacementValue),
    postAcceptBehavior: normalizePostAcceptBehavior(pattern.postAcceptBehavior),
    debounceMs: normalizeDebounceMs(pattern.validationDebounceMs),
  };
};

async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof evaluateRuntimeSchema>;
  const values = body.values;
  const latestProductValues = body.latestProductValues ?? null;
  const validationScope = normalizeProductValidationInstanceScope(
    body.validationScope ?? 'product_create'
  );
  const repository = await getValidationPatternRepository();
  const allPatterns = await repository.listPatterns();
  const requestedPatternIds = body.patternIds && body.patternIds.length > 0 ? new Set(body.patternIds) : null;
  const runtimePatterns = allPatterns.filter((pattern: ProductValidationPattern) => {
    if (!pattern.enabled) return false;
    if (!pattern.runtimeEnabled || pattern.runtimeType === 'none') return false;
    if (requestedPatternIds && !requestedPatternIds.has(pattern.id)) return false;
    if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope)) {
      return false;
    }
    return true;
  });

  const issues: Record<string, RuntimeFieldIssue[]> = {};
  const entries = Object.entries(values);
  for (const pattern of runtimePatterns) {
    const runtimeConfig = parseRuntimeConfig(pattern.runtimeConfig);
    if (!runtimeConfig) continue;

    for (const [fieldName, rawValue] of entries) {
      const { target, locale } = resolveFieldTargetAndLocale(fieldName);
      if (!target) continue;
      if (target !== pattern.target) continue;
      if (!isPatternLocaleMatch(pattern.locale, locale)) continue;

      const fieldValue =
        typeof rawValue === 'string'
          ? rawValue
          : typeof rawValue === 'number' && Number.isFinite(rawValue)
            ? String(rawValue)
            : '';
      if (
        !shouldLaunchPattern({
          pattern,
          validationScope,
          fieldValue,
          values,
          latestProductValues,
        })
      ) {
        continue;
      }

      const context = buildTemplateContext({
        values,
        latestProductValues,
        fieldName,
        fieldValue,
        pattern,
      });

      try {
        let matched = false;
        let resultData: unknown = null;
        let runtimeMessage: string | null = null;
        let runtimeReplacementValue: string | null = null;
        let runtimeSeverity: ProductValidationSeverity | null = null;

        if (pattern.runtimeType === 'database_query') {
          const result = await evaluateDatabaseRuntime({
            config: runtimeConfig,
            context,
            currentValue: fieldValue,
          });
          matched = result.matched;
          resultData = result.resultData;
        } else if (pattern.runtimeType === 'ai_prompt') {
          const result = await evaluateAiRuntime({
            config: runtimeConfig,
            context,
            currentValue: fieldValue,
          });
          matched = result.matched;
          resultData = result.resultData;
          runtimeMessage = result.message;
          runtimeReplacementValue = result.replacementValue;
          runtimeSeverity = result.severity;
        }

        if (!matched) continue;

        const runtimeContext = {
          ...context,
          runtime: resultData,
          result: resultData,
        };
        const messageFromTemplate =
          typeof runtimeConfig['messageTemplate'] === 'string'
            ? renderTemplate(runtimeConfig['messageTemplate'], runtimeContext, fieldValue).trim()
            : '';
        const replacementFromResult =
          runtimeReplacementValue ??
          resolveReplacementFromResult(runtimeConfig, resultData, runtimeContext, fieldValue);
        const issue = buildRuntimeIssue({
          pattern,
          fieldName,
          fieldValue,
          replacementValue: replacementFromResult,
          message: runtimeMessage || messageFromTemplate || pattern.message,
          severity: runtimeSeverity ?? pattern.severity,
          validationScope,
        });
        if (!issues[fieldName]) {
          issues[fieldName] = [];
        }
        issues[fieldName].push(issue);
      } catch (error) {
        const onError =
          typeof runtimeConfig['onError'] === 'string' ? runtimeConfig['onError'] : 'ignore';
        void ErrorSystem.logWarning('Runtime validator evaluation failed.', {
          source: 'products.validator-runtime.evaluate',
          patternId: pattern.id,
          fieldName,
          runtimeType: pattern.runtimeType,
          error,
        });
        if (onError !== 'issue') continue;
        const issue = buildRuntimeIssue({
          pattern,
          fieldName,
          fieldValue,
          replacementValue: null,
          message:
            error instanceof Error && error.message.trim()
              ? `Runtime validation failed: ${error.message}`
              : 'Runtime validation failed.',
          severity: 'warning',
          validationScope,
        });
        if (!issues[fieldName]) {
          issues[fieldName] = [];
        }
        issues[fieldName].push(issue);
      }
    }
  }

  return NextResponse.json({
    issues,
    evaluatedPatternCount: runtimePatterns.length,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  {
    source: 'products.validator-runtime.evaluate.POST',
    parseJsonBody: true,
    bodySchema: evaluateRuntimeSchema,
    cacheControl: 'no-store',
  }
);
