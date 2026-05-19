import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import { PRODUCT_VALIDATION_SOURCE_FIELD_IDS } from '@/features/products/lib/validatorSourceFields';
import {
  encodeDynamicReplacementRecipe,
  parseDynamicReplacementRecipe,
} from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  buildProductValidationSemanticOperationPresetMessage,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
} from '@/shared/lib/products/utils/validator-semantic-operations';
import {
  hasProductValidationSemanticPreset,
  normalizeProductValidationSemanticState,
} from '@/shared/lib/products/utils/validator-semantic-state';

import {
  buildNameSegmentCategorySemanticState,
  buildNameSegmentDimensionsSemanticState,
  LEGACY_NAME_SEGMENT_CATEGORY_LABEL,
  NAME_SEGMENT_CATEGORY_LABEL,
  NAME_SEGMENT_DIMENSIONS_LABEL,
  PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS,
  STARGATER_PRODUCER_LABEL,
  type ValidatorTemplatePresetDefinition,
} from './validatorSemanticPresets.shared';

const NAME_SEGMENT_DIMENSIONS_NUMBER_REGEX = '([+-]?\\d+(?:[.,]\\d+)?)';
const NAME_SEGMENT_DIMENSIONS_LAUNCH_REGEX = '[+-]?\\d+(?:[.,]\\d+)?\\s*(?:cm|mm|m)?';

export const buildNameSegmentCategoryTemplatePayload =
  (): CreateProductValidationPatternInput => ({
    label: NAME_SEGMENT_CATEGORY_LABEL,
    target: 'category',
    regex: '^$',
    message:
      buildProductValidationSemanticOperationPresetMessage(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
        { segmentIndex: 4 }
      ) ?? 'Infer category from Name EN segment #4 when category is empty.',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: true,
    skipNoopReplacementProposal: true,
    replacementValue: encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'form_field',
      sourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4,
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
    }),
    replacementFields: ['categoryId'],
    postAcceptBehavior: 'revalidate',
    validationDebounceMs: 300,
    launchEnabled: true,
    launchSourceMode: 'form_field',
    launchSourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4,
    launchOperator: 'is_not_empty',
    launchValue: null,
    launchFlags: null,
    semanticState: buildNameSegmentCategorySemanticState(),
  });

export const buildNameSegmentDimensionsTemplatePayload =
  (): CreateProductValidationPatternInput => ({
    label: NAME_SEGMENT_DIMENSIONS_LABEL,
    target: 'size_length',
    regex: '^0$',
    message: 'Use Name EN segment #2 as Length when the current Length differs.',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: false,
    skipNoopReplacementProposal: true,
    replacementValue: encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'form_field',
      sourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment2,
      sourceRegex: NAME_SEGMENT_DIMENSIONS_NUMBER_REGEX,
      sourceFlags: null,
      sourceMatchGroup: 1,
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
    }),
    replacementFields: ['sizeLength'],
    replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    postAcceptBehavior: 'revalidate',
    validationDebounceMs: 300,
    launchEnabled: true,
    launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    launchSourceMode: 'form_field',
    launchSourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment2,
    launchOperator: 'regex',
    launchValue: NAME_SEGMENT_DIMENSIONS_LAUNCH_REGEX,
    launchFlags: 'i',
    appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    semanticState: buildNameSegmentDimensionsSemanticState(),
  });

const isNameSegmentDimensionsTemplatePattern = (
  pattern: ProductValidationPattern
): boolean => {
  const explicitSemanticState = normalizeProductValidationSemanticState(pattern.semanticState);
  return (
    explicitSemanticState?.presetId ===
      PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateNameContainsDimensionsToken ||
    pattern.label.trim() === NAME_SEGMENT_DIMENSIONS_LABEL
  );
};

