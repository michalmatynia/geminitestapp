import type {
  ValidatorPatternList,
  ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import {
  type PromptValidationRuntimeSelection,
} from '@/features/prompt-core/contracts';
import {
  PromptValidationRuntimeError,
  PromptValidationScopeResolutionError,
  asPromptValidationIntegrationError,
} from '@/features/prompt-core/errors';
import {
  recordPromptValidationCounter,
  recordPromptValidationError,
  recordPromptValidationTiming,
} from '@/features/prompt-core/runtime-observability';
import type {
  PromptValidationRule,
} from '@/features/prompt-engine/settings';
import type { PromptEngineSettings } from '@/features/prompt-engine/settings';

import {
  explodePromptText,
  invalidatePromptExploderRuntimePatternCacheByRuntime,
  prewarmPromptExploderRuntimePatterns,
} from './parser';
import {
  getPromptExploderScopedRules,
  PROMPT_EXPLODER_PATTERN_PACK_IDS,
} from './pattern-pack';
import { filterTemplatesForRuntime } from './runtime-refresh';
import {
  resolvePromptExploderValidationStack,
} from './validation-stack';

import type { PromptExploderSettings } from './types';
import type {
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
} from './types';

type PromptValidationOrchestratorInput = {
  promptSettings: PromptEngineSettings;
  promptExploderSettings: PromptExploderSettings;
  validatorPatternLists: ValidatorPatternList[];
  runtimeRuleProfile: 'all' | 'pattern_pack' | 'learned_only';
  runtimeValidationRuleStack: string;
  learningEnabled: boolean;
  minApprovalsForMatching: number;
  maxTemplates: number;
  sessionLearnedRules?: PromptValidationRule[] | undefined;
  sessionLearnedTemplates?: PromptExploderLearnedTemplate[] | undefined;
  preferredValidatorScope?: ValidatorScope | null | undefined;
  strictUnknownStack?: boolean | undefined;
};

export type PromptValidationOrchestrationResult = PromptValidationRuntimeSelection & {
  correlationId: string;
  stackResolution: ReturnType<typeof resolvePromptExploderValidationStack>;
};

type CachedRuntimeSelection = {
  stackResolution: ReturnType<typeof resolvePromptExploderValidationStack>;
  identity: PromptValidationOrchestrationResult['identity'];
  scopedRules: PromptValidationRule[];
  effectiveRules: PromptValidationRule[];
  runtimeValidationRules: PromptValidationRule[];
  effectiveLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
  createdAt: number;
};

const RUNTIME_SELECTION_CACHE_LIMIT = 80;
const RUNTIME_SELECTION_CACHE_TTL_MS = 45_000;
const runtimeSelectionCache = new Map<string, CachedRuntimeSelection>();
const inflightPrewarmByCacheKey = new Map<string, Promise<void>>();
const runtimeVersionByScopeStackProfile = new Map<string, {
  settingsVersion: string;
  listVersion: string;
}>();

const hashString = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
};

