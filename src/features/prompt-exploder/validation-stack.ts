import { VALIDATOR_SCOPE_DESCRIPTIONS, VALIDATOR_SCOPE_LABELS } from '@/shared/contracts/validator';
import { PromptValidationScopeResolutionError } from '@/shared/lib/prompt-core/errors';
import type { PromptValidationScope } from '@/shared/contracts/prompt-engine';
import type { ValidatorPatternList, ValidatorScope } from '@/shared/contracts/admin';
import type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationStackResolution,
  PromptExploderValidationStackResolutionReason,
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

const CANONICAL_STACK_BY_SCOPE: Record<
  'prompt-exploder' | 'case-resolver-prompt-exploder',
  'prompt-exploder' | 'case-resolver-prompt-exploder'
> = {
  'prompt-exploder': 'prompt-exploder',
  'case-resolver-prompt-exploder': 'case-resolver-prompt-exploder',
};

const CANONICAL_STACK_SCOPE_BY_ID: Record<
  'prompt-exploder' | 'case-resolver-prompt-exploder',
  ValidatorScope
> = {
  'prompt-exploder': PROMPT_EXPLODER_VALIDATOR_SCOPE,
  'case-resolver-prompt-exploder': CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
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

const isPromptExploderValidatorScope = (
  scope: ValidatorScope
): scope is 'prompt-exploder' | 'case-resolver-prompt-exploder' =>
  scope === PROMPT_EXPLODER_VALIDATOR_SCOPE ||
  scope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE;

const normalizeStackValue = (
  value: PromptExploderValidationRuleStack | null | undefined
): string => {
  if (!value) return '';
  return value.trim();
};

const toRuntimeScope = (validatorScope: ValidatorScope): PromptExploderRuntimeValidationScope =>
  validatorScope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

const canonicalStackIdFromScope = (
  scope: ValidatorScope
): 'case-resolver-prompt-exploder' | 'prompt-exploder' =>
  scope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
    ? 'case-resolver-prompt-exploder'
    : 'prompt-exploder';

const findFirstListByScope = (
  patternLists: ValidatorPatternList[],
  scope: ValidatorScope
): ValidatorPatternList | null =>
  patternLists.find((entry: ValidatorPatternList): boolean => entry.scope === scope) ?? null;

const resolveCanonicalStackByScope = (
  scope: ValidatorScope,
  patternLists: ValidatorPatternList[]
): PromptExploderValidationStackResolution => {
  const matchedList = findFirstListByScope(patternLists, scope);
  if (matchedList) {
    return {
      stack: matchedList.id,
      scope: toRuntimeScope(matchedList.scope),
      validatorScope: matchedList.scope,
      list: matchedList,
      reason: 'exact_match',
    };
  }
  return {
    stack: canonicalStackIdFromScope(scope),
    scope: toRuntimeScope(scope),
    validatorScope: scope,
    list: undefined,
    reason: 'exact_match',
  };
};

const resolveCanonicalScopeByStackId = (stackId: string): ValidatorScope | null => {
  if (stackId === 'prompt-exploder') {
    return CANONICAL_STACK_SCOPE_BY_ID['prompt-exploder'];
  }
  if (stackId === 'case-resolver-prompt-exploder') {
    return CANONICAL_STACK_SCOPE_BY_ID['case-resolver-prompt-exploder'];
  }
  return null;
};

const toPreferredPromptExploderScope = (
  scope: ValidatorScope | null | undefined
): 'prompt-exploder' | 'case-resolver-prompt-exploder' =>
  scope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
    ? 'case-resolver-prompt-exploder'
    : 'prompt-exploder';

export const resolvePromptExploderValidationStack = (args: {
  stack: PromptExploderValidationRuleStack | null | undefined;
  patternLists?: ValidatorPatternList[] | null | undefined;
  preferredScope?: ValidatorScope | null | undefined;
}): PromptExploderValidationStackResolution => {
  const patternLists = args.patternLists ?? [];
  const normalizedStack = normalizeStackValue(args.stack);
  const preferredScope = toPreferredPromptExploderScope(args.preferredScope);

  if (!normalizedStack) {
    return resolveCanonicalStackByScope(CANONICAL_STACK_BY_SCOPE[preferredScope], patternLists);
  }

  const matchedList =
    patternLists.find(
      (list: ValidatorPatternList): boolean =>
        list.id === normalizedStack && isPromptExploderValidatorScope(list.scope)
    ) ?? null;
  if (matchedList) {
    return {
      stack: matchedList.id,
      scope: toRuntimeScope(matchedList.scope),
      validatorScope: matchedList.scope,
      list: matchedList,
      reason: 'exact_match',
    };
  }

  const nonPromptMatchedList =
    patternLists.find((list: ValidatorPatternList): boolean => list.id === normalizedStack) ?? null;
  if (nonPromptMatchedList) {
    throw new PromptValidationScopeResolutionError(
      `Validation stack "${normalizedStack}" is bound to unsupported scope "${nonPromptMatchedList.scope}".`,
      {
        requestedStack: normalizedStack,
        inferredScope: CANONICAL_STACK_BY_SCOPE[preferredScope],
      }
    );
  }

  const canonicalScope = resolveCanonicalScopeByStackId(normalizedStack);
  if (canonicalScope) {
    return resolveCanonicalStackByScope(canonicalScope, patternLists);
  }

  throw new PromptValidationScopeResolutionError(
    `Unknown Prompt Exploder validation stack "${normalizedStack}".`,
    {
      requestedStack: normalizedStack,
      inferredScope: CANONICAL_STACK_BY_SCOPE[preferredScope],
    }
  );
};

export const buildPromptExploderValidationRuleStackOptions = (
  patternLists: ValidatorPatternList[]
): PromptExploderValidationRuleStackOption[] => {
  const promptExploderLists = patternLists.filter((list) =>
    isPromptExploderValidatorScope(list.scope)
  );
  if (!promptExploderLists.length) return FALLBACK_VALIDATION_STACK_OPTIONS;
  return promptExploderLists.map((list: ValidatorPatternList) => ({
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
  }).scope || 'prompt_exploder';

export const promptExploderValidationStackFromScope = (
  scope: PromptValidationScope | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack => {
  const validatorScope =
    scope === 'case_resolver_prompt_exploder'
      ? CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
      : PROMPT_EXPLODER_VALIDATOR_SCOPE;
  return resolveCanonicalStackByScope(validatorScope, patternLists).stack;
};

export const promptExploderValidationStackFromBridgeSource = (
  source: 'image-studio' | 'case-resolver' | 'prompt-exploder' | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack => {
  const validatorScope =
    source === 'case-resolver'
      ? CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
      : PROMPT_EXPLODER_VALIDATOR_SCOPE;
  return resolveCanonicalStackByScope(validatorScope, patternLists).stack;
};

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