const hasCurrentNameSegmentDimensionsTargetConfig = (
  pattern: ProductValidationPattern
): boolean =>
  pattern.target === 'size_length' &&
  pattern.replacementEnabled === true &&
  pattern.replacementAutoApply === false &&
  pattern.replacementFields.includes('sizeLength');

const hasCurrentNameSegmentDimensionsRecipe = (
  replacementValue: string | null
): boolean => {
  const recipe = parseDynamicReplacementRecipe(replacementValue);
  return (
    recipe?.sourceMode === 'form_field' &&
    recipe.sourceField === PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment2 &&
    recipe.sourceRegex === NAME_SEGMENT_DIMENSIONS_NUMBER_REGEX &&
    recipe.sourceMatchGroup === 1 &&
    recipe.targetApply === 'replace_whole_field'
  );
};

const hasCurrentNameSegmentDimensionsLaunchConfig = (
  pattern: ProductValidationPattern
): boolean =>
  pattern.launchEnabled === true &&
  pattern.launchSourceMode === 'form_field' &&
  pattern.launchSourceField === PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment2;

const isCurrentNameSegmentDimensionsTemplatePattern = (
  pattern: ProductValidationPattern
): boolean =>
  hasCurrentNameSegmentDimensionsTargetConfig(pattern) &&
  hasCurrentNameSegmentDimensionsRecipe(pattern.replacementValue) &&
  hasCurrentNameSegmentDimensionsLaunchConfig(pattern);

const isStarGaterProducerPattern = (pattern: ProductValidationPattern): boolean =>
  pattern.label.trim() === STARGATER_PRODUCER_LABEL ||
  (
    pattern.target === 'producer' &&
    pattern.replacementEnabled === true &&
    pattern.replacementValue?.trim().toLowerCase() === 'stargater.net' &&
    pattern.replacementFields.includes('producerIds')
  );

export const buildStarGaterProducerTemplatePayload =
  (): CreateProductValidationPatternInput => ({
    label: STARGATER_PRODUCER_LABEL,
    target: 'producer',
    locale: null,
    regex: '^.*$',
    flags: null,
    message: 'Set producer to StarGater.net.',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: true,
    skipNoopReplacementProposal: true,
    replacementValue: 'StarGater.net',
    replacementFields: ['producerIds'],
    replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    postAcceptBehavior: 'revalidate',
    validationDebounceMs: 300,
    launchEnabled: false,
    appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  });

export const VALIDATOR_TEMPLATE_PRESETS: readonly ValidatorTemplatePresetDefinition[] = [
  {
    type: 'name-segment-category',
    patterns: [
      {
        key: 'name-segment-category',
        buildPayload: buildNameSegmentCategoryTemplatePayload,
        matchesExisting: (pattern) =>
          hasProductValidationSemanticPreset(
            pattern,
            PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.inferCategoryFromNameSegment
          ) ||
          [NAME_SEGMENT_CATEGORY_LABEL, LEGACY_NAME_SEGMENT_CATEGORY_LABEL].includes(
            pattern.label.trim()
          ),
      },
    ],
  },
  {
    type: 'name-segment-dimensions',
    patterns: [
      {
        key: 'name-segment-dimensions',
        buildPayload: buildNameSegmentDimensionsTemplatePayload,
        matchesExisting: isNameSegmentDimensionsTemplatePattern,
        needsUpdate: (pattern) =>
          isNameSegmentDimensionsTemplatePattern(pattern) &&
          !isCurrentNameSegmentDimensionsTemplatePattern(pattern),
      },
    ],
  },
  {
    type: 'producer-stargater',
    patterns: [
      {
        key: 'producer-stargater',
        buildPayload: buildStarGaterProducerTemplatePayload,
        matchesExisting: isStarGaterProducerPattern,
      },
    ],
  },
] as const;

export const getValidatorTemplatePresetByType = (
  type: string
): ValidatorTemplatePresetDefinition | null =>
  VALIDATOR_TEMPLATE_PRESETS.find((preset) => preset.type === type) ?? null;
