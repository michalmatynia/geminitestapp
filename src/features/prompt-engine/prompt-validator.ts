import { extractParamsFromPrompt } from './prompt-params';

import type {
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
  prompt: string
): boolean => {
  if (!rule.launchEnabled) return true;
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

export function validateProgrammaticPrompt(
  prompt: string,
  settings: PromptValidationSettings
): PromptValidationIssue[] {
  if (!settings.enabled) return [];
  if (!prompt.trim()) return [];

  const mergedRules: PromptValidationRule[] = [
    ...settings.rules,
    ...(settings.learnedRules ?? []),
  ];
  const orderedRules = sortPromptValidationRules(mergedRules);
  const sequenceGroupCounts = buildPromptSequenceGroupCounts(orderedRules);

  const issues: PromptValidationIssue[] = [];

  for (const rule of orderedRules) {
    if (!rule.enabled) continue;

    const inSequenceGroup = isPromptRuleInSequenceGroup(rule, sequenceGroupCounts);
    const maxExecutions = normalizePromptRuleMaxExecutions(rule);
    let matched = false;

    for (let execution = 0; execution < maxExecutions; execution += 1) {
      if (!shouldLaunchPromptRule(rule, prompt)) break;
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

  return issues;
}

