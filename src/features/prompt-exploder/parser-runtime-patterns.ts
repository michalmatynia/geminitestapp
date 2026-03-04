import { validateRegexSafety } from '@/shared/utils/regex-safety';
import { PromptValidationRuleCompileError } from '@/shared/lib/prompt-core/errors';
import {
  recordPromptValidationCounter,
  recordPromptValidationError,
  recordPromptValidationTiming,
} from '@/shared/lib/prompt-core/runtime-observability';
import type {
  PromptExploderRuleSegmentType,
  PromptValidationRule,
} from '@/shared/contracts/prompt-engine';

import { DEFAULT_PATTERN_IDS } from './parser-default-patterns';

import type { PromptExploderSegmentType } from './types';
import type { PromptExploderRuntimeValidationScope } from './validation-stack';

const NEVER_MATCH_RE = /$a/;

const SEGMENT_TYPE_VALUES: PromptExploderSegmentType[] = [
  'metadata',
  'assigned_text',
  'list',
  'parameter_block',
  'referential_list',
  'sequence',
  'hierarchical_list',
  'conditional_list',
  'qa_matrix',
];

const isPromptExploderSegmentType = (
  value: string | null | undefined
): value is PromptExploderSegmentType =>
  Boolean(value && SEGMENT_TYPE_VALUES.includes(value as PromptExploderSegmentType));

const toSegmentTypeHint = (
  value: PromptExploderRuleSegmentType | PromptExploderSegmentType | string | null | undefined
): PromptExploderSegmentType | null => {
  if (!value) return null;
  return isPromptExploderSegmentType(String(value))
    ? (String(value) as PromptExploderSegmentType)
    : null;
};

const typeFromPatternId = (patternId: string): PromptExploderSegmentType | null => {
  const match =
    /^segment\.(?:infer|learned)\.([a-z_]+)\b/i.exec(patternId) ??
    /^segment\.type\.([a-z_]+)\b/i.exec(patternId);
  if (!match) return null;
  const candidate = (match[1] ?? '').toLowerCase();
  if (!isPromptExploderSegmentType(candidate)) return null;
  return candidate;
};

const normalizeRegexFlags = (flags: string | null | undefined): string | undefined => {
  const cleaned = (flags ?? '').replace(/[gy]/g, '');
  return cleaned.trim() || undefined;
};

const compileSafeRegex = (pattern: string, flags: string | null | undefined): RegExp | null => {
  try {
    return new RegExp(pattern, normalizeRegexFlags(flags));
  } catch {
    return null;
  }
};

export type RuntimeRegexRule = {
  id: string;
  label: string;
  sequenceGroupLabel: string | null;
  regex: RegExp;
  segmentTypeHint: PromptExploderSegmentType | null;
  confidenceBoost: number;
  priority: number;
  sequence: number;
  treatAsHeading: boolean;
};

export type PatternRuntime = {
  allowDefaultFallback: boolean;
  byId: Map<string, RegExp>;
  scopedRules: PromptValidationRule[];
  regexRules: RuntimeRegexRule[];
  headingRules: RuntimeRegexRule[];
  nonHeadingRules: RuntimeRegexRule[];
  compileErrors: PromptValidationRuleCompileError[];
};

export const normalizeRuntimeValidationScope = (
  scope: PromptExploderRuntimeValidationScope | 'case_resolver_prompt_exploder' | null | undefined
): PromptExploderRuntimeValidationScope =>
  scope === 'case_resolver_prompt_exploder' ? 'case_resolver_prompt_exploder' : 'prompt_exploder';
const runtimePatternCacheByRules = new WeakMap<
  PromptValidationRule[],
  Map<PromptExploderRuntimeValidationScope, PatternRuntime>
>();
const runtimePatternCacheByKey = new Map<string, PatternRuntime>();
const RUNTIME_PATTERN_CACHE_LIMIT = 120;
const runtimePatternCacheStats = {
  keyedHits: 0,
  keyedMisses: 0,
  weakHits: 0,
  weakMisses: 0,
  evictions: 0,
};
const COMPILE_FAILURE_WINDOW_MS = 60_000;
const COMPILE_FAILURE_THRESHOLD = 5;
const COMPILE_CIRCUIT_OPEN_MS = 45_000;
const compileFailuresByScope = new Map<PromptExploderRuntimeValidationScope, number[]>();
const compileCircuitOpenUntilByScope = new Map<PromptExploderRuntimeValidationScope, number>();

