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
import type { ProductValidationPattern } from '@/shared/contracts/products';
import type { PatternFormData } from '@/shared/contracts/products';

import { normalizeReplacementFields } from './helpers';

/**
 * Validator docs: see docs/validator/function-reference.md#controller.buildformdatafrompattern
 */
export const buildFormDataFromPattern = (pattern: ProductValidationPattern): PatternFormData => {
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);

  return {
    label: pattern.label,
    target: pattern.target,
    locale: pattern.locale ?? '',
    regex: pattern.regex,
    flags: pattern.flags ?? '',
    message: pattern.message,
    severity: pattern.severity,
    enabled: pattern.enabled,
    replacementEnabled: pattern.replacementEnabled,
    replacementAutoApply: pattern.replacementAutoApply ?? false,
    skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
      pattern.skipNoopReplacementProposal
    ),
    replacementValue: getStaticReplacementValue(pattern.replacementValue) ?? '',
    replacementFields: normalizeReplacementFields(pattern.replacementFields),
    replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
      pattern.replacementAppliesToScopes
    ),
    postAcceptBehavior: pattern.postAcceptBehavior ?? 'revalidate',
    denyBehaviorOverride:
      normalizeProductValidationPatternDenyBehaviorOverride(pattern.denyBehaviorOverride) ??
      'inherit',
    validationDebounceMs: String(pattern.validationDebounceMs ?? 0),
    replacementMode: recipe ? 'dynamic' : 'static',
    sourceMode: recipe?.sourceMode ?? 'current_field',
    sourceField: recipe?.sourceField ?? '',
    sourceRegex: recipe?.sourceRegex ?? '',
    sourceFlags: recipe?.sourceFlags ?? '',
    sourceMatchGroup:
      recipe?.sourceMatchGroup !== undefined && recipe?.sourceMatchGroup !== null
        ? String(recipe.sourceMatchGroup)
        : '',
    launchEnabled: pattern.launchEnabled ?? false,
    launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
      pattern.launchAppliesToScopes
    ),
    launchScopeBehavior: pattern.launchScopeBehavior ?? 'gate',
    launchSourceMode: pattern.launchSourceMode ?? 'current_field',
    launchSourceField: pattern.launchSourceField ?? '',
    launchOperator: pattern.launchOperator ?? 'equals',
    launchValue: pattern.launchValue ?? '',
    launchFlags: pattern.launchFlags ?? '',
    mathOperation: recipe?.mathOperation ?? 'none',
    mathOperand:
      recipe?.mathOperand !== undefined && recipe?.mathOperand !== null
        ? String(recipe.mathOperand)
        : '1',
    roundMode: recipe?.roundMode ?? 'none',
    padLength:
      recipe?.padLength !== undefined && recipe?.padLength !== null ? String(recipe.padLength) : '',
    padChar: recipe?.padChar ?? '0',
    logicOperator: recipe?.logicOperator ?? 'none',
    logicOperand: recipe?.logicOperand ?? '',
    logicFlags: recipe?.logicFlags ?? '',
    logicWhenTrueAction: recipe?.logicWhenTrueAction ?? 'keep',
    logicWhenTrueValue: recipe?.logicWhenTrueValue ?? '',
    logicWhenFalseAction: recipe?.logicWhenFalseAction ?? 'keep',
    logicWhenFalseValue: recipe?.logicWhenFalseValue ?? '',
    resultAssembly: recipe?.resultAssembly ?? 'segment_only',
    targetApply: recipe?.targetApply ?? 'replace_matched_segment',
    sequenceGroupId: pattern.sequenceGroupId ?? '',
    sequence:
      pattern.sequence !== null && pattern.sequence !== undefined ? String(pattern.sequence) : '',
    chainMode: pattern.chainMode ?? 'continue',
    maxExecutions: String(pattern.maxExecutions ?? 1),
    passOutputToNext: pattern.passOutputToNext ?? true,
    runtimeEnabled: pattern.runtimeEnabled ?? false,
    runtimeType:
      (pattern.runtimeEnabled ?? false) && (pattern.runtimeType ?? 'none') === 'none'
        ? 'database_query'
        : (pattern.runtimeType ?? 'none'),
    runtimeConfig: pattern.runtimeConfig ?? '',
    appliesToScopes: normalizeProductValidationPatternScopes(pattern.appliesToScopes),
  };
};
