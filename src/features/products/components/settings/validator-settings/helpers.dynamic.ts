import type {
  ProductValidationPattern,
  ProductValidationPatternFormData as PatternFormData,
} from '@/shared/contracts/products/validation';
import type { LabeledOptionDto } from '@/shared/contracts/base';

import { PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS } from '@/features/products/lib/validatorSourceFields';
import { PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS } from '@/features/products/lib/validatorSemanticPresets';
import {
  encodeDynamicReplacementRecipe,
  type DynamicReplacementRecipe,
} from '@/shared/lib/products/utils/validator-replacement-recipe';
import { PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS } from '@/shared/lib/products/utils/validator-semantic-operations';
import { matchesProductValidationSemanticOperation } from '@/shared/lib/products/utils/validator-semantic-state';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const trimToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseNonNegativeInteger = (value: string): number | null => {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  return trimmed.length > 0 && Number.isFinite(parsed) && parsed >= 0
    ? Math.floor(parsed)
    : null;
};

const parsePositiveInteger = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
};

const parseFiniteNumber = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.islocaletarget
 */
export const isLocaleTarget = (target: string): boolean =>
  target === 'name' || target === 'description';

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.islatestfieldmirrorpattern
 */
export const isLatestFieldMirrorPattern = (
  pattern: ProductValidationPattern,
  field: 'price' | 'stock'
): boolean => {
  if (pattern.target !== field) return false;
  return matchesProductValidationSemanticOperation(pattern, {
    presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField,
    operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
    sourceField: field,
    targetField: field,
  });
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.isnamesecondsegmentdimensionpattern
 */
export const isNameSecondSegmentDimensionPattern = (
  pattern: ProductValidationPattern,
  target: 'size_length' | 'length'
): boolean => {
  if (pattern.target !== target) return false;
  return matchesProductValidationSemanticOperation(pattern, {
    presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateNameContainsDimensionsToken,
    operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken,
    sourceField: 'name_en',
    targetField: 'name',
  });
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getsourcefieldoptionsfortarget
 */
export const getSourceFieldOptionsForTarget = (
  _target: string
): ReadonlyArray<LabeledOptionDto<string>> => PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS;

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.builddynamicrecipefromform
 */
export const buildDynamicRecipeFromForm = (
  formData: PatternFormData
): DynamicReplacementRecipe | null => {
  if (
    (formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') &&
    formData.sourceField.trim().length === 0
  ) {
    return null;
  }

  return {
    version: 1,
    sourceMode: formData.sourceMode,
    sourceField: trimToNull(formData.sourceField),
    sourceRegex: trimToNull(formData.sourceRegex),
    sourceFlags: trimToNull(formData.sourceFlags),
    sourceMatchGroup: parseNonNegativeInteger(formData.sourceMatchGroup),
    mathOperation: formData.mathOperation,
    mathOperand: parseFiniteNumber(formData.mathOperand),
    roundMode: formData.roundMode,
    padLength: parsePositiveInteger(formData.padLength),
    padChar: trimToNull(formData.padChar),
    logicOperator: formData.logicOperator,
    logicOperand: formData.logicOperand,
    logicFlags: formData.logicFlags,
    logicWhenTrueAction: formData.logicWhenTrueAction,
    logicWhenTrueValue: formData.logicWhenTrueValue,
    logicWhenFalseAction: formData.logicWhenFalseAction,
    logicWhenFalseValue: formData.logicWhenFalseValue,
    resultAssembly: formData.resultAssembly,
    targetApply: formData.targetApply,
  };
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.buildlatestfieldrecipe
 */
export const buildLatestFieldRecipe = (field: 'price' | 'stock'): string =>
  encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'latest_product_field',
    sourceField: field,
    sourceRegex: null,
    sourceFlags: null,
    sourceMatchGroup: null,
    mathOperation: 'none',
    mathOperand: null,
    roundMode: 'none',
    padLength: null,
    padChar: null,
    logicOperator: 'none',
    logicOperand: null,
    logicFlags: null,
    logicWhenTrueAction: 'keep',
    logicWhenTrueValue: null,
    logicWhenFalseAction: 'keep',
    logicWhenFalseValue: null,
    resultAssembly: 'segment_only',
    targetApply: 'replace_whole_field',
  });

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.cancompileregex
 */
export const canCompileRegex = (pattern: string, flags: string): boolean => {
  try {
    void new RegExp(pattern, flags.length > 0 ? flags : undefined);
    return true;
  } catch (error) {
    logClientError(error);
    return false;
  }
};
