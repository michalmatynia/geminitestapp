import { VALIDATOR_SCOPE_DESCRIPTIONS, VALIDATOR_SCOPE_LABELS } from '@/shared/contracts/validator';
import { PromptValidationScopeResolutionError } from '@/shared/lib/prompt-core/errors';
import type { PromptValidationScope } from '@/shared/contracts/prompt-engine';
import type { ValidatorPatternList, ValidatorScope } from '@/shared/contracts/admin';
import type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationStackResolutionReason,
  PromptExploderValidationStackResolution,
  PromptExploderValidationRuleStack,
  PromptExploderValidationRuleStackOption,
} from '@/shared/contracts/prompt-exploder';

export type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationStackResolutionReason,
  PromptExploderValidationStackResolution,
  PromptExploderValidationRuleStack,
  PromptExploderValidationRuleStackOption,
};

const PROMPT_EXPLODER_VALIDATOR_SCOPE: ValidatorScope = 'prompt-exploder';
const CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE: ValidatorScope =
  'case-resolver-prompt-exploder';

const KNOWN_STACK_SCOPE_ALIASES: Readonly<Record<string, ValidatorScope>> = {
  'prompt-exploder': PROMPT_EXPLODER_VALIDATOR_SCOPE,
  prompt_exploder: PROMPT_EXPLODER_VALIDATOR_SCOPE,
  'case-resolver-prompt-exploder': CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
  case_resolver_prompt_exploder: CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
};

export const DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK: PromptExploderValidationRuleStack =
  'prompt-exploder';

const FALLBACK_VALIDATION_STACK_OPTIONS: PromptExploderValidationRuleStackOption[] = [
  {
    id: 'prompt-exploder',
    name: VALIDATOR_SCOPE_LABELS['prompt-exploder'],
    value: 'prompt-exploder',
    label: VALIDATOR_SCOPE_LABELS['prompt-exploder'],
    description: VALIDATOR_SCOPE_DESCRIPTIONS['prompt-exploder'],
    scope: 'prompt-exploder',
  },
  {
    id: 'case-resolver-prompt-exploder',
    name: VALIDATOR_SCOPE_LABELS['case-resolver-prompt-exploder'],
    value: 'case-resolver-prompt-exploder',
    label: VALIDATOR_SCOPE_LABELS['case-resolver-prompt-exploder'],
    description: VALIDATOR_SCOPE_DESCRIPTIONS['case-resolver-prompt-exploder'],
    scope: 'case-resolver-prompt-exploder',
  },
];

const normalizeStackValue = (
  value: PromptExploderValidationRuleStack | null | undefined
): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return (value.id || '').trim();
};

const normalizeStackAliasKey = (value: string): string => value.trim().toLowerCase();

const toRuntimeScope = (validatorScope: ValidatorScope): PromptExploderRuntimeValidationScope =>
  validatorScope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

const canonicalStackIdFromScope = (scope: ValidatorScope): PromptExploderValidationRuleStack =>
  scope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
    ? 'case-resolver-prompt-exploder'
    : 'prompt-exploder';

const findFirstListByScope = (
  patternLists: ValidatorPatternList[],
  scope: ValidatorScope
): ValidatorPatternList | null =>
  patternLists.find((entry: ValidatorPatternList): boolean => entry.scope === scope) ?? null;

const resolveStackByScope = (
  scope: ValidatorScope,
  patternLists: ValidatorPatternList[],
  reason: PromptExploderValidationStackResolutionReason
): PromptExploderValidationStackResolution => {
  const matchedList = findFirstListByScope(patternLists, scope);
  if (matchedList) {
    return {
      stack: matchedList.id,
      scope: toRuntimeScope(matchedList.scope),
      validatorScope: matchedList.scope,
      list: matchedList,
      usedFallback: false,
      reason,
    };
  }

  if (patternLists.length > 0) {
    const promptExploderFallback = findFirstListByScope(
      patternLists,
      PROMPT_EXPLODER_VALIDATOR_SCOPE
    );
    const list = promptExploderFallback ?? patternLists[0] ?? null;
    if (list) {
      return {
        stack: list.id,
        scope: toRuntimeScope(list.scope),
        validatorScope: list.scope,
        list,
        usedFallback: true,
        reason: 'scope_fallback',
      };
    }
  }

  if (scope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE) {
    return {
      stack: 'case-resolver-prompt-exploder',
      scope: 'case_resolver_prompt_exploder',
      validatorScope: CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
      list: undefined,
      usedFallback: true,
      reason: 'default_scope',
    };
  }
  return {
    stack: DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
    scope: 'prompt_exploder',
    validatorScope: PROMPT_EXPLODER_VALIDATOR_SCOPE,
    list: undefined,
    usedFallback: true,
    reason: 'default_scope',
  };
};

