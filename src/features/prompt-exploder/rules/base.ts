import type {
  PromptExploderCaptureApplyTo,
  PromptExploderCaptureNormalize,
  PromptExploderRuleSegmentType,
  PromptValidationRule,
  PromptValidationScope,
} from '@/shared/contracts/prompt-engine';

import type { PromptExploderRuntimeValidationScope } from '@/shared/contracts/prompt-exploder';

export const PROMPT_EXPLODER_SCOPE = ['prompt_exploder'] as const;
export const CASE_RESOLVER_PROMPT_EXPLODER_SCOPE = ['case_resolver_prompt_exploder'] as const;

export const isCaseResolverExploderScope = (scope: string | null | undefined): boolean =>
  scope === 'case_resolver_prompt_exploder';

export const normalizeRuleScopes = (
  scopes: readonly PromptValidationScope[] | null | undefined,
  fallbackScope: PromptExploderRuntimeValidationScope | 'case_resolver_prompt_exploder'
): PromptValidationScope[] => {
  if (Array.isArray(scopes) && scopes.length > 0) {
    return [...new Set(scopes)] as PromptValidationScope[];
  }
  const activeRuleScope = isCaseResolverExploderScope(fallbackScope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';
  return [activeRuleScope as PromptValidationScope];
};

export const includesScope = (
  scopes: readonly PromptValidationScope[] | null | undefined,
  scope: PromptExploderRuntimeValidationScope | 'case_resolver_prompt_exploder'
): boolean => {
  if (!Array.isArray(scopes) || scopes.length === 0) return true;
  const activeRuleScope = isCaseResolverExploderScope(scope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';
  return scopes.includes(activeRuleScope as PromptValidationScope) || scopes.includes('global');
};

export const remapExploderScopesForTarget = (
  scopes: readonly PromptValidationScope[] | null | undefined,
  targetScope: PromptExploderRuntimeValidationScope | 'case_resolver_prompt_exploder'
): PromptValidationScope[] => {
  const normalizedScopes = normalizeRuleScopes(scopes, targetScope);
  if (includesScope(normalizedScopes, targetScope)) {
    return normalizedScopes;
  }

  const activeRuleScope = isCaseResolverExploderScope(targetScope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

  const remapped = normalizedScopes.map((scope) => {
    if (scope === 'prompt_exploder' || scope === 'case_resolver_prompt_exploder') {
      return activeRuleScope as PromptValidationScope;
    }
    return scope;
  });

  const deduped = [...new Set(remapped)];
  if (!deduped.includes(activeRuleScope as PromptValidationScope) && !deduped.includes('global')) {
    deduped.push(activeRuleScope as PromptValidationScope);
  }
  return deduped;
};

const normalizeRegexPattern = (pattern: string): string => pattern.replace(/\\\\/g, '\\');

export const createRegexRule = (rule: {
  id: string;
  title: string;
  description: string;
  pattern: string;
  flags?: string;
  message: string;
  sequence: number;
  sequenceGroupId: string;
  sequenceGroupLabel: string;
  promptExploderSegmentType?: PromptExploderRuleSegmentType;
  promptExploderPriority?: number;
  promptExploderConfidenceBoost?: number;
  promptExploderTreatAsHeading?: boolean;
  promptExploderCaptureTarget?: string | null;
  promptExploderCaptureGroup?: number | null;
  promptExploderCaptureApplyTo?: PromptExploderCaptureApplyTo;
  promptExploderCaptureNormalize?: PromptExploderCaptureNormalize;
  promptExploderCaptureOverwrite?: boolean;
  appliesToScopes?: PromptValidationScope[];
  launchAppliesToScopes?: PromptValidationScope[];
}): PromptValidationRule => ({
  kind: 'regex',
  id: rule.id,
  enabled: true,
  severity: 'info',
  title: rule.title,
  description: rule.description,
  pattern: normalizeRegexPattern(rule.pattern),
  flags: rule.flags ?? 'm',
  message: rule.message,
  similar: [],
  autofix: {
    enabled: false,
    operations: [],
  },
  sequenceGroupId: rule.sequenceGroupId,
  sequenceGroupLabel: rule.sequenceGroupLabel,
  sequenceGroupDebounceMs: 0,
  sequence: rule.sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: rule.appliesToScopes ?? [...PROMPT_EXPLODER_SCOPE],
  launchEnabled: false,
  launchAppliesToScopes: rule.launchAppliesToScopes ??
    rule.appliesToScopes ?? [...PROMPT_EXPLODER_SCOPE],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
  promptExploderSegmentType: rule.promptExploderSegmentType ?? null,
  promptExploderPriority: rule.promptExploderPriority ?? 0,
  promptExploderConfidenceBoost: rule.promptExploderConfidenceBoost ?? 0,
  promptExploderTreatAsHeading: rule.promptExploderTreatAsHeading ?? false,
  promptExploderCaptureTarget: rule.promptExploderCaptureTarget ?? null,
  promptExploderCaptureGroup:
    typeof rule.promptExploderCaptureGroup === 'number' &&
    Number.isFinite(rule.promptExploderCaptureGroup)
      ? Math.max(0, Math.floor(rule.promptExploderCaptureGroup))
      : null,
  promptExploderCaptureApplyTo: rule.promptExploderCaptureApplyTo ?? 'segment',
  promptExploderCaptureNormalize: rule.promptExploderCaptureNormalize ?? 'trim',
  promptExploderCaptureOverwrite: rule.promptExploderCaptureOverwrite ?? false,
});
