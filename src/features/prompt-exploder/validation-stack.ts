import {
  VALIDATOR_SCOPE_DESCRIPTIONS,
  VALIDATOR_SCOPE_LABELS,
  type ValidatorPatternList,
  type ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import type { PromptValidationScope } from '@/features/prompt-engine/settings';

export type PromptExploderValidationRuleStack = string;

export type PromptExploderRuntimeValidationScope =
  | 'prompt_exploder'
  | 'case_resolver_prompt_exploder';

type PromptExploderValidationRuleStackOption = {
  value: PromptExploderValidationRuleStack;
  label: string;
  description: string;
  scope: ValidatorScope;
};

const PROMPT_EXPLODER_VALIDATOR_SCOPE: ValidatorScope = 'prompt-exploder';
const CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE: ValidatorScope =
  'case-resolver-prompt-exploder';
const LEGACY_IMAGE_STUDIO_PROMPT_EXPLODER_STACK = 'image_studio_prompt_exploder';
const LEGACY_CASE_RESOLVER_PROMPT_EXPLODER_STACK = 'case_resolver_prompt_exploder';

export const DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK: PromptExploderValidationRuleStack =
  'prompt-exploder';

const FALLBACK_VALIDATION_STACK_OPTIONS: PromptExploderValidationRuleStackOption[] = [
  {
    value: 'prompt-exploder',
    label: VALIDATOR_SCOPE_LABELS['prompt-exploder'],
    description: VALIDATOR_SCOPE_DESCRIPTIONS['prompt-exploder'],
    scope: 'prompt-exploder',
  },
  {
    value: 'case-resolver-prompt-exploder',
    label: VALIDATOR_SCOPE_LABELS['case-resolver-prompt-exploder'],
    description: VALIDATOR_SCOPE_DESCRIPTIONS['case-resolver-prompt-exploder'],
    scope: 'case-resolver-prompt-exploder',
  },
];

const normalizeStackValue = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveScopeFromLegacyStack = (stack: string): ValidatorScope => {
  if (
    stack === LEGACY_CASE_RESOLVER_PROMPT_EXPLODER_STACK ||
    stack === 'case-resolver-prompt-exploder' ||
    stack.includes('case_resolver') ||
    stack.includes('case-resolver')
  ) {
    return CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE;
  }
  return PROMPT_EXPLODER_VALIDATOR_SCOPE;
};

const findFirstListIdByScope = (
  patternLists: ValidatorPatternList[],
  scope: ValidatorScope
): string | null =>
  patternLists.find((entry: ValidatorPatternList): boolean => entry.scope === scope)?.id ?? null;

const resolveStackByScope = (
  scope: ValidatorScope,
  patternLists: ValidatorPatternList[]
): PromptExploderValidationRuleStack => {
  const matchedId = findFirstListIdByScope(patternLists, scope);
  if (matchedId) return matchedId;
  if (patternLists.length > 0) {
    const promptExploderFallback = findFirstListIdByScope(
      patternLists,
      PROMPT_EXPLODER_VALIDATOR_SCOPE
    );
    if (promptExploderFallback) return promptExploderFallback;
    return patternLists[0]?.id ?? DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK;
  }
  if (scope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE) {
    return 'case-resolver-prompt-exploder';
  }
  return DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK;
};

export const buildPromptExploderValidationRuleStackOptions = (
  patternLists: ValidatorPatternList[]
): PromptExploderValidationRuleStackOption[] => {
  if (!patternLists.length) return FALLBACK_VALIDATION_STACK_OPTIONS;
  return patternLists.map((list: ValidatorPatternList) => ({
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
  const normalizedStack = normalizeStackValue(stack);
  if (normalizedStack && patternLists.some((list: ValidatorPatternList): boolean => list.id === normalizedStack)) {
    return normalizedStack;
  }

  if (normalizedStack === LEGACY_IMAGE_STUDIO_PROMPT_EXPLODER_STACK) {
    return resolveStackByScope(PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists);
  }
  if (normalizedStack === LEGACY_CASE_RESOLVER_PROMPT_EXPLODER_STACK) {
    return resolveStackByScope(CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists);
  }

  if (!normalizedStack) {
    return resolveStackByScope(PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists);
  }

  const inferredScope = resolveScopeFromLegacyStack(normalizedStack);
  return resolveStackByScope(inferredScope, patternLists);
};

export const promptExploderValidationScopeFromStack = (
  stack: PromptExploderValidationRuleStack | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderRuntimeValidationScope =>
  promptExploderValidatorScopeFromStack(stack, patternLists) ===
  CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

export const promptExploderValidationStackFromScope = (
  scope: PromptValidationScope | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack =>
  scope === 'case_resolver_prompt_exploder'
    ? resolveStackByScope(CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists)
    : resolveStackByScope(PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists);

export const promptExploderValidationStackFromBridgeSource = (
  source: 'image-studio' | 'case-resolver' | 'prompt-exploder' | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack =>
  source === 'case-resolver'
    ? resolveStackByScope(CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists)
    : resolveStackByScope(PROMPT_EXPLODER_VALIDATOR_SCOPE, patternLists);

export const promptExploderValidatorScopeFromStack = (
  stack: PromptExploderValidationRuleStack | null | undefined,
  patternLists: ValidatorPatternList[] = []
): 'prompt-exploder' | 'case-resolver-prompt-exploder' =>
  (() => {
    const normalizedStack = normalizeStackValue(stack);
    if (normalizedStack) {
      const matchedList = patternLists.find(
        (list: ValidatorPatternList): boolean => list.id === normalizedStack
      );
      if (matchedList) {
        return matchedList.scope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
          ? 'case-resolver-prompt-exploder'
          : 'prompt-exploder';
      }
    }
    return resolveScopeFromLegacyStack(normalizedStack || DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK) ===
      CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
      ? 'case-resolver-prompt-exploder'
      : 'prompt-exploder';
  })();