const parseCacheKey = (
  key: string
): {
  scope: string;
  stack: string;
  profile: string;
  settingsVersion: string;
  listVersion: string;
} | null => {
  const parts = key.split(':');
  if (parts.length !== 6) return null;
  if (parts[0] !== 'prompt-validation-runtime-v2') return null;
  return {
    scope: parts[1] ?? '',
    stack: parts[2] ?? '',
    profile: parts[3] ?? '',
    settingsVersion: parts[4] ?? '',
    listVersion: parts[5] ?? '',
  };
};

const trimRuntimePatternCacheByKey = (): void => {
  if (runtimePatternCacheByKey.size <= RUNTIME_PATTERN_CACHE_LIMIT) return;
  const oldestKey = runtimePatternCacheByKey.keys().next().value;
  if (typeof oldestKey === 'string') {
    runtimePatternCacheByKey.delete(oldestKey);
    runtimePatternCacheStats.evictions += 1;
  }
};

export const getPromptExploderRuntimePatternCacheSnapshot = (): {
  keyed: number;
  keyedKeys: string[];
  stats: typeof runtimePatternCacheStats;
  circuitOpenScopes: Array<{
    scope: PromptExploderRuntimeValidationScope;
    openUntil: string;
  }>;
} => ({
  keyed: runtimePatternCacheByKey.size,
  keyedKeys: [...runtimePatternCacheByKey.keys()],
  stats: {
    ...runtimePatternCacheStats,
  },
  circuitOpenScopes: [...compileCircuitOpenUntilByScope.entries()]
    .filter(([, timestamp]) => timestamp > Date.now())
    .map(([scope, timestamp]) => ({
      scope,
      openUntil: new Date(timestamp).toISOString(),
    })),
});

export const resetPromptExploderRuntimePatternCache = (): void => {
  runtimePatternCacheByKey.clear();
  runtimePatternCacheStats.keyedHits = 0;
  runtimePatternCacheStats.keyedMisses = 0;
  runtimePatternCacheStats.weakHits = 0;
  runtimePatternCacheStats.weakMisses = 0;
  runtimePatternCacheStats.evictions = 0;
  compileFailuresByScope.clear();
  compileCircuitOpenUntilByScope.clear();
};

export const invalidatePromptExploderRuntimePatternCacheByRuntime = (args: {
  scope: string;
  stack: string;
  profile: string;
  settingsVersion?: string | null | undefined;
  listVersion?: string | null | undefined;
}): number => {
  let removed = 0;
  for (const key of [...runtimePatternCacheByKey.keys()]) {
    const parsed = parseCacheKey(key);
    if (!parsed) continue;
    if (parsed.scope !== args.scope) continue;
    if (parsed.stack !== args.stack) continue;
    if (parsed.profile !== args.profile) continue;
    const settingsMatch = args.settingsVersion
      ? parsed.settingsVersion === args.settingsVersion
      : true;
    const listMatch = args.listVersion ? parsed.listVersion === args.listVersion : true;
    if (settingsMatch && listMatch) {
      continue;
    }
    runtimePatternCacheByKey.delete(key);
    removed += 1;
  }
  return removed;
};