const toCorrelationId = (): string =>
  `prompt_rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const serializeRuleSignature = (rule: PromptValidationRule): string => {
  if (rule.kind === 'regex') {
    return [
      rule.id,
      rule.enabled ? '1' : '0',
      rule.pattern,
      rule.flags ?? '',
      (rule.appliesToScopes ?? []).join(','),
      String(rule.sequence ?? ''),
      String(rule.promptExploderPriority ?? ''),
      String(rule.promptExploderConfidenceBoost ?? ''),
      rule.promptExploderTreatAsHeading ? '1' : '0',
    ].join('|');
  }
  return [
    rule.id,
    rule.enabled ? '1' : '0',
    rule.kind,
    (rule.appliesToScopes ?? []).join(','),
    String(rule.sequence ?? ''),
  ].join('|');
};

const buildPromptSettingsVersion = (
  promptSettings: PromptEngineSettings
): string => {
  const signatures = [
    ...promptSettings.promptValidation.rules,
    ...(promptSettings.promptValidation.learnedRules ?? []),
  ]
    .map(serializeRuleSignature)
    .sort();
  return hashString(signatures.join('\n'));
};

const buildPatternListVersion = (
  lists: ValidatorPatternList[]
): string => {
  const signatures = lists
    .map((list) =>
      [
        list.id,
        list.scope,
        list.updatedAt,
      ].join('|')
    )
    .sort();
  return hashString(signatures.join('\n'));
};

const mergeRulesById = (
  scopedRules: PromptValidationRule[],
  sessionLearnedRules: PromptValidationRule[]
): PromptValidationRule[] => {
  const byId = new Map<string, PromptValidationRule>();
  [...scopedRules, ...sessionLearnedRules].forEach((rule) => {
    byId.set(rule.id, rule);
  });
  return [...byId.values()];
};

const selectRuntimeRules = (
  effectiveRules: PromptValidationRule[],
  runtimeRuleProfile: 'all' | 'pattern_pack' | 'learned_only'
): PromptValidationRule[] => {
  if (runtimeRuleProfile === 'learned_only') {
    return effectiveRules.filter((rule) => rule.id.startsWith('segment.learned.'));
  }
  if (runtimeRuleProfile === 'pattern_pack') {
    return effectiveRules.filter((rule) => PROMPT_EXPLODER_PATTERN_PACK_IDS.has(rule.id));
  }
  return effectiveRules;
};

const CASE_RESOLVER_HEADING_RULE_ID_RE = /^segment\.case_resolver\.heading\./i;

const isCaseResolverRuntimeScope = (scope: string | null | undefined): boolean =>
  scope === 'case-resolver-prompt-exploder' || scope === 'case_resolver_prompt_exploder';

const hasUsableCaseResolverHeadingRules = (
  rules: PromptValidationRule[]
): boolean =>
  rules.some(
    (rule) =>
      rule.kind === 'regex' &&
      rule.promptExploderTreatAsHeading === true &&
      CASE_RESOLVER_HEADING_RULE_ID_RE.test(rule.id)
  );


const mergeTemplatesById = (
  persistedTemplates: PromptExploderLearnedTemplate[],
  sessionTemplates: PromptExploderLearnedTemplate[]
): PromptExploderLearnedTemplate[] => {
  const byId = new Map<string, PromptExploderLearnedTemplate>();
  [...persistedTemplates, ...sessionTemplates].forEach((template) => {
    byId.set(template.id, template);
  });
  return [...byId.values()];
};

const buildRuntimeCacheKey = (args: {
  scope: string;
  stack: string;
  profile: 'all' | 'pattern_pack' | 'learned_only';
  settingsVersion: string;
  listVersion: string;
}): string =>
  [
    'prompt-validation-runtime-v2',
    args.scope,
    args.stack,
    args.profile,
    args.settingsVersion,
    args.listVersion,
  ].join(':');

const trimRuntimeSelectionCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of runtimeSelectionCache.entries()) {
    if (now - entry.createdAt > RUNTIME_SELECTION_CACHE_TTL_MS) {
      runtimeSelectionCache.delete(key);
    }
  }
  if (runtimeSelectionCache.size <= RUNTIME_SELECTION_CACHE_LIMIT) return;
  const overflow = runtimeSelectionCache.size - RUNTIME_SELECTION_CACHE_LIMIT;
  for (const key of runtimeSelectionCache.keys()) {
    runtimeSelectionCache.delete(key);
    if (runtimeSelectionCache.size <= RUNTIME_SELECTION_CACHE_LIMIT - overflow) break;
  }
};

const serializeSessionRuleSignature = (
  rules: PromptValidationRule[]
): string =>
  hashString(
    rules
      .map((rule) => serializeRuleSignature(rule))
      .sort()
      .join('\n')
  );

const serializeTemplateSignature = (
  templates: PromptExploderLearnedTemplate[]
): string =>
  hashString(
    templates
      .map((template) =>
        [
          template.id,
          template.state,
          template.updatedAt,
          template.approvals,
        ].join('|')
      )
      .sort()
      .join('\n')
  );

const buildRuntimeSelectionCacheKey = (args: {
  scope: string;
  stack: string;
  profile: 'all' | 'pattern_pack' | 'learned_only';
  settingsVersion: string;
  listVersion: string;
  learningEnabled: boolean;
  minApprovalsForMatching: number;
  maxTemplates: number;
  sessionRuleSignature: string;
  templateSignature: string;
}): string =>
  [
    'runtime-selection-v1',
    args.scope,
    args.stack,
    args.profile,
    args.settingsVersion,
    args.listVersion,
    args.learningEnabled ? '1' : '0',
    String(args.minApprovalsForMatching),
    String(args.maxTemplates),
    args.sessionRuleSignature,
    args.templateSignature,
  ].join(':');

const getCachedRuntimeSelection = (
  key: string
): CachedRuntimeSelection | null => {
  const cached = runtimeSelectionCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > RUNTIME_SELECTION_CACHE_TTL_MS) {
    runtimeSelectionCache.delete(key);
    return null;
  }
  return cached;
};

const setCachedRuntimeSelection = (
  key: string,
  value: Omit<CachedRuntimeSelection, 'createdAt'>
): void => {
  runtimeSelectionCache.set(key, {
    ...value,
    createdAt: Date.now(),
  });
  trimRuntimeSelectionCache();
};

const trackRuntimeVersionAndInvalidate = (args: {
  scope: string;
  stack: string;
  profile: 'all' | 'pattern_pack' | 'learned_only';
  settingsVersion: string;
  listVersion: string;
}): void => {
  const versionKey = `${args.scope}:${args.stack}:${args.profile}`;
  const previous = runtimeVersionByScopeStackProfile.get(versionKey);
  runtimeVersionByScopeStackProfile.set(versionKey, {
    settingsVersion: args.settingsVersion,
    listVersion: args.listVersion,
  });
  if (
    previous &&
    (previous.settingsVersion !== args.settingsVersion ||
      previous.listVersion !== args.listVersion)
  ) {
    invalidatePromptExploderRuntimePatternCacheByRuntime({
      scope: args.scope,
      stack: args.stack,
      profile: args.profile,
      settingsVersion: args.settingsVersion,
      listVersion: args.listVersion,
    });
  }
};

export const getPromptValidationRuntimeSelectionCacheSnapshot = (): {
  size: number;
  keys: string[];
  inflightPrewarm: number;
} => ({
  size: runtimeSelectionCache.size,
  keys: [...runtimeSelectionCache.keys()],
  inflightPrewarm: inflightPrewarmByCacheKey.size,
});

export const resetPromptValidationRuntimeSelectionCache = (): void => {
  runtimeSelectionCache.clear();
  inflightPrewarmByCacheKey.clear();
  runtimeVersionByScopeStackProfile.clear();
};

export const resolvePromptValidationRuntime = (
  args: PromptValidationOrchestratorInput
): PromptValidationOrchestrationResult => {
  const correlationId = toCorrelationId();
  const startedAt = performance.now();
  try {
    const sessionLearnedRules = args.sessionLearnedRules ?? [];
    const sessionLearnedTemplates = args.sessionLearnedTemplates ?? [];
    const stackStartedAt = performance.now();
    const stackResolution = resolvePromptExploderValidationStack({
      stack: args.runtimeValidationRuleStack,
      patternLists: args.validatorPatternLists,
      preferredScope: args.preferredValidatorScope ?? undefined,
      strictUnknownStack: args.strictUnknownStack ?? false,
    });
    recordPromptValidationCounter('runtime_selection_total', 1, {
      scope: stackResolution.scope,
      stack: stackResolution.stack,
    });
    if (stackResolution.usedFallback) {
      recordPromptValidationCounter('runtime_selection_fallback', 1, {
        scope: stackResolution.scope,
        stack: stackResolution.stack,
      });
    }
    recordPromptValidationTiming(
      'scope_resolve_ms',
      performance.now() - stackStartedAt,
      {
        scope: stackResolution.scope,
        stack: stackResolution.stack,
        correlationId,
      }
    );

    const listVersion = buildPatternListVersion(args.validatorPatternLists);
    const settingsVersion = buildPromptSettingsVersion(args.promptSettings);
    const runtimeCacheKey = buildRuntimeCacheKey({
      scope: stackResolution.scope,
      stack: stackResolution.stack,
      profile: args.runtimeRuleProfile,
      settingsVersion,
      listVersion,
    });
    const mergedTemplateSignature = serializeTemplateSignature([
      ...args.promptExploderSettings.learning.templates,
      ...sessionLearnedTemplates,
    ]);
    const selectionCacheKey = buildRuntimeSelectionCacheKey({
      scope: stackResolution.scope,
      stack: stackResolution.stack,
      profile: args.runtimeRuleProfile,
      settingsVersion,
      listVersion,
      learningEnabled: args.learningEnabled,
      minApprovalsForMatching: args.minApprovalsForMatching,
      maxTemplates: args.maxTemplates,
      sessionRuleSignature: serializeSessionRuleSignature(sessionLearnedRules),
      templateSignature: mergedTemplateSignature,
    });
    const cached = getCachedRuntimeSelection(selectionCacheKey);
    if (cached) {
      recordPromptValidationCounter('runtime_cache_hit', 1, {
        scope: stackResolution.scope,
        cache: 'selection',
      });
      recordPromptValidationTiming(
        'runtime_select_ms',
        performance.now() - startedAt,
        {
          scope: stackResolution.scope,
          stack: stackResolution.stack,
          profile: args.runtimeRuleProfile,
          correlationId,
          mode: 'cache_hit',
        }
      );
      return {
        correlationId,
        stackResolution: cached.stackResolution,
        identity: cached.identity,
        scopedRules: cached.scopedRules,
        effectiveRules: cached.effectiveRules,
        runtimeValidationRules: cached.runtimeValidationRules,
        effectiveLearnedTemplates: cached.effectiveLearnedTemplates,
        runtimeLearnedTemplates: cached.runtimeLearnedTemplates,
      };
    }
    recordPromptValidationCounter('runtime_cache_miss', 1, {
      scope: stackResolution.scope,
      cache: 'selection',
    });

    const scopedRules = getPromptExploderScopedRules(
      args.promptSettings,
      stackResolution.scope
    );
    const effectiveRules = mergeRulesById(
      scopedRules,
      sessionLearnedRules
    );
    const runtimeValidationRules = selectRuntimeRules(
      effectiveRules,
      args.runtimeRuleProfile
    );
    if (
      isCaseResolverRuntimeScope(stackResolution.scope) &&
      !hasUsableCaseResolverHeadingRules(runtimeValidationRules)
    ) {
      throw new PromptValidationRuntimeError(
        'Case Resolver runtime is missing heading rules. Switch to Case Resolver stack or reinstall pattern pack.',
        {
          scope: stackResolution.scope,
          stack: stackResolution.stack,
          profile: args.runtimeRuleProfile,
          correlationId,
        }
      );
    }

    const effectiveLearnedTemplates = mergeTemplatesById(
      args.promptExploderSettings.learning.templates,
      sessionLearnedTemplates
    );
    const runtimeLearnedTemplates = args.learningEnabled
      ? filterTemplatesForRuntime(effectiveLearnedTemplates, {
        minApprovalsForMatching: args.minApprovalsForMatching,
        maxTemplates: args.maxTemplates,
      })
      : [];
    trackRuntimeVersionAndInvalidate({
      scope: stackResolution.scope,
      stack: stackResolution.stack,
      profile: args.runtimeRuleProfile,
      settingsVersion,
      listVersion,
    });
    const identity = {
      scope: stackResolution.scope,
      validatorScope: stackResolution.validatorScope,
      stack: stackResolution.stack,
      profile: args.runtimeRuleProfile,
      settingsVersion,
      listVersion,
      cacheKey: runtimeCacheKey,
    } satisfies PromptValidationOrchestrationResult['identity'];
    setCachedRuntimeSelection(selectionCacheKey, {
      stackResolution,
      identity,
      scopedRules,
      effectiveRules,
      runtimeValidationRules,
      effectiveLearnedTemplates,
      runtimeLearnedTemplates,
    });

    recordPromptValidationTiming(
      'runtime_select_ms',
      performance.now() - startedAt,
      {
        scope: stackResolution.scope,
        stack: stackResolution.stack,
        profile: args.runtimeRuleProfile,
        correlationId,
        mode: 'cache_miss',
      }
    );

    if (!inflightPrewarmByCacheKey.has(runtimeCacheKey)) {
      recordPromptValidationCounter('runtime_inflight_dedup_miss', 1, {
        scope: stackResolution.scope,
      });
      const prewarm = Promise.resolve()
        .then(() => {
          prewarmPromptExploderRuntimePatterns({
            rules: runtimeValidationRules,
            scope: stackResolution.scope,
            runtimeCacheKey,
            correlationId,
          });
        })
        .catch(() => {})
        .finally(() => {
          inflightPrewarmByCacheKey.delete(runtimeCacheKey);
        });
      inflightPrewarmByCacheKey.set(runtimeCacheKey, prewarm);
    } else {
      recordPromptValidationCounter('runtime_inflight_dedup_hit', 1, {
        scope: stackResolution.scope,
      });
    }

    return {
      correlationId,
      stackResolution,
      identity,
      scopedRules,
      effectiveRules,
      runtimeValidationRules,
      effectiveLearnedTemplates,
      runtimeLearnedTemplates,
    };
  } catch (error) {
    if (error instanceof PromptValidationScopeResolutionError) {
      recordPromptValidationError('scope_resolution');
      throw error;
    }
    recordPromptValidationError('runtime_execution');
    throw asPromptValidationIntegrationError(
      error,
      'Prompt validation runtime orchestration failed.',
      {
        correlationId,
      }
    );
  }
};

export const explodePromptWithValidationRuntime = (args: {
  prompt: string;
  runtime: PromptValidationOrchestrationResult;
  similarityThreshold: number;
}): PromptExploderDocument => {
  const pipelineStartedAt = performance.now();
  const recordPipelineTiming = (status: 'ok' | 'error'): void => {
    recordPromptValidationTiming(
      'runtime_pipeline_ms',
      performance.now() - pipelineStartedAt,
      {
        scope: args.runtime.identity.scope,
        stack: args.runtime.identity.stack,
        correlationId: args.runtime.correlationId,
        status,
      }
    );
  };
  const maxAttempts = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const explodeStartedAt = performance.now();
    try {
      const document = explodePromptText({
        prompt: args.prompt,
        validationRules: args.runtime.runtimeValidationRules,
        learnedTemplates: args.runtime.runtimeLearnedTemplates,
        similarityThreshold: args.similarityThreshold,
        validationScope: args.runtime.identity.scope,
        runtimeCacheKey: args.runtime.identity.cacheKey,
        correlationId: args.runtime.correlationId,
      });
      recordPromptValidationTiming(
        'explode_ms',
        performance.now() - explodeStartedAt,
        {
          scope: args.runtime.identity.scope,
          stack: args.runtime.identity.stack,
          correlationId: args.runtime.correlationId,
          attempt: String(attempt),
        }
      );
      if (attempt > 1) {
        recordPromptValidationCounter('runtime_retry_success', 1, {
          scope: args.runtime.identity.scope,
        });
      }
      recordPipelineTiming('ok');
      return document;
    } catch (error) {
      lastError = error;
      const isRetryable =
        !(error instanceof PromptValidationScopeResolutionError) &&
        !(error instanceof PromptValidationRuntimeError) &&
        attempt < maxAttempts;
      if (isRetryable) {
        recordPromptValidationCounter('runtime_retry', 1, {
          scope: args.runtime.identity.scope,
        });
        continue;
      }
      break;
    }
  }

  const pipelineMs = performance.now() - pipelineStartedAt;
  if (pipelineMs > 2_500) {
    recordPromptValidationCounter('runtime_timeout', 1, {
      scope: args.runtime.identity.scope,
    });
  }
  recordPromptValidationError('runtime_execution');
  recordPipelineTiming('error');
  throw new PromptValidationRuntimeError(
    'Prompt explosion failed for the selected runtime.',
    {
      cacheKey: args.runtime.identity.cacheKey,
      correlationId: args.runtime.correlationId,
      pipelineMs,
    },
    lastError
  );
};
