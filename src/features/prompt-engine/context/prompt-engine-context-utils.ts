import {
  DEFAULT_PROMPT_VALIDATION_SCOPES,
  type PromptAutofixOperation,
  type PromptValidationRule,
  type PromptValidationScope,
  type RuleDraft,
  type RulePatch,
  DEFAULT_SEQUENCE_STEP,
  IMAGE_STUDIO_SCOPE_VALUES,
  IMAGE_STUDIO_SCOPE_SET,
} from '@/shared/contracts/prompt-engine';

export { DEFAULT_SEQUENCE_STEP };
export type { RuleDraft, RulePatch };

export const createRuleDraft = (rule: PromptValidationRule, uid: string = rule.id): RuleDraft => ({
  uid,
  text: JSON.stringify(rule, null, 2),
  parsed: rule,
  error: null,
});

export const createSequenceGroupId = (): string => {
  const random = Math.random().toString(36).slice(2, 8);
  return `seq_${Date.now().toString(36)}_${random}`;
};

export const normalizeSequenceGroupDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

export const getSequenceGroupId = (
  rule: PromptValidationRule | null | undefined
): string | null => {
  const value = rule?.sequenceGroupId?.trim();
  return value ? value : null;
};

export const getRuleSequence = (rule: PromptValidationRule, fallbackIndex: number): number => {
  if (typeof rule.sequence === 'number' && Number.isFinite(rule.sequence)) {
    return Math.max(0, Math.floor(rule.sequence));
  }
  return (fallbackIndex + 1) * DEFAULT_SEQUENCE_STEP;
};

const normalizeRuleScopes = (
  scopes: PromptValidationScope[] | null | undefined
): PromptValidationScope[] => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...DEFAULT_PROMPT_VALIDATION_SCOPES];
  }
  const known = [...DEFAULT_PROMPT_VALIDATION_SCOPES];
  const deduped: PromptValidationScope[] = [];
  for (const scope of scopes) {
    if (!known.includes(scope) || deduped.includes(scope)) continue;
    deduped.push(scope);
  }
  return deduped.length > 0 ? deduped : [...DEFAULT_PROMPT_VALIDATION_SCOPES];
};

const hasOnlyImageStudioScopes = (scopes: PromptValidationScope[]): boolean =>
  scopes.some((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope)) &&
  scopes.every((scope) => IMAGE_STUDIO_SCOPE_SET.has(scope) || scope === 'global');

export const isImageStudioRule = (rule: PromptValidationRule): boolean => {
  const id = rule.id.toLowerCase();
  if (id.includes('image_studio') || id.includes('image-studio')) {
    return true;
  }

  const appliesToScopes = normalizeRuleScopes(rule.appliesToScopes);
  const launchScopes = normalizeRuleScopes(rule.launchAppliesToScopes);
  return hasOnlyImageStudioScopes(appliesToScopes) || hasOnlyImageStudioScopes(launchScopes);
};

export const isCaseResolverPromptExploderRule = (rule: PromptValidationRule): boolean => {
  const id = rule.id.toLowerCase();
  if (
    id.includes('case_resolver_prompt_exploder') ||
    id.includes('case-resolver-prompt-exploder')
  ) {
    return true;
  }

  const appliesToScopes = normalizeRuleScopes(rule.appliesToScopes);
  const launchScopes = normalizeRuleScopes(rule.launchAppliesToScopes);
  const hasCaseResolverScope = appliesToScopes.includes('case_resolver_prompt_exploder');
  const hasOnlyCaseResolverOrGlobal =
    hasCaseResolverScope &&
    appliesToScopes.every(
      (scope: PromptValidationScope) =>
        scope === 'case_resolver_prompt_exploder' || scope === 'global'
    );
  if (hasOnlyCaseResolverOrGlobal) return true;

  const hasCaseResolverLaunchScope = launchScopes.includes('case_resolver_prompt_exploder');
  const hasOnlyCaseResolverLaunchOrGlobal =
    hasCaseResolverLaunchScope &&
    launchScopes.every(
      (scope: PromptValidationScope) =>
        scope === 'case_resolver_prompt_exploder' || scope === 'global'
    );
  return hasOnlyCaseResolverLaunchOrGlobal;
};