const compileRuntimePatterns = (
  rules: PromptValidationRule[] | null | undefined,
  scope: PromptExploderRuntimeValidationScope,
  correlationId?: string | null
): PatternRuntime => {
  const now = Date.now();
  const openUntil = compileCircuitOpenUntilByScope.get(scope) ?? 0;
  if (openUntil > now) {
    recordPromptValidationCounter('runtime_circuit_break_open', 1, { scope });
    throw new PromptValidationRuleCompileError(
      `Prompt Exploder runtime compile circuit is open for scope "${scope}".`,
      {
        scope,
        openUntil: new Date(openUntil).toISOString(),
        correlationId: correlationId ?? null,
      }
    );
  }

  const scopedRules = (rules ?? []).filter((rule) => {
    if (!rule.enabled) return false;
    if (rule.kind !== 'regex') return false;
    const scopes = (rule.appliesToScopes || []) as string[];
    const activeRuleScope =
      scope === 'case_resolver_prompt_exploder'
        ? 'case_resolver_prompt_exploder'
        : 'prompt_exploder';
    return scopes.length === 0 || scopes.includes(activeRuleScope) || scopes.includes('global');
  });

  const allowDefaultFallback =
    scope !== 'case_resolver_prompt_exploder' && scopedRules.length === 0;
  const byId = new Map<string, RegExp>();
  const runtimeRulesById = new Map<string, RuntimeRegexRule>();
  const compileErrors: PromptValidationRuleCompileError[] = [];

  if (allowDefaultFallback) {
    Object.entries(DEFAULT_PATTERN_IDS).forEach(([id, regex]) => {
      byId.set(id, regex);
      runtimeRulesById.set(id, {
        id,
        label: id,
        sequenceGroupLabel: null,
        regex,
        segmentTypeHint: typeFromPatternId(id),
        confidenceBoost: 0,
        priority: 0,
        sequence: 0,
        treatAsHeading: false,
      });
    });
  }

  scopedRules.forEach((rule) => {
    if (rule.kind !== 'regex') return;
    const safety = validateRegexSafety(rule.pattern, rule.flags);
    if (!safety.ok) {
      compileErrors.push(
        new PromptValidationRuleCompileError(
          `Unsafe Prompt Exploder regex rule "${rule.id}" skipped.`,
          {
            ruleId: rule.id,
            scope,
            safetyCode: safety.code,
            safetyMessage: safety.message,
            correlationId: correlationId ?? null,
          }
        )
      );
      return;
    }
    const compiled = compileSafeRegex(rule.pattern, rule.flags);
    if (!compiled) {
      compileErrors.push(
        new PromptValidationRuleCompileError(
          `Failed to compile Prompt Exploder regex rule "${rule.id}".`,
          {
            ruleId: rule.id,
            scope,
            correlationId: correlationId ?? null,
          }
        )
      );
      return;
    }
    byId.set(rule.id, compiled);
    runtimeRulesById.set(rule.id, {
      id: rule.id,
      label: rule.title.trim() || rule.id,
      sequenceGroupLabel: rule.sequenceGroupLabel?.trim() || null,
      regex: compiled,
      segmentTypeHint:
        toSegmentTypeHint(rule.promptExploderSegmentType) ?? typeFromPatternId(rule.id),
      confidenceBoost: Math.min(0.5, Math.max(0, Number(rule.promptExploderConfidenceBoost ?? 0))),
      priority: Math.min(50, Math.max(-50, Math.floor(Number(rule.promptExploderPriority ?? 0)))),
      sequence: Number.isFinite(rule.sequence ?? 0) ? Math.floor(rule.sequence ?? 0) : 0,
      treatAsHeading: Boolean(rule.promptExploderTreatAsHeading),
    });
  });

  if (compileErrors.length > 0) {
    const previousFailures = compileFailuresByScope.get(scope) ?? [];
    const freshFailures = [...previousFailures, now].filter(
      (timestamp) => now - timestamp <= COMPILE_FAILURE_WINDOW_MS
    );
    compileFailuresByScope.set(scope, freshFailures);
    if (freshFailures.length >= COMPILE_FAILURE_THRESHOLD) {
      compileCircuitOpenUntilByScope.set(scope, now + COMPILE_CIRCUIT_OPEN_MS);
      recordPromptValidationCounter('runtime_circuit_break_open', 1, { scope });
    }
  } else {
    compileFailuresByScope.delete(scope);
    compileCircuitOpenUntilByScope.delete(scope);
  }

  const regexRules = [...runtimeRulesById.values()];
  const headingRules = regexRules.filter((rule) => rule.treatAsHeading);
  const nonHeadingRules = regexRules.filter(
    (rule) => !rule.treatAsHeading && /^segment\.not_heading\./i.test(rule.id)
  );

  if (!allowDefaultFallback && regexRules.length === 0) {
    throw (
      compileErrors[0] ??
      new PromptValidationRuleCompileError(
        `No regex rules could be compiled for Prompt Exploder scope "${scope}".`,
        {
          scope,
          correlationId: correlationId ?? null,
        }
      )
    );
  }

  if (!allowDefaultFallback && headingRules.length === 0) {
    throw (
      compileErrors[0] ??
      new PromptValidationRuleCompileError(
        'No heading regex rules could be compiled for case-resolver Prompt Exploder scope.',
        {
          scope,
          correlationId: correlationId ?? null,
        }
      )
    );
  }

  if (compileErrors.length > 0) {
    recordPromptValidationError('rule_compile');
  }

  return {
    allowDefaultFallback,
    byId,
    scopedRules,
    regexRules,
    headingRules,
    nonHeadingRules,
    compileErrors,
  };
};

