import type {
  PromptEngineSettings,
  PromptValidationRule,
  PromptValidationScope,
} from '@/shared/contracts/prompt-engine';
import {
  PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS,
  type PromptExploderRuntimeValidationScope,
  type PromptExploderParserTuningRuleId,
  type PromptExploderParserTuningRuleDraft,
} from '@/shared/contracts/prompt-exploder';
import { defaultPromptEngineSettings } from '@/shared/lib/prompt-engine/settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type { PromptExploderParserTuningRuleId, PromptExploderParserTuningRuleDraft };
export { PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS };

const PARSER_TUNING_RULE_LABELS: Record<PromptExploderParserTuningRuleId, string> = {
  'segment.boundary.requirements': 'Boundary · Requirements',
  'segment.boundary.studio_relighting': 'Boundary · Studio Relighting',
  'segment.boundary.pipeline': 'Boundary · Pipeline',
  'segment.boundary.final_qa': 'Boundary · Final QA',
  'segment.boundary.hr_line': 'Boundary · Horizontal Rule',
  'segment.not_heading.rule_line': 'Guard · Rule Continuation (Not Heading)',
  'segment.subsection.alpha_heading': 'Subsection · Alpha Heading',
  'segment.subsection.reference_named': 'Subsection · Named Reference',
  'segment.subsection.reference_plain': 'Subsection · Plain Reference',
  'segment.subsection.qa_code': 'Subsection · QA Code',
  'segment.subsection.numeric_bracket_heading': 'Subsection · Numeric Bracket',
  'segment.subsection.bracket_heading': 'Subsection · Bracket Heading',
  'segment.subsection.markdown_heading': 'Subsection · Markdown Heading',
};

const isRegexRule = (
  rule: PromptValidationRule | null | undefined
): rule is Extract<PromptValidationRule, { kind: 'regex' }> => {
  return rule?.kind === 'regex';
};

const coerceRuleId = (value: string): PromptExploderParserTuningRuleId | null => {
  return PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS.includes(value as PromptExploderParserTuningRuleId)
    ? (value as PromptExploderParserTuningRuleId)
    : null;
};

const resolvePromptValidationScopeFromRuntime = (
  runtimeScope: PromptExploderRuntimeValidationScope
): PromptValidationScope => {
  if (runtimeScope === 'case_resolver_prompt_exploder') {
    return 'case_resolver_prompt_exploder';
  }
  return 'prompt_exploder';
};

const buildFallbackRegexRule = (
  id: PromptExploderParserTuningRuleId,
  scope: PromptExploderRuntimeValidationScope
): Extract<PromptValidationRule, { kind: 'regex' }> => {
  const activeRuleScope = resolvePromptValidationScopeFromRuntime(scope);

  if (id === 'segment.not_heading.rule_line') {
    return {
      kind: 'regex',
      id,
      enabled: true,
      severity: 'info',
      title: PARSER_TUNING_RULE_LABELS[id],
      description: null,
      pattern: '^\\s*Rule\\s*:\\s+.+$',
      flags: 'mi',
      message: PARSER_TUNING_RULE_LABELS[id],
      similar: [],
      autofix: {
        enabled: false,
        operations: [],
      },
      sequenceGroupId: 'exploder_structure',
      sequenceGroupLabel: 'Exploder Structure',
      sequenceGroupDebounceMs: 0,
      sequence: 1,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      appliesToScopes: [activeRuleScope],
      launchEnabled: false,
      launchAppliesToScopes: [activeRuleScope],
      launchScopeBehavior: 'gate',
      launchOperator: 'contains',
      launchValue: null,
      launchFlags: null,
      promptExploderSegmentType: null,
      promptExploderConfidenceBoost: 0.05,
      promptExploderPriority: 35,
      promptExploderTreatAsHeading: false,
    };
  }

  return {
    kind: 'regex',
    id,
    enabled: true,
    severity: 'info',
    title: PARSER_TUNING_RULE_LABELS[id],
    description: null,
    pattern: '\\bUNCONFIGURED\\b',
    flags: 'mi',
    message: PARSER_TUNING_RULE_LABELS[id],
    similar: [],
    autofix: {
      enabled: false,
      operations: [],
    },
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    sequenceGroupDebounceMs: 0,
    sequence: 1,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    appliesToScopes: [activeRuleScope],
    launchEnabled: false,
    launchAppliesToScopes: [activeRuleScope],
    launchScopeBehavior: 'gate',
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
    promptExploderSegmentType: 'sequence',
    promptExploderConfidenceBoost: 0.1,
    promptExploderPriority: 20,
    promptExploderTreatAsHeading: true,
  };
};

const normalizeRuleFlags = (flags: string | null | undefined): string => {
  const normalized = (flags ?? '').trim();
  return normalized || 'mi';
};

const normalizeScopes = (
  scopes: string[] | null | undefined,
  scope: PromptExploderRuntimeValidationScope
): PromptValidationScope[] => {
  const activeRuleScope = resolvePromptValidationScopeFromRuntime(scope);
  const next = new Set<string>((scopes ?? []).filter(Boolean));
  next.add(activeRuleScope);
  return Array.from(next) as PromptValidationScope[];
};