export const sortRuleDraftsBySequence = (drafts: RuleDraft[]): RuleDraft[] =>
  drafts
    .map((draft: RuleDraft, index: number) => ({ draft, index }))
    .sort((a, b) => {
      if (!a.draft.parsed && !b.draft.parsed) return 0;
      if (!a.draft.parsed) return 1;
      if (!b.draft.parsed) return -1;
      const aSeq = getRuleSequence(a.draft.parsed, a.index);
      const bSeq = getRuleSequence(b.draft.parsed, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      return a.draft.parsed.id.localeCompare(b.draft.parsed.id);
    })
    .map((entry) => entry.draft);

export const applyRulePatch = (draft: RuleDraft, patch: RulePatch): RuleDraft => {
  if (!draft.parsed) return draft;
  const nextRule = { ...draft.parsed, ...patch } as PromptValidationRule;
  return {
    ...draft,
    parsed: nextRule,
    text: JSON.stringify(nextRule, null, 2),
    error: null,
  };
};

export const createNewRule = (
  preset: 'core' | 'prompt_exploder' | 'image_studio' | 'case_resolver' = 'core'
): PromptValidationRule => {
  const now = Date.now();
  const baseRule: PromptValidationRule = {
    kind: 'regex',
    id: `custom.rule.${now}`,
    enabled: true,
    severity: 'warning',
    title: 'New validation rule',
    description: null,
    pattern: '^$',
    flags: 'mi',
    message: 'Update this rule with the intended pattern and message.',
    similar: [],
    autofix: { enabled: true, operations: [] },
    appliesToScopes: [...DEFAULT_PROMPT_VALIDATION_SCOPES],
    launchAppliesToScopes: [...DEFAULT_PROMPT_VALIDATION_SCOPES],
    launchScopeBehavior: 'gate',
  };

  if (preset === 'prompt_exploder') {
    return {
      ...baseRule,
      id: `prompt_exploder.rule.${now}`,
      title: 'Prompt Exploder rule',
      description: 'Rule scoped to Prompt Exploder.',
      appliesToScopes: ['prompt_exploder'],
      launchAppliesToScopes: ['prompt_exploder'],
    };
  }

  if (preset === 'image_studio') {
    return {
      ...baseRule,
      id: `image_studio.rule.${now}`,
      title: 'Image Studio rule',
      description: 'Rule scoped to Image Studio prompt, extraction, and generation.',
      appliesToScopes: [...IMAGE_STUDIO_SCOPE_VALUES],
      launchAppliesToScopes: [...IMAGE_STUDIO_SCOPE_VALUES],
    };
  }

  if (preset === 'case_resolver') {
    return {
      ...baseRule,
      id: `case_resolver_prompt_exploder.rule.${now}`,
      title: 'Case Resolver Prompt Exploder rule',
      description: 'Rule scoped to Case Resolver Prompt Exploder.',
      appliesToScopes: ['case_resolver_prompt_exploder'],
      launchAppliesToScopes: ['case_resolver_prompt_exploder'],
    };
  }

  return baseRule;
};

const appendRuleSearchParts = (parts: string[], values: Array<string | null | undefined>): void => {
  values.forEach((value) => {
    parts.push(value ?? '');
  });
};

const appendSimilarRuleSearchParts = (parts: string[], rule: PromptValidationRule): void => {
  (rule.similar ?? []).forEach((sim) => {
    appendRuleSearchParts(parts, [sim.pattern, sim.flags ?? '', sim.suggestion, sim.comment ?? '']);
  });
};

const appendAutofixRuleSearchParts = (parts: string[], operations: PromptAutofixOperation[]): void => {
  operations.forEach((operation: PromptAutofixOperation) => {
    appendRuleSearchParts(parts, [operation.kind]);
    if (operation.kind === 'replace') {
      appendRuleSearchParts(parts, [
        operation.pattern,
        operation.flags ?? '',
        operation.replacement,
        operation.comment ?? '',
      ]);
      return;
    }
    appendRuleSearchParts(parts, [operation.comment ?? '']);
  });
};

export const ruleSearchText = (rule: PromptValidationRule): string => {
  const parts: string[] = [
    rule.id,
    rule.kind,
    rule.severity,
    rule.title,
    rule.message,
    rule.description ?? '',
  ];
  appendRuleSearchParts(parts, rule.appliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES);
  appendRuleSearchParts(parts, rule.launchAppliesToScopes ?? DEFAULT_PROMPT_VALIDATION_SCOPES);
  if (rule.kind === 'regex') {
    appendRuleSearchParts(parts, [rule.pattern, rule.flags]);
  }
  appendSimilarRuleSearchParts(parts, rule);
  appendAutofixRuleSearchParts(parts, rule.autofix?.operations ?? []);
  return parts.filter(Boolean).join(' ').toLowerCase();
};

const hasPromptExploderIdHint = (id: string): boolean =>
  id.includes('prompt_exploder') || id.includes('exploder') || id.startsWith('segment.');

const hasOnlyPromptExploderOrGlobalScopes = (scopes: PromptValidationScope[]): boolean =>
  scopes.includes('prompt_exploder') &&
  scopes.every(
    (scope: PromptValidationScope) => scope === 'prompt_exploder' || scope === 'global'
  );

export const isPromptExploderRule = (rule: PromptValidationRule): boolean => {
  const id = rule.id.toLowerCase();
  if (hasPromptExploderIdHint(id)) {
    return true;
  }

  const appliesToScopes = normalizeRuleScopes(rule.appliesToScopes);
  if (hasOnlyPromptExploderOrGlobalScopes(appliesToScopes)) return true;

  const launchScopes = normalizeRuleScopes(rule.launchAppliesToScopes);
  return hasOnlyPromptExploderOrGlobalScopes(launchScopes);
};