export const resolveRuntimePatterns = (
  rules: PromptValidationRule[] | null | undefined,
  scope: PromptExploderRuntimeValidationScope,
  options?: {
    runtimeCacheKey?: string | null | undefined;
    correlationId?: string | null | undefined;
  }
): PatternRuntime => {
  const runtimeCacheKey = options?.runtimeCacheKey?.trim() || '';

  if (runtimeCacheKey) {
    const cachedByKey = runtimePatternCacheByKey.get(runtimeCacheKey);
    if (cachedByKey) {
      runtimePatternCacheStats.keyedHits += 1;
      recordPromptValidationCounter('runtime_cache_hit', 1, {
        scope,
        cache: 'keyed',
      });
      return cachedByKey;
    }
    runtimePatternCacheStats.keyedMisses += 1;
    recordPromptValidationCounter('runtime_cache_miss', 1, {
      scope,
      cache: 'keyed',
    });
  }

  if (!rules || rules.length === 0) {
    const startedAt = performance.now();
    const runtime = compileRuntimePatterns(rules, scope, options?.correlationId ?? null);
    recordPromptValidationTiming('runtime_compile_ms', performance.now() - startedAt, {
      scope,
      cacheKey: runtimeCacheKey || 'none',
      correlationId: options?.correlationId ?? '',
    });
    if (runtimeCacheKey) {
      runtimePatternCacheByKey.set(runtimeCacheKey, runtime);
      trimRuntimePatternCacheByKey();
    }
    return runtime;
  }

  const cachedByScope = runtimePatternCacheByRules.get(rules);
  const cachedRuntime = cachedByScope?.get(scope);
  if (cachedRuntime) {
    runtimePatternCacheStats.weakHits += 1;
    recordPromptValidationCounter('runtime_cache_hit', 1, {
      scope,
      cache: 'weak',
    });
    if (runtimeCacheKey) {
      runtimePatternCacheByKey.set(runtimeCacheKey, cachedRuntime);
      trimRuntimePatternCacheByKey();
    }
    return cachedRuntime;
  }
  runtimePatternCacheStats.weakMisses += 1;
  recordPromptValidationCounter('runtime_cache_miss', 1, {
    scope,
    cache: 'weak',
  });

  const startedAt = performance.now();
  const runtime = compileRuntimePatterns(rules, scope, options?.correlationId ?? null);
  recordPromptValidationTiming('runtime_compile_ms', performance.now() - startedAt, {
    scope,
    cacheKey: runtimeCacheKey || 'weakmap',
    correlationId: options?.correlationId ?? '',
  });

  const nextCachedByScope =
    cachedByScope ?? new Map<PromptExploderRuntimeValidationScope, PatternRuntime>();
  nextCachedByScope.set(scope, runtime);
  if (!cachedByScope) {
    runtimePatternCacheByRules.set(rules, nextCachedByScope);
  }
  if (runtimeCacheKey) {
    runtimePatternCacheByKey.set(runtimeCacheKey, runtime);
    trimRuntimePatternCacheByKey();
  }
  return runtime;
};

export const prewarmPromptExploderRuntimePatterns = (args: {
  rules: PromptValidationRule[] | null | undefined;
  scope: PromptExploderRuntimeValidationScope;
  runtimeCacheKey?: string | null | undefined;
  correlationId?: string | null | undefined;
}): void => {
  resolveRuntimePatterns(args.rules, args.scope, {
    runtimeCacheKey: args.runtimeCacheKey,
    correlationId: args.correlationId,
  });
};

export const testPattern = (runtime: PatternRuntime, patternId: string, value: string): boolean => {
  const regex = runtime.byId.get(patternId);
  if (!regex) return false;
  return regex.test(value);
};

export const resolveBoundaryRegex = (
  runtime: PatternRuntime,
  patternId: string,
  fallback: RegExp
): RegExp => {
  return runtime.byId.get(patternId) ?? (runtime.allowDefaultFallback ? fallback : NEVER_MATCH_RE);
};

export const resolveBoundaryRegexOptional = (
  runtime: PatternRuntime | undefined,
  patternId: string,
  fallback: RegExp
): RegExp => {
  if (!runtime) return fallback;
  return runtime.byId.get(patternId) ?? (runtime.allowDefaultFallback ? fallback : NEVER_MATCH_RE);
};

export const matchesBoundaryHeading = (
  runtime: PatternRuntime,
  patternId: string,
  fallback: RegExp,
  value: string
): boolean => {
  return resolveBoundaryRegex(runtime, patternId, fallback).test(value);
};

export const collectMatchedRules = (runtime: PatternRuntime, text: string): RuntimeRegexRule[] => {
  return runtime.regexRules.filter((rule) => rule.regex.test(text));
};
