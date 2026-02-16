import { extractParamsFromPrompt } from './prompt-params';
import { DEFAULT_PROMPT_VALIDATION_SCOPES } from './settings';
import { recordPromptValidationTiming } from '@/features/prompt-core/runtime-observability';

import type {
  PromptValidationScope,
  PromptValidationRule,
  PromptValidationSettings,
  PromptValidationSeverity,
  PromptValidationSimilarPattern,
  PromptValidationLaunchOperator,
  PromptValidationChainMode,
} from './settings';

export type PromptValidationSuggestion = {
  suggestion: string;
  found?: string;
  comment?: string | null;
};

export type PromptValidationIssue = {
  ruleId: string;
  severity: PromptValidationSeverity;
  title: string;
  message: string;
  suggestions: PromptValidationSuggestion[];
};

export type PromptValidationExecutionContext = {
  scope?: PromptValidationScope | null;
};

export type PromptValidationPreparedRuntime = {
  enabled: boolean;
  context: PromptValidationExecutionContext;
  orderedRules: PromptValidationRule[];
  sequenceGroupCounts: Map<string, number>;
};

export type PromptValidationRuntimeEvaluateOptions = {
  includeRuleIds?: Set<string> | string[] | null | undefined;
};

const DEFAULT_SEQUENCE_STEP = 10;

function compileRegex(pattern: string, flags: string | undefined): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function findSuggestions(prompt: string, rule: Pick<PromptValidationRule, 'similar'>): PromptValidationSuggestion[] {
  const suggestions: PromptValidationSuggestion[] = [];

  (rule.similar ?? []).forEach((sim: PromptValidationSimilarPattern) => {
    const re = compileRegex(sim.pattern, sim.flags);
    if (!re) return;
    const match = re.exec(prompt);
    if (!match) return;
    suggestions.push({
      suggestion: sim.suggestion,
      found: match[0],
      comment: sim.comment ?? null,
    });
  });

  return suggestions;
}

function formatSeverityLabel(severity: PromptValidationSeverity): string {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  return 'Info';
}

export const normalizePromptRuleSequence = (
  rule: PromptValidationRule,
  fallbackIndex: number
): number => {
  if (typeof rule.sequence === 'number' && Number.isFinite(rule.sequence)) {
    return Math.max(0, Math.floor(rule.sequence));
  }
  return (fallbackIndex + 1) * DEFAULT_SEQUENCE_STEP;
};

export const normalizePromptRuleChainMode = (
  rule: PromptValidationRule
): PromptValidationChainMode => {
  if (rule.chainMode === 'stop_on_match' || rule.chainMode === 'stop_on_replace') {
    return rule.chainMode;
  }
  return 'continue';
};

export const normalizePromptRuleMaxExecutions = (rule: PromptValidationRule): number => {
  if (typeof rule.maxExecutions !== 'number' || !Number.isFinite(rule.maxExecutions)) {
    return 1;
  }
  return Math.min(20, Math.max(1, Math.floor(rule.maxExecutions)));
};

export const buildPromptSequenceGroupCounts = (
  rules: PromptValidationRule[]
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const groupId = rule.sequenceGroupId?.trim();
    if (!groupId) continue;
    counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
  }
  return counts;
};

export const isPromptRuleInSequenceGroup = (
  rule: PromptValidationRule,
  counts: Map<string, number>
): boolean => {
  const groupId = rule.sequenceGroupId?.trim();
  if (!groupId) return false;
  return (counts.get(groupId) ?? 0) > 1;
};

export const sortPromptValidationRules = (
  rules: PromptValidationRule[]
): PromptValidationRule[] => {
  return rules
    .map((rule: PromptValidationRule, index: number) => ({ rule, index }))
    .sort((a, b) => {
      const aSeq = normalizePromptRuleSequence(a.rule, a.index);
      const bSeq = normalizePromptRuleSequence(b.rule, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      return a.rule.id.localeCompare(b.rule.id);
    })
    .map((entry) => entry.rule);
};

export const normalizePromptValidationScopes = (
  scopes: PromptValidationScope[] | null | undefined
): PromptValidationScope[] => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...DEFAULT_PROMPT_VALIDATION_SCOPES];
  }
  const known = new Set<PromptValidationScope>(DEFAULT_PROMPT_VALIDATION_SCOPES);
  const deduped: PromptValidationScope[] = [];
  for (const scope of scopes) {
    if (!known.has(scope) || deduped.includes(scope)) continue;
    deduped.push(scope);
  }
  return deduped.length > 0 ? deduped : [...DEFAULT_PROMPT_VALIDATION_SCOPES];
};

export const doesPromptRuleApplyToScope = (
  rule: PromptValidationRule,
  scope: PromptValidationScope | null | undefined
): boolean => {
  if (!scope) return true;
  return normalizePromptValidationScopes(rule.appliesToScopes).includes(scope);
};

const evaluateStringCondition = ({
  operator,
  value,
  operand,
  flags,
}: {
  operator: PromptValidationLaunchOperator;
  value: string;
  operand: string | null;
  flags: string | null;
}): boolean => {
  switch (operator) {
    case 'equals':
      return value === (operand ?? '');
    case 'not_equals':
      return value !== (operand ?? '');
    case 'contains':
      return value.includes(operand ?? '');
    case 'starts_with':
      return value.startsWith(operand ?? '');
    case 'ends_with':
      return value.endsWith(operand ?? '');
    case 'regex': {
      if (!operand) return false;
      const regex = compileRegex(operand, flags ?? undefined);
      if (!regex) return false;
      return regex.test(value);
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = Number(value);
      const right = Number(operand ?? '');
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (operator === 'gt') return left > right;
      if (operator === 'gte') return left >= right;
      if (operator === 'lt') return left < right;
      return left <= right;
    }
    case 'is_empty':
      return value.trim().length === 0;
    case 'is_not_empty':
      return value.trim().length > 0;
  }
};