export const buildPromptExploderParserTuningDrafts = (args: {
  scopedRules?: PromptValidationRule[] | null;
  patternPackRules?: PromptValidationRule[] | null;
  scope?: PromptExploderRuntimeValidationScope;
}): PromptExploderParserTuningRuleDraft[] => {
  const scope = args.scope ?? 'prompt_exploder';
  const scopedRules = Array.isArray(args.scopedRules) ? args.scopedRules : [];
  const patternPackRules = Array.isArray(args.patternPackRules) ? args.patternPackRules : [];
  const scopedById = new Map(
    scopedRules
      .filter(isRegexRule)
      .map((rule): [string, Extract<PromptValidationRule, { kind: 'regex' }>] => [rule.id, rule])
  );
  const packById = new Map(
    patternPackRules
      .filter(isRegexRule)
      .map((rule): [string, Extract<PromptValidationRule, { kind: 'regex' }>] => [rule.id, rule])
  );

  return PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS.map((id) => {
    const rule = scopedById.get(id) ?? packById.get(id) ?? buildFallbackRegexRule(id, scope);
    return {
      id,
      label: PARSER_TUNING_RULE_LABELS[id],
      title: rule.title,
      description: rule.description ?? null,
      pattern: rule.pattern,
      flags: normalizeRuleFlags(rule.flags),
      enabled: rule.enabled,
      promptExploderSegmentType: rule.promptExploderSegmentType ?? null,
      promptExploderPriority: Number.isFinite(rule.promptExploderPriority)
        ? Math.min(50, Math.max(-50, Math.floor(rule.promptExploderPriority ?? 0)))
        : 0,
      promptExploderConfidenceBoost: Number.isFinite(rule.promptExploderConfidenceBoost)
        ? Math.min(0.5, Math.max(0, rule.promptExploderConfidenceBoost ?? 0))
        : 0,
      promptExploderTreatAsHeading: rule.promptExploderTreatAsHeading ?? false,
    };
  });
};

export const validatePromptExploderParserTuningDrafts = (
  drafts: PromptExploderParserTuningRuleDraft[]
): { ok: true } | { ok: false; error: string } => {
  for (const draft of drafts) {
    if (!draft.pattern.trim()) {
      return {
        ok: false,
        error: `${draft.label}: pattern cannot be empty.`,
      };
    }
    try {
      // Validate with provided flags to catch invalid regex configuration early.
      void new RegExp(draft.pattern, normalizeRuleFlags(draft.flags));
    } catch (error) {
      logClientError(error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? `${draft.label}: ${error.message}`
            : `${draft.label}: invalid regex.`,
      };
    }
  }
  return { ok: true };
};

export const applyPromptExploderParserTuningDrafts = (args: {
  settings: PromptEngineSettings;
  drafts?: PromptExploderParserTuningRuleDraft[] | null;
  patternPackRules?: PromptValidationRule[] | null;
  scope?: PromptExploderRuntimeValidationScope;
}): PromptEngineSettings => {
  const scope = args.scope ?? 'prompt_exploder';
  const baseSettings = args.settings?.promptValidation
    ? args.settings
    : defaultPromptEngineSettings;
  const nextRules = [...baseSettings.promptValidation.rules];
  const drafts = Array.isArray(args.drafts) ? args.drafts : [];
  const patternPackRules = Array.isArray(args.patternPackRules) ? args.patternPackRules : [];
  const packById = new Map(
    patternPackRules
      .filter(isRegexRule)
      .map((rule): [string, Extract<PromptValidationRule, { kind: 'regex' }>] => [rule.id, rule])
  );

  drafts.forEach((draft) => {
    const ruleId = coerceRuleId(draft.id);
    if (!ruleId) return;
    const existingIndex = nextRules.findIndex((rule) => rule.id === ruleId);
    const existingRule = existingIndex >= 0 ? nextRules[existingIndex] : null;
    const baseRule = isRegexRule(existingRule)
      ? existingRule
      : (packById.get(ruleId) ?? buildFallbackRegexRule(ruleId, scope));

    const nextRule: Extract<PromptValidationRule, { kind: 'regex' }> = {
      ...baseRule,
      id: ruleId,
      enabled: draft.enabled,
      title: draft.title.trim() || baseRule.title,
      description: draft.description?.trim() || null,
      pattern: draft.pattern.trim(),
      flags: normalizeRuleFlags(draft.flags),
      appliesToScopes: normalizeScopes(baseRule.appliesToScopes, scope),
      launchAppliesToScopes: normalizeScopes(baseRule.launchAppliesToScopes, scope),
      promptExploderSegmentType: draft.promptExploderSegmentType,
      promptExploderPriority: Math.min(50, Math.max(-50, Math.floor(draft.promptExploderPriority))),
      promptExploderConfidenceBoost: Math.min(
        0.5,
        Math.max(0, draft.promptExploderConfidenceBoost)
      ),
      promptExploderTreatAsHeading: draft.promptExploderTreatAsHeading,
      message: baseRule.message?.trim()
        ? baseRule.message
        : `${draft.title.trim() || draft.label} matched.`,
    };

    if (existingIndex >= 0) {
      nextRules[existingIndex] = nextRule;
    } else {
      nextRules.push(nextRule);
    }
  });

  return {
    ...baseSettings,
    promptValidation: {
      ...baseSettings.promptValidation,
      rules: nextRules,
    },
  };
};
