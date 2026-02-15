import type { PromptValidationScope } from '@/features/prompt-engine/settings';

export type PromptExploderValidationRuleStack =
  | 'image_studio_prompt_exploder'
  | 'case_resolver_prompt_exploder';

export type PromptExploderRuntimeValidationScope =
  | 'prompt_exploder'
  | 'case_resolver_prompt_exploder';

export const DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK: PromptExploderValidationRuleStack =
  'image_studio_prompt_exploder';

export const PROMPT_EXPLODER_VALIDATION_RULE_STACK_VALUES: [
  PromptExploderValidationRuleStack,
  ...PromptExploderValidationRuleStack[],
] = ['image_studio_prompt_exploder', 'case_resolver_prompt_exploder'];

export const PROMPT_EXPLODER_VALIDATION_RULE_STACK_OPTIONS: Array<{
  value: PromptExploderValidationRuleStack;
  label: string;
  description: string;
}> = [
  {
    value: 'image_studio_prompt_exploder',
    label: 'Image Studio - Prompt Exploder',
    description: 'Applies rules scoped to Image Studio Prompt Exploder.',
  },
  {
    value: 'case_resolver_prompt_exploder',
    label: 'Case Resolver - Prompt Exploder',
    description: 'Applies rules scoped to Case Resolver Prompt Exploder.',
  },
];

export const promptExploderValidationScopeFromStack = (
  stack: PromptExploderValidationRuleStack | null | undefined
): PromptExploderRuntimeValidationScope =>
  stack === 'case_resolver_prompt_exploder'
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

export const promptExploderValidationStackFromScope = (
  scope: PromptValidationScope | null | undefined
): PromptExploderValidationRuleStack =>
  scope === 'case_resolver_prompt_exploder'
    ? 'case_resolver_prompt_exploder'
    : 'image_studio_prompt_exploder';

export const promptExploderValidationStackFromBridgeSource = (
  source: 'image-studio' | 'case-resolver' | 'prompt-exploder' | null | undefined
): PromptExploderValidationRuleStack =>
  source === 'case-resolver'
    ? 'case_resolver_prompt_exploder'
    : 'image_studio_prompt_exploder';

export const promptExploderValidatorScopeFromStack = (
  stack: PromptExploderValidationRuleStack | null | undefined
): 'prompt-exploder' | 'case-resolver-prompt-exploder' =>
  stack === 'case_resolver_prompt_exploder'
    ? 'case-resolver-prompt-exploder'
    : 'prompt-exploder';
