import type {
  ValidatorPatternList,
  ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import type {
  PromptValidationRule,
} from '@/features/prompt-engine/settings';
import type { PromptExploderLearnedTemplate } from '@/features/prompt-exploder/types';
import type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationRuleStack,
} from '@/features/prompt-exploder/validation-stack';

export type PromptValidationRuntimeProfile =
  | 'all'
  | 'pattern_pack'
  | 'learned_only';

export type PromptValidationRuntimeIdentity = {
  scope: PromptExploderRuntimeValidationScope;
  validatorScope: ValidatorScope;
  stack: PromptExploderValidationRuleStack;
  listVersion: string;
  settingsVersion: string;
  profile: PromptValidationRuntimeProfile;
  cacheKey: string;
};

export type PromptValidationRuntimeSelection = {
  identity: PromptValidationRuntimeIdentity;
  scopedRules: PromptValidationRule[];
  effectiveRules: PromptValidationRule[];
  runtimeValidationRules: PromptValidationRule[];
  effectiveLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
};

export type PromptValidationStackResolutionInput = {
  stack: PromptExploderValidationRuleStack | null | undefined;
  patternLists?: ValidatorPatternList[] | null | undefined;
};

export type PromptValidationStackResolution = {
  stack: PromptExploderValidationRuleStack;
  scope: PromptExploderRuntimeValidationScope;
  validatorScope: ValidatorScope;
  list: ValidatorPatternList | null;
  usedFallback: boolean;
  reason:
    | 'exact_match'
    | 'legacy_mapping'
    | 'default_scope'
    | 'scope_fallback'
    | 'invalid_stack';
};

