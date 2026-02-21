import {
  VALIDATOR_SCOPE_DESCRIPTIONS,
  VALIDATOR_SCOPE_LABELS,
  type ValidatorPatternList,
  type ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import { PromptValidationScopeResolutionError } from '@/features/prompt-core/errors';
import type { PromptValidationScope } from '@/features/prompt-engine/settings';
import type {
  PromptExploderRuntimeValidationScopeDto,
  PromptExploderValidationStackResolutionReasonDto,
  PromptExploderValidationStackResolutionDto,
} from '@/shared/contracts/prompt-exploder';

export type PromptExploderValidationRuleStack = string;

export type PromptExploderRuntimeValidationScope = PromptExploderRuntimeValidationScopeDto;

export type PromptExploderValidationRuleStackOption = {
  value: PromptExploderValidationRuleStack;
  label: string;
  description: string;
  scope: ValidatorScope;
};

export type PromptExploderValidationStackResolutionReason = PromptExploderValidationStackResolutionReasonDto;

export type PromptExploderValidationStackResolution = PromptExploderValidationStackResolutionDto;

const PROMPT_EXPLODER_VALIDATOR_SCOPE: ValidatorScope = 'prompt-exploder';
const CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE: ValidatorScope =
  'case-resolver-prompt-exploder';

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

const toRuntimeScope = (
  validatorScope: ValidatorScope
): PromptExploderRuntimeValidationScope =>
  validatorScope === CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE
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
    const promptExploderFallback = findFirstListByScope(patternLists, PROMPT_EXPLODER_VALIDATOR_SCOPE);
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
      scope: 'case-resolver-prompt-exploder',
      validatorScope: CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
      list: null,
      usedFallback: true,
      reason: 'default_scope',
    };
  }
  return {
    stack: DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
    scope: 'prompt-exploder',
    validatorScope: PROMPT_EXPLODER_VALIDATOR_SCOPE,
    list: null,
    usedFallback: true,
    reason: 'default_scope',
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
      patternLists.find((list: ValidatorPatternList): boolean => list.id === normalizedStack) ?? null;
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
  return resolvePromptExploderValidationStack({
    stack,
    patternLists,
  }).stack;
};

export const promptExploderValidationScopeFromStack = (
  stack: PromptExploderValidationRuleStack | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderRuntimeValidationScope =>
  resolvePromptExploderValidationStack({
    stack,
    patternLists,
  }).scope;

export const promptExploderValidationStackFromScope = (
  scope: PromptValidationScope | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack =>
  scope === 'case_resolver_prompt_exploder'
    ? resolveStackByScope(
      CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
      patternLists,
      'default_scope'
    ).stack
    : resolveStackByScope(
      PROMPT_EXPLODER_VALIDATOR_SCOPE,
      patternLists,
      'default_scope'
    ).stack;

export const promptExploderValidationStackFromBridgeSource = (
  source: 'image-studio' | 'case-resolver' | 'prompt-exploder' | null | undefined,
  patternLists: ValidatorPatternList[] = []
): PromptExploderValidationRuleStack =>
  source === 'case-resolver'
    ? resolveStackByScope(
      CASE_RESOLVER_PROMPT_EXPLODER_VALIDATOR_SCOPE,
      patternLists,
      'default_scope'
    ).stack
    : resolveStackByScope(
      PROMPT_EXPLODER_VALIDATOR_SCOPE,
      patternLists,
      'default_scope'
    ).stack;

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
