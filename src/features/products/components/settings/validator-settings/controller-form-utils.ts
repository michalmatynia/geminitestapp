import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import type { PatternFormData } from '@/shared/contracts/products/drafts';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import {
  getStaticReplacementValue,
  parseDynamicReplacementRecipe,
} from '@/shared/lib/products/utils/validator-replacement-recipe';

import { normalizeReplacementFields } from './helpers';

type DynamicRecipe = ReturnType<typeof parseDynamicReplacementRecipe>;

type CorePatternFormFields = Pick<
  PatternFormData,
  | 'label'
  | 'target'
  | 'locale'
  | 'regex'
  | 'flags'
  | 'message'
  | 'severity'
  | 'enabled'
  | 'replacementEnabled'
  | 'replacementAutoApply'
  | 'skipNoopReplacementProposal'
>;

type ReplacementFormFields = Pick<
  PatternFormData,
  | 'replacementValue'
  | 'replacementFields'
  | 'replacementAppliesToScopes'
  | 'postAcceptBehavior'
  | 'denyBehaviorOverride'
  | 'validationDebounceMs'
  | 'replacementMode'
>;

type DynamicSourceFormFields = Pick<
  PatternFormData,
  'sourceMode' | 'sourceField' | 'sourceRegex' | 'sourceFlags' | 'sourceMatchGroup'
>;

type LaunchFormFields = Pick<
  PatternFormData,
  | 'launchEnabled'
  | 'launchAppliesToScopes'
  | 'launchScopeBehavior'
  | 'launchSourceMode'
  | 'launchSourceField'
  | 'launchOperator'
  | 'launchValue'
  | 'launchFlags'
>;

type DynamicMathFormFields = Pick<
  PatternFormData,
  'mathOperation' | 'mathOperand' | 'roundMode' | 'padLength' | 'padChar'
>;

type DynamicLogicConditionFormFields = Pick<
  PatternFormData,
  'logicOperator' | 'logicOperand' | 'logicFlags'
>;

type DynamicLogicActionFormFields = Pick<
  PatternFormData,
  | 'logicWhenTrueAction'
  | 'logicWhenTrueValue'
  | 'logicWhenFalseAction'
  | 'logicWhenFalseValue'
>;

type DynamicAssemblyFormFields = Pick<PatternFormData, 'resultAssembly' | 'targetApply'>;

type SequenceRuntimeFormFields = Pick<
  PatternFormData,
  | 'sequenceGroupId'
  | 'sequence'
  | 'chainMode'
  | 'maxExecutions'
  | 'passOutputToNext'
  | 'runtimeEnabled'
  | 'runtimeType'
  | 'runtimeConfig'
  | 'appliesToScopes'
>;

const numberFormValue = (value: number | null | undefined, fallback: string): string =>
  value === null || value === undefined ? fallback : String(value);

const getRuntimeType = (pattern: ProductValidationPattern): PatternFormData['runtimeType'] =>
  pattern.runtimeEnabled && pattern.runtimeType === 'none' ? 'database_query' : pattern.runtimeType;

const buildCorePatternFields = (pattern: ProductValidationPattern): CorePatternFormFields => ({
  label: pattern.label,
  target: pattern.target,
  locale: pattern.locale ?? '',
  regex: pattern.regex,
  flags: pattern.flags ?? '',
  message: pattern.message,
  severity: pattern.severity,
  enabled: pattern.enabled,
  replacementEnabled: pattern.replacementEnabled,
  replacementAutoApply: pattern.replacementAutoApply,
  skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
    pattern.skipNoopReplacementProposal
  ),
});

const buildReplacementFields = (
  pattern: ProductValidationPattern,
  recipe: DynamicRecipe
): ReplacementFormFields => ({
  replacementValue: getStaticReplacementValue(pattern.replacementValue) ?? '',
  replacementFields: normalizeReplacementFields(pattern.replacementFields),
  replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
    pattern.replacementAppliesToScopes
  ),
  postAcceptBehavior: pattern.postAcceptBehavior,
  denyBehaviorOverride:
    normalizeProductValidationPatternDenyBehaviorOverride(pattern.denyBehaviorOverride) ??
    'inherit',
  validationDebounceMs: String(pattern.validationDebounceMs),
  replacementMode: recipe !== null ? 'dynamic' : 'static',
});

