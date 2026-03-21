import type {
  PromptExploderBinding,
  PromptExploderBindingOrigin,
  PromptExploderBindingType,
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalJoin,
  PromptExploderLogicalOperator,
  PromptExploderOperationMode,
  PromptExploderParamUiControl,
  PromptExploderParserTuningRuleDraft,
  PromptExploderParserTuningRuleId,
  PromptExploderRuntimeValidationScope,
  PromptExploderSegment,
  PromptExploderSegmentType,
  PromptExploderSettings,
  PromptExploderSubsection,
  PromptExploderBenchmarkSuggestion,
  PromptExploderBenchmarkSuite,
  PromptExploderValidationRuleStack,
  PromptExploderPatternSnapshot,
} from '@/shared/contracts/prompt-exploder';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';

export type {
  PromptExploderBinding,
  PromptExploderBindingOrigin,
  PromptExploderBindingType,
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalJoin,
  PromptExploderLogicalOperator,
  PromptExploderOperationMode,
  PromptExploderParamUiControl,
  PromptExploderParserTuningRuleDraft,
  PromptExploderParserTuningRuleId,
  PromptExploderRuntimeValidationScope,
  PromptExploderSegment,
  PromptExploderSegmentType,
  PromptExploderSettings,
  PromptExploderSubsection,
  PromptExploderBenchmarkSuggestion,
  PromptExploderBenchmarkSuite,
  PromptExploderValidationRuleStack,
  PromptExploderPatternSnapshot,
};
export type PromptValidationRegexRule = Extract<PromptValidationRule, { kind: 'regex' }>;

export type PromptExploderState = {
  activeScope: PromptExploderRuntimeValidationScope;
  activeStack: PromptExploderValidationRuleStack | null;
  isLoading: boolean;
};
