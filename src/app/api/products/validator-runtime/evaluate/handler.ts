import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { dbApi, type DbActionPayload, type DbQueryPayload } from '@/shared/lib/ai-paths/api/client';
import { getValueAtMappingPath } from '@/shared/lib/ai-paths/core/utils/json';
import { renderTemplate } from '@/shared/lib/ai-paths/core/utils/template';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { listValidationPatternsCached } from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
  normalizeProductValidationInstanceScope,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import {
  deriveDiffSegment,
  isPatternLocaleMatch,
  normalizePostAcceptBehavior,
  normalizeReplacementFields,
  normalizeValidationDebounceMs,
  resolveFieldTargetAndLocale,
  shouldLaunchPattern,
} from '@/features/products/validation-engine/core';
import { parseRuntimeConfigForEvaluation } from '@/features/products/validations/validator-runtime-config';
import type {
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
  ProductValidationSeverity,
} from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export const evaluateRuntimeSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  latestProductValues: z.record(z.string(), z.unknown()).nullable().optional(),
  patternIds: z.array(z.string().trim().min(1)).optional(),
  validationScope: z.enum(['draft_template', 'product_create', 'product_edit']).optional(),
});

const MAX_RUNTIME_VALUE_FIELDS = 120;
const MAX_RUNTIME_PATTERN_IDS = 120;
const MAX_RUNTIME_STRING_LENGTH = 20_000;
const DEFAULT_AI_RUNTIME_TIMEOUT_MS = 12_000;
const READ_ONLY_DB_ACTIONS = new Set<string>([
  'find',
  'findOne',
  'countDocuments',
  'distinct',
  'aggregate',
]);

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

type RuntimeFieldEntry = {
  fieldName: string;
  target: NonNullable<ReturnType<typeof resolveFieldTargetAndLocale>['target']>;
  locale: string | null;
  fieldValue: string;
};

type RuntimeSettingsCache = {
  _placeholder?: null;
};

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

const assertRuntimePayloadBounds = (body: z.infer<typeof evaluateRuntimeSchema>): void => {
  const values = body.values ?? {};
  const fields = Object.keys(values);
  if (fields.length > MAX_RUNTIME_VALUE_FIELDS) {
    throw badRequestError(
      `Runtime validation supports up to ${MAX_RUNTIME_VALUE_FIELDS} fields per request.`
    );
  }

  const patternIds = body.patternIds ?? [];
  if (patternIds.length > MAX_RUNTIME_PATTERN_IDS) {
    throw badRequestError(
      `Runtime validation supports up to ${MAX_RUNTIME_PATTERN_IDS} patternIds per request.`
    );
  }

  for (const [fieldName, rawValue] of Object.entries(values)) {
    if (typeof rawValue === 'string' && rawValue.length > MAX_RUNTIME_STRING_LENGTH) {
      throw badRequestError(
        `Field "${fieldName}" exceeds max runtime value length (${MAX_RUNTIME_STRING_LENGTH}).`
      );
    }
  }
};

const buildRuntimeFieldEntries = (values: Record<string, unknown>): RuntimeFieldEntry[] =>
  Object.entries(values).flatMap(([fieldName, rawValue]): RuntimeFieldEntry[] => {
    const resolved = resolveFieldTargetAndLocale(fieldName);
    if (!resolved.target) return [];
    const fieldValue =
      typeof rawValue === 'string'
        ? rawValue
        : typeof rawValue === 'number' && Number.isFinite(rawValue)
          ? String(rawValue)
          : '';
    return [
      {
        fieldName,
        target: resolved.target,
        locale: resolved.locale,
        fieldValue,
      },
    ];
  });

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> =>
  await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((value: T) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const resolveAiRuntimeTimeoutMs = (config: Record<string, unknown>): number => {
  const raw = config['timeoutMs'];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(500, Math.min(60_000, Math.floor(raw)));
  }
  return DEFAULT_AI_RUNTIME_TIMEOUT_MS;
};

const parseAiJson = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const stripped = trimmed.startsWith('```')
    ? trimmed
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim()
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
  const positiveBooleanKeys = [
    'match',
    'isMatch',
    'trigger',
    'shouldValidate',
    'isViolation',
    'violation',
  ];
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

const normalizeRuntimeReplacementValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (!value || typeof value !== 'object') {
    return null;
  }

  const objectValue = value as Record<string, unknown> & {
    toHexString?: () => string;
    toString?: () => string;
  };

  if (typeof objectValue.toHexString === 'function') {
    const hex = objectValue.toHexString();
    if (typeof hex === 'string' && hex.trim().length > 0) {
      return hex.trim();
    }
  }

  const directId =
    normalizeRuntimeReplacementValue(objectValue['id']) ??
    normalizeRuntimeReplacementValue(objectValue['_id']) ??
    normalizeRuntimeReplacementValue(objectValue['$oid']);
  if (directId) return directId;

  if (typeof objectValue.toString === 'function') {
    const rendered = objectValue.toString();
    if (rendered && rendered !== '[object Object]') {
      const trimmed = rendered.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }

  const serialized = toComparableString(value).trim();
  return serialized.length > 0 ? serialized : null;
};

const resolveReplacementFromResult = (
  config: Record<string, unknown>,
  resultData: unknown,
  context: Record<string, unknown>,
  currentValue: string
): string | null => {
  const replacementPaths = [
    ...(Array.isArray(config['replacementPaths'])
      ? (config['replacementPaths'] as unknown[])
        .filter((entry: unknown): entry is string => typeof entry === 'string')
        .map((entry: string) => entry.trim())
        .filter((entry: string) => entry.length > 0)
      : []),
    ...(typeof config['replacementPath'] === 'string' && config['replacementPath'].trim().length > 0
      ? [config['replacementPath'].trim()]
      : []),
  ];

  for (const replacementPath of replacementPaths) {
    const value = getValueAtMappingPath(resultData, replacementPath);
    const resolved = normalizeRuntimeReplacementValue(value);
    if (resolved) {
      return resolved;
    }
  }
  if (typeof config['replacementValue'] === 'string') {
    const rendered = renderTemplate(config['replacementValue'], context, currentValue).trim();
    return rendered.length > 0 ? rendered : null;
  }
  if (
    typeof config['replacementValue'] === 'number' ||
    typeof config['replacementValue'] === 'boolean'
  ) {
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
  const renderedPayload = renderUnknown(payloadSource, context, currentValue) as Record<
    string,
    unknown
  >;

  if (operation === 'action') {
    const provider =
      renderedPayload['provider'] === 'mongodb' || renderedPayload['provider'] === 'prisma'
        ? renderedPayload['provider']
        : 'auto';
    const actionName = String(renderedPayload['action'] ?? 'find').trim() || 'find';
    if (!READ_ONLY_DB_ACTIONS.has(actionName)) {
      throw badRequestError(
        `Runtime DB action "${actionName}" is not allowed. Only read-only actions are supported.`
      );
    }
    const payload: DbActionPayload = {
      provider,
      collection: String(renderedPayload['collection'] ?? ''),
      action: actionName,
    };
    if (renderedPayload['filter'] !== undefined) payload.filter = renderedPayload['filter'];
    if (Array.isArray(renderedPayload['pipeline']))
      payload.pipeline = renderedPayload['pipeline'] as unknown[];
    if (renderedPayload['projection'] !== undefined)
      payload.projection = renderedPayload['projection'];
    if (renderedPayload['sort'] !== undefined) payload.sort = renderedPayload['sort'];
    if (typeof renderedPayload['limit'] === 'number') payload.limit = renderedPayload['limit'];
    if (typeof renderedPayload['idType'] === 'string') payload.idType = renderedPayload['idType'];
    if (typeof renderedPayload['distinctField'] === 'string')
      payload.distinctField = renderedPayload['distinctField'];
    if (!payload.collection.trim()) {
      throw badRequestError('Runtime DB action requires a collection.');
    }
    const response = await dbApi.action<Record<string, unknown>>(payload);
    if (!response.ok) {
      throw badRequestError(response.error || 'Runtime DB action failed.');
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
    ...(typeof renderedPayload['single'] === 'boolean'
      ? { single: renderedPayload['single'] }
      : {}),
    ...(typeof renderedPayload['idType'] === 'string' ? { idType: renderedPayload['idType'] } : {}),
  };
  if (!payload.collection.trim()) {
    throw badRequestError('Runtime DB query requires a collection.');
  }
  const response = await dbApi.query<Record<string, unknown>>(payload);
  if (!response.ok) {
    throw badRequestError(response.error || 'Runtime DB query failed.');
  }
  const resultData = response.data ?? {};
  const defaultResultPath = payload.single ? 'item' : 'count';
  const resultPath =
    typeof config['resultPath'] === 'string' ? config['resultPath'].trim() : defaultResultPath;
  const operator = normalizeRuntimeOperator(
    config['operator'] ?? (resultPath === 'count' ? 'gt' : 'truthy')
  );
  const operand =
    config['operand'] ??
    config['value'] ??
    config['expected'] ??
    (resultPath === 'count' ? 0 : null);
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
  settingsCache: _settingsCache,
}: {
  config: Record<string, unknown>;
  context: Record<string, unknown>;
  currentValue: string;
  settingsCache: RuntimeSettingsCache;
}): Promise<{
  matched: boolean;
  resultData: unknown;
  message: string | null;
  replacementValue: string | null;
  severity: ProductValidationSeverity | null;
}> => {
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
  const timeoutMs = resolveAiRuntimeTimeoutMs(config);
  const brainConfig = await resolveBrainExecutionConfigForCapability('product.validation.runtime', {
    defaultTemperature: temperature,
    defaultMaxTokens: maxTokens,
    defaultSystemPrompt: systemPromptRaw,
    runtimeKind: 'validation',
  });

  const completion = await withTimeout(
    runBrainChatCompletion({
      modelId: brainConfig.modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      jsonMode: forceJson && supportsBrainJsonMode(brainConfig.modelId),
      messages: [
        { role: 'system', content: brainConfig.systemPrompt || systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
    timeoutMs,
    `AI runtime request timed out after ${timeoutMs}ms`
  );

  const raw = completion.text.trim() ?? '';
  const parsed = parseAiJson(raw);
  const resultData = parsed
    ? { raw, parsed, ...parsed, brainApplied: brainConfig.brainApplied }
    : { raw, brainApplied: brainConfig.brainApplied };
  const parsedMatch = resolveAiMatch(parsed);

  let matched: boolean;
  if (parsedMatch !== null) {
    matched = parsedMatch;
  } else {
    const resultPath =
      typeof config['resultPath'] === 'string' ? config['resultPath'].trim() : 'raw';
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
      ? parsed['severity']
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
}): RuntimeFieldIssue | null => {
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
  const suppressNoopReplacementProposal = normalizeProductValidationSkipNoopReplacementProposal(
    pattern.skipNoopReplacementProposal
  );
  if (
    suppressNoopReplacementProposal &&
    typeof effectiveReplacementValue === 'string' &&
    effectiveReplacementValue === fieldValue
  ) {
    return null;
  }

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
    debounceMs: normalizeValidationDebounceMs(pattern.validationDebounceMs),
  };
};

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof evaluateRuntimeSchema>;
  assertRuntimePayloadBounds(body);
  const values = body.values;
  const latestProductValues = body.latestProductValues ?? null;
  const validationScope = normalizeProductValidationInstanceScope(
    body.validationScope ?? 'product_create'
  );
  const allPatterns = await listValidationPatternsCached();
  const requestedPatternIds =
    body.patternIds && body.patternIds.length > 0 ? new Set(body.patternIds) : null;
  const runtimePatterns = allPatterns.filter((pattern: ProductValidationPattern) => {
    if (!pattern.enabled) return false;
    if (!pattern.runtimeEnabled || pattern.runtimeType === 'none') return false;
    if (requestedPatternIds && !requestedPatternIds.has(pattern.id)) return false;
    if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope)) {
      return false;
    }
    return true;
  });

  const runtimeFieldEntries = buildRuntimeFieldEntries(values);
  const fieldEntriesByTarget = new Map<RuntimeFieldEntry['target'], RuntimeFieldEntry[]>();
  for (const entry of runtimeFieldEntries) {
    const current = fieldEntriesByTarget.get(entry.target) ?? [];
    current.push(entry);
    fieldEntriesByTarget.set(entry.target, current);
  }

  const runtimeSettingsCache: RuntimeSettingsCache = {
    _placeholder: null,
  };

  const issues: Record<string, RuntimeFieldIssue[]> = {};
  for (const pattern of runtimePatterns) {
    const runtimeConfig = parseRuntimeConfigForEvaluation({
      runtimeType: pattern.runtimeType,
      runtimeConfig: pattern.runtimeConfig,
    });
    if (!runtimeConfig) continue;

    const candidateEntries = (fieldEntriesByTarget.get(pattern.target) ?? []).filter(
      (entry: RuntimeFieldEntry) => isPatternLocaleMatch(pattern.locale, entry.locale)
    );
    for (const entry of candidateEntries) {
      const { fieldName, fieldValue } = entry;
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
            settingsCache: runtimeSettingsCache,
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
        if (!issue) continue;
        if (!issues[fieldName]) {
          issues[fieldName] = [];
        }
        issues[fieldName].push(issue);
      } catch (error) {
        void ErrorSystem.logWarning('Runtime validator evaluation failed.', {
          source: 'products.validator-runtime.evaluate',
          patternId: pattern.id,
          fieldName,
          runtimeType: pattern.runtimeType,
          error,
        });
        const onError =
          typeof runtimeConfig['onError'] === 'string' ? runtimeConfig['onError'] : 'ignore';
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
        if (!issue) continue;
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
