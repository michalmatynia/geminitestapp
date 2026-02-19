import type {
  PromptExploderSegmentTypeDto,
  PromptExploderListItemDto,
  PromptExploderLogicalOperatorDto,
  PromptExploderLogicalComparatorDto,
  PromptExploderLogicalJoinDto,
  PromptExploderLogicalConditionDto,
  PromptExploderSubsectionDto,
  PromptExploderBindingTypeDto,
  PromptExploderBindingOriginDto,
  PromptExploderParamUiControlDto,
  PromptExploderBindingDto,
  PromptExploderSegmentDto,
  PromptExploderDocumentDto,
  PromptExploderLearnedTemplateDto,
  PromptExploderPatternSnapshotDto,
  PromptExploderBenchmarkSuiteDto,
  PromptExploderBenchmarkCaseConfigDto,
  PromptExploderOperationModeDto,
  PromptExploderAiProviderDto,
  PromptExploderSettingsDto,
  PromptExploderPatternRuleMapDto,
} from '@/shared/contracts/prompt-exploder';

import type { PromptExploderValidationRuleStack } from './validation-stack';

export type PromptExploderSegmentType = PromptExploderSegmentTypeDto;

export type PromptExploderListItem = PromptExploderListItemDto;

export type PromptExploderLogicalOperator = PromptExploderLogicalOperatorDto;

export type PromptExploderLogicalComparator = PromptExploderLogicalComparatorDto;

export type PromptExploderLogicalJoin = PromptExploderLogicalJoinDto;

export type PromptExploderLogicalCondition = PromptExploderLogicalConditionDto;

export type PromptExploderSubsection = PromptExploderSubsectionDto;

export type PromptExploderBindingType = PromptExploderBindingTypeDto;
export type PromptExploderBindingOrigin = PromptExploderBindingOriginDto;

export type PromptExploderParamUiControl = PromptExploderParamUiControlDto;

export type PromptExploderBinding = PromptExploderBindingDto;

export type PromptExploderSegment = PromptExploderSegmentDto;

export type PromptExploderDocument = PromptExploderDocumentDto;

export type PromptExploderPatternRuleMap = PromptExploderPatternRuleMapDto;

export type PromptExploderLearnedTemplate = PromptExploderLearnedTemplateDto;

export type PromptExploderPatternSnapshot = PromptExploderPatternSnapshotDto;

export type PromptExploderBenchmarkSuite = PromptExploderBenchmarkSuiteDto;

export type PromptExploderBenchmarkCaseConfig = PromptExploderBenchmarkCaseConfigDto;

export type PromptExploderOperationMode = PromptExploderOperationModeDto;

export type PromptExploderAiProvider = PromptExploderAiProviderDto;

export type PromptExploderSettings = PromptExploderSettingsDto & {
  runtime: {
    validationRuleStack: PromptExploderValidationRuleStack;
  };
};