export const shouldLaunchPromptRule = (
  rule: PromptValidationRule,
  prompt: string,
  context: PromptValidationExecutionContext = {}
): boolean => {
  if (!rule.launchEnabled) return true;
  const scope = context.scope ?? null;
  if (scope) {
    const launchScopes = normalizePromptValidationScopes(rule.launchAppliesToScopes);
    const scopeMatched = launchScopes.includes(scope);
    if (!scopeMatched) {
      return rule.launchScopeBehavior === 'bypass';
    }
  }
  return evaluateStringCondition({
    operator: rule.launchOperator ?? 'contains',
    value: prompt,
    operand: rule.launchValue ?? null,
    flags: rule.launchFlags ?? null,
  });
};

export const evaluatePromptValidationRule = (
  prompt: string,
  rule: PromptValidationRule
): PromptValidationIssue | null => {
  if (rule.kind === 'regex') {
    const re = compileRegex(rule.pattern, rule.flags);
    if (!re) {
      return {
        ruleId: rule.id,
        severity: 'warning',
        title: rule.title,
        message: `Invalid regex in rule "${rule.title}".`,
        suggestions: [],
      };
    }

    if (re.test(prompt)) return null;

    return {
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.title,
      message: rule.message,
      suggestions: findSuggestions(prompt, rule),
    };
  }

  const result = extractParamsFromPrompt(prompt);
  if (result.ok) return null;

  const suggestions = findSuggestions(prompt, rule);

  if (result.error.includes('Could not find `params = {')) {
    suggestions.push({
      suggestion: 'Add a `params = { ... }` block (JSON-like: double-quoted keys/strings).',
    });
  } else if (result.error.includes('unbalanced braces')) {
    suggestions.push({
      suggestion: 'Fix the `{}` braces in the params object (they must be balanced).',
    });
  } else if (result.error.includes('Failed to parse params')) {
    suggestions.push({
      suggestion:
        'Ensure the params object is JSON-parseable: use double quotes for keys/strings and avoid JS-only syntax.',
    });
    suggestions.push({
      suggestion:
        'Example: `"output_profile": "ecommerce_strict"` (not `output_profile: \'ecommerce_strict\'`).',
    });
  }

  return {
    ruleId: rule.id,
    severity: rule.severity,
    title: rule.title,
    message: `${rule.message} (${formatSeverityLabel(rule.severity)}: ${result.error})`,
    suggestions,
  };
};

const normalizeRuleFilter = (
  includeRuleIds: PromptValidationRuntimeEvaluateOptions['includeRuleIds']
): Set<string> | null => {
  if (!includeRuleIds) return null;
  if (includeRuleIds instanceof Set) {
    return includeRuleIds.size > 0 ? includeRuleIds : null;
  }
  if (!Array.isArray(includeRuleIds) || includeRuleIds.length === 0) {
    return null;
  }
  return new Set(includeRuleIds.filter(Boolean));
};

export const preparePromptValidationRuntime = (
  settings: PromptValidationSettings,
  context: PromptValidationExecutionContext = {}
): PromptValidationPreparedRuntime => {
  const mergedRules: PromptValidationRule[] = [
    ...settings.rules,
    ...(settings.learnedRules ?? []),
  ];
  const orderedRules = sortPromptValidationRules(mergedRules);
  const sequenceGroupCounts = buildPromptSequenceGroupCounts(orderedRules);
  return {
    enabled: settings.enabled,
    context,
    orderedRules,
    sequenceGroupCounts,
  };
};

export const validateProgrammaticPromptWithRuntime = (
  prompt: string,
  runtime: PromptValidationPreparedRuntime,
  options: PromptValidationRuntimeEvaluateOptions = {}
): PromptValidationIssue[] => {
  if (!runtime.enabled) return [];
  if (!prompt.trim()) return [];

  const startedAt = performance.now();
  const includeRuleIds = normalizeRuleFilter(options.includeRuleIds);
  const issues: PromptValidationIssue[] = [];

  for (const rule of runtime.orderedRules) {
    if (includeRuleIds && !includeRuleIds.has(rule.id)) continue;
    if (!rule.enabled) continue;
    if (!doesPromptRuleApplyToScope(rule, runtime.context.scope)) continue;

    const inSequenceGroup = isPromptRuleInSequenceGroup(
      rule,
      runtime.sequenceGroupCounts
    );
    const maxExecutions = normalizePromptRuleMaxExecutions(rule);
    let matched = false;

    for (let execution = 0; execution < maxExecutions; execution += 1) {
      if (!shouldLaunchPromptRule(rule, prompt, runtime.context)) break;
      const issue = evaluatePromptValidationRule(prompt, rule);
      if (!issue) break;
      matched = true;
      issues.push(issue);
      break;
    }

    if (!inSequenceGroup) continue;
    const chainMode = normalizePromptRuleChainMode(rule);
    if (matched && chainMode === 'stop_on_match') break;
  }

  recordPromptValidationTiming('validator_ms', performance.now() - startedAt, {
    scope: runtime.context.scope ?? 'none',
    mode: includeRuleIds ? 'subset' : 'full',
  });

  return issues;
};

export function validateProgrammaticPrompt(
  prompt: string,
  settings: PromptValidationSettings,
  context: PromptValidationExecutionContext = {}
): PromptValidationIssue[] {
  return validateProgrammaticPromptWithRuntime(
    prompt,
    preparePromptValidationRuntime(settings, context)
  );
}
