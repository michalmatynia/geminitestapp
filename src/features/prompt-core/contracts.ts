import type {
  ValidatorPatternListDto,
  ValidatorScopeDto,
} from '@/shared/contracts/admin';
import type {
  PromptValidationRuntimeProfileDto,
  PromptValidationRuntimeIdentityDto,
  PromptValidationRuntimeSelectionDto,
  PromptValidationStackResolutionDto,
} from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderLearnedTemplateDto,
  PromptExploderRuntimeValidationScopeDto,
  PromptExploderValidationRuleStackDto,
} from '@/shared/contracts/prompt-exploder';

export type ValidatorPatternList = ValidatorPatternListDto;
export type ValidatorScope = ValidatorScopeDto;
export type PromptExploderValidationRuleStack = PromptExploderValidationRuleStackDto;
export type PromptExploderRuntimeValidationScope = PromptExploderRuntimeValidationScopeDto;
export type PromptExploderLearnedTemplate = PromptExploderLearnedTemplateDto;

export type PromptValidationRuntimeProfile = PromptValidationRuntimeProfileDto;

export type PromptValidationRuntimeIdentity = PromptValidationRuntimeIdentityDto;

export type PromptValidationRuntimeSelection = PromptValidationRuntimeSelectionDto;

export type PromptValidationStackResolutionInput = {
  stack: PromptExploderValidationRuleStack | null | undefined;
  patternLists?: ValidatorPatternList[] | null | undefined;
};

export type PromptValidationStackResolution = PromptValidationStackResolutionDto;
