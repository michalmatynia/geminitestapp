import type {
  ValidatorPatternList,
  ValidatorScope,
} from '@/features/admin/pages/validator-scope';
import type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationRuleStack,
} from '@/features/prompt-exploder/validation-stack';
import type {
  PromptValidationRuleDto as PromptValidationRule,
} from '@/shared/contracts/prompt-engine';
import type {
  PromptValidationRuntimeProfileDto,
  PromptValidationRuntimeIdentityDto,
  PromptValidationRuntimeSelectionDto,
  PromptValidationStackResolutionDto,
} from '@/shared/contracts/prompt-engine';
import type { PromptExploderLearnedTemplate } from '@/shared/contracts/prompt-exploder';

export type PromptValidationRuntimeProfile = PromptValidationRuntimeProfileDto;

export type PromptValidationRuntimeIdentity = Omit<PromptValidationRuntimeIdentityDto, 'scope' | 'validatorScope' | 'stack'> & {
  scope: PromptExploderRuntimeValidationScope;
  validatorScope: ValidatorScope;
  stack: PromptExploderValidationRuleStack;
};

export type PromptValidationRuntimeSelection = Omit<PromptValidationRuntimeSelectionDto, 'identity' | 'effectiveLearnedTemplates' | 'runtimeLearnedTemplates' | 'scopedRules' | 'effectiveRules' | 'runtimeValidationRules'> & {
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

export type PromptValidationStackResolution = Omit<PromptValidationStackResolutionDto, 'stack' | 'scope' | 'validatorScope' | 'list'> & {
  stack: PromptExploderValidationRuleStack;
  scope: PromptExploderRuntimeValidationScope;
  validatorScope: ValidatorScope;
  list: ValidatorPatternList | null;
};
