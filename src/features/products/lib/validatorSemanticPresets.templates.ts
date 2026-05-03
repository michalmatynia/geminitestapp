import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import { PRODUCT_VALIDATION_SOURCE_FIELD_IDS } from '@/features/products/lib/validatorSourceFields';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  buildProductValidationSemanticOperationPresetMessage,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
} from '@/shared/lib/products/utils/validator-semantic-operations';
import { hasProductValidationSemanticPreset } from '@/shared/lib/products/utils/validator-semantic-state';

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
    target: 'name',
    regex: '\\d+x\\d+',
    message:
      buildProductValidationSemanticOperationPresetMessage(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken
      ) ?? 'Product name must contain dimensions.',
    severity: 'warning',
    enabled: true,
    semanticState: buildNameSegmentDimensionsSemanticState(),
  });

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
        matchesExisting: (pattern) =>
          hasProductValidationSemanticPreset(
            pattern,
            PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateNameContainsDimensionsToken
          ) || pattern.label.trim() === NAME_SEGMENT_DIMENSIONS_LABEL,
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