const buildDynamicSourceFields = (recipe: DynamicRecipe): DynamicSourceFormFields => {
  if (recipe === null) {
    return {
      sourceMode: 'current_field',
      sourceField: '',
      sourceRegex: '',
      sourceFlags: '',
      sourceMatchGroup: '',
    };
  }
  return {
    sourceMode: recipe.sourceMode,
    sourceField: recipe.sourceField ?? '',
    sourceRegex: recipe.sourceRegex ?? '',
    sourceFlags: recipe.sourceFlags ?? '',
    sourceMatchGroup: numberFormValue(recipe.sourceMatchGroup, ''),
  };
};

const buildLaunchFields = (pattern: ProductValidationPattern): LaunchFormFields => ({
  launchEnabled: pattern.launchEnabled,
  launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
    pattern.launchAppliesToScopes
  ),
  launchScopeBehavior: pattern.launchScopeBehavior ?? 'gate',
  launchSourceMode: pattern.launchSourceMode,
  launchSourceField: pattern.launchSourceField ?? '',
  launchOperator: pattern.launchOperator,
  launchValue: pattern.launchValue ?? '',
  launchFlags: pattern.launchFlags ?? '',
});

const buildDynamicMathFields = (recipe: DynamicRecipe): DynamicMathFormFields => {
  if (recipe === null) {
    return {
      mathOperation: 'none',
      mathOperand: '1',
      roundMode: 'none',
      padLength: '',
      padChar: '0',
    };
  }
  return {
    mathOperation: recipe.mathOperation ?? 'none',
    mathOperand: numberFormValue(recipe.mathOperand, '1'),
    roundMode: recipe.roundMode ?? 'none',
    padLength: numberFormValue(recipe.padLength, ''),
    padChar: recipe.padChar ?? '0',
  };
};

const buildDynamicLogicConditionFields = (
  recipe: DynamicRecipe
): DynamicLogicConditionFormFields => ({
  logicOperator: recipe?.logicOperator ?? 'none',
  logicOperand: recipe?.logicOperand ?? '',
  logicFlags: recipe?.logicFlags ?? '',
});

const buildDynamicLogicActionFields = (recipe: DynamicRecipe): DynamicLogicActionFormFields => {
  if (recipe === null) {
    return {
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: '',
      logicWhenFalseAction: 'keep',
      logicWhenFalseValue: '',
    };
  }
  return {
    logicWhenTrueAction: recipe.logicWhenTrueAction ?? 'keep',
    logicWhenTrueValue: recipe.logicWhenTrueValue ?? '',
    logicWhenFalseAction: recipe.logicWhenFalseAction ?? 'keep',
    logicWhenFalseValue: recipe.logicWhenFalseValue ?? '',
  };
};

const buildDynamicAssemblyFields = (recipe: DynamicRecipe): DynamicAssemblyFormFields => ({
  resultAssembly: recipe?.resultAssembly ?? 'segment_only',
  targetApply: recipe?.targetApply ?? 'replace_matched_segment',
});

const buildSequenceRuntimeFields = (
  pattern: ProductValidationPattern
): SequenceRuntimeFormFields => ({
  sequenceGroupId: pattern.sequenceGroupId ?? '',
  sequence: numberFormValue(pattern.sequence, ''),
  chainMode: pattern.chainMode,
  maxExecutions: String(pattern.maxExecutions),
  passOutputToNext: pattern.passOutputToNext,
  runtimeEnabled: pattern.runtimeEnabled,
  runtimeType: getRuntimeType(pattern),
  runtimeConfig: pattern.runtimeConfig ?? '',
  appliesToScopes: normalizeProductValidationPatternScopes(pattern.appliesToScopes),
});

/**
 * Validator docs: see docs/validator/function-reference.md#controller.buildformdatafrompattern
 */
export const buildFormDataFromPattern = (pattern: ProductValidationPattern): PatternFormData => {
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);

  return {
    ...buildCorePatternFields(pattern),
    ...buildReplacementFields(pattern, recipe),
    ...buildDynamicSourceFields(recipe),
    ...buildLaunchFields(pattern),
    ...buildDynamicMathFields(recipe),
    ...buildDynamicLogicConditionFields(recipe),
    ...buildDynamicLogicActionFields(recipe),
    ...buildDynamicAssemblyFields(recipe),
    ...buildSequenceRuntimeFields(pattern),
  };
};