const resolveKnownStackAlias = (
  stack: string,
  patternLists: ValidatorPatternList[]
): PromptExploderValidationStackResolution | null => {
  const aliasScope = KNOWN_STACK_SCOPE_ALIASES[normalizeStackAliasKey(stack)];
  if (!aliasScope) return null;

  const matchedList = findFirstListByScope(patternLists, aliasScope);
  if (matchedList) {
    return {
      stack: matchedList.id,
      scope: toRuntimeScope(matchedList.scope),
      validatorScope: matchedList.scope,
      list: matchedList,
      usedFallback: false,
      reason: 'exact_match',
    };
  }

  return {
    stack: canonicalStackIdFromScope(aliasScope),
    scope: toRuntimeScope(aliasScope),
    validatorScope: aliasScope,
    list: undefined,
    usedFallback: false,
    reason: 'exact_match',
  };
};

export const resolvePromptExploderValidationStack = (args: {
  stack: PromptExploderValidationRuleStack | null | undefined;
  patternLists?: ValidatorPatternList[] | null | undefined;
  preferredScope?: ValidatorScope | null | undefined;
  strictUnknownStack?: boolean | undefined;
}): PromptExploderValidationStackResolution => {
  const patternLists = args.patternLists ?? [];
  const normalizedStack = normalizeStackValue(args.stack);
  const preferredScope = args.preferredScope ?? PROMPT_EXPLODER_VALIDATOR_SCOPE;

  if (normalizedStack) {
    const matchedList =
      patternLists.find((list: ValidatorPatternList): boolean => list.id === normalizedStack) ??
      null;
    if (matchedList) {
      return {
        stack: matchedList.id,
        scope: toRuntimeScope(matchedList.scope),
        validatorScope: matchedList.scope,
        list: matchedList,
        usedFallback: false,
        reason: 'exact_match',
      };
    }

    const aliasResolution = resolveKnownStackAlias(normalizedStack, patternLists);
    if (aliasResolution) {
      return aliasResolution;
    }
  }

  if (!normalizedStack) {
    return resolveStackByScope(preferredScope, patternLists, 'default_scope');
  }

  const inferredScope = preferredScope;
  if (args.strictUnknownStack) {
    throw new PromptValidationScopeResolutionError(
      `Unknown Prompt Exploder validation stack "${normalizedStack}".`,
      {
        requestedStack: normalizedStack,
        inferredScope,
      }
    );
  }
  const fallback = resolveStackByScope(preferredScope, patternLists, 'invalid_stack');
  return {
    ...fallback,
    usedFallback: true,
    reason: 'invalid_stack',
  };
};

export const buildPromptExploderValidationRuleStackOptions = (
  patternLists: ValidatorPatternList[]
): PromptExploderValidationRuleStackOption[] => {
  if (!patternLists.length) return FALLBACK_VALIDATION_STACK_OPTIONS;
  return patternLists.map((list: ValidatorPatternList) => ({
    id: list.id,
    name: list.name,
    value: list.id,
    label: list.name,
    description: list.description.trim() || VALIDATOR_SCOPE_DESCRIPTIONS[list.scope],
    scope: list.scope,
  }));
};

export const PROMPT_EXPLODER_VALIDATION_RULE_STACK_OPTIONS: PromptExploderValidationRuleStackOption[] =
  FALLBACK_VALIDATION_STACK_OPTIONS;

export const normalizePromptExploderValidationRuleStack = (
  stack: PromptExploderValidationRuleStack | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack => {
  return (
    resolvePromptExploderValidationStack({
      stack,
      patternLists,
    }).stack || DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK
  );
};

export const promptExploderValidationScopeFromStack = (
  stack: PromptExploderValidationRuleStack | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderRuntimeValidationScope =>
  resolvePromptExploderValidationStack({
    stack,
    patternLists,
  }).scope || 'global';

export const promptExploderValidationStackFromScope = (
  scope: PromptValidationScope | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack =>
  (scope === 'case_resolver_prompt_exploder'
    ? resolveStackByScope(
      CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
      patternLists,
      'default_scope'
    ).stack
    : resolveStackByScope(PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists, 'default_scope').stack) ||
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK;

export const promptExploderValidationStackFromBridgeSource = (
  source: 'image-studio' | 'case-resolver' | 'prompt-exploder' | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack =>
  (source === 'case-resolver'
    ? resolveStackByScope(
      CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
      patternLists,
      'default_scope'
    ).stack
    : resolveStackByScope(PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists, 'default_scope').stack) ||
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK;

export const promptExploderValidatorScopeFromStack = (
  stack: PromptExploderValidationRuleStack | null | undefined,
  patternLists: ValidatorPatternList[] = []
): 'prompt-exploder' | 'case-resolver-prompt-exploder' =>
  resolvePromptExploderValidationStack({
    stack,
    patternLists,
  }).validatorScope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
    ? 'case-resolver-prompt-exploder'
    : 'prompt-exploder';
