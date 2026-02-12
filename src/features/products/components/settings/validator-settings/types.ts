import type {
  DynamicReplacementLogicAction,
  DynamicReplacementLogicOperator,
  DynamicReplacementMathOperation,
  DynamicReplacementRoundMode,
  DynamicReplacementSourceMode,
} from '@/features/products/utils/validator-replacement-recipe';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
  ProductValidationLaunchOperator,
  ProductValidationLaunchScopeBehavior,
  ProductValidationPostAcceptBehavior,
  ProductValidationRuntimeType,
  ProductValidationTarget,
} from '@/shared/types/domain/products';

export type ReplacementMode = 'static' | 'dynamic';

export type SequenceGroupDraft = {
  label: string;
  debounceMs: string;
};

export type SequenceGroupView = {
  id: string;
  label: string;
  debounceMs: number;
  patternIds: string[];
};

export type PatternFormData = {
  label: string;
  target: ProductValidationTarget;
  locale: string;
  regex: string;
  flags: string;
  message: string;
  severity: 'error' | 'warning';
  enabled: boolean;
  replacementEnabled: boolean;
  replacementAutoApply: boolean;
  skipNoopReplacementProposal: boolean;
  replacementValue: string;
  replacementFields: string[];
  replacementAppliesToScopes: ProductValidationInstanceScope[];
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  denyBehaviorOverride: 'inherit' | ProductValidationDenyBehavior;
  validationDebounceMs: string;
  replacementMode: ReplacementMode;
  sourceMode: DynamicReplacementSourceMode;
  sourceField: string;
  sourceRegex: string;
  sourceFlags: string;
  sourceMatchGroup: string;
  launchEnabled: boolean;
  launchAppliesToScopes: ProductValidationInstanceScope[];
  launchScopeBehavior: ProductValidationLaunchScopeBehavior;
  launchSourceMode: DynamicReplacementSourceMode;
  launchSourceField: string;
  launchOperator: ProductValidationLaunchOperator;
  launchValue: string;
  launchFlags: string;
  mathOperation: DynamicReplacementMathOperation;
  mathOperand: string;
  roundMode: DynamicReplacementRoundMode;
  padLength: string;
  padChar: string;
  logicOperator: DynamicReplacementLogicOperator;
  logicOperand: string;
  logicFlags: string;
  logicWhenTrueAction: DynamicReplacementLogicAction;
  logicWhenTrueValue: string;
  logicWhenFalseAction: DynamicReplacementLogicAction;
  logicWhenFalseValue: string;
  resultAssembly: 'segment_only' | 'source_replace_match';
  targetApply: 'replace_whole_field' | 'replace_matched_segment';
  sequence: string;
  chainMode: 'continue' | 'stop_on_match' | 'stop_on_replace';
  maxExecutions: string;
  passOutputToNext: boolean;
  runtimeEnabled: boolean;
  runtimeType: ProductValidationRuntimeType;
  runtimeConfig: string;
  appliesToScopes: ProductValidationInstanceScope[];
};
