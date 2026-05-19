import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products/validation';
import { LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION } from '@/shared/contracts/products/validation';
import { PRODUCT_VALIDATION_SOURCE_FIELD_IDS } from '@/features/products/lib/validatorSourceFields';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';
import {
  buildProductValidationSemanticOperationPresetLabel,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
  PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS as PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS_SHARED,
  type ProductValidationSemanticOperationId,
} from '@/shared/lib/products/utils/validator-semantic-operations';

export const PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS =
  PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS_SHARED;

export const NAME_SEGMENT_CATEGORY_LABEL =
  buildProductValidationSemanticOperationPresetLabel(
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
    { segmentIndex: 4 }
  ) ?? 'Name Segment #4 -> Category';
export const LEGACY_NAME_SEGMENT_CATEGORY_LABEL = 'Name Segment: Category';
export const NAME_SEGMENT_DIMENSIONS_LABEL =
  buildProductValidationSemanticOperationPresetLabel(
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken
  ) ?? 'Name Segment: Dimensions';
export const STARGATER_PRODUCER_LABEL = 'Producer -> StarGater.net';
export const SKU_AUTO_INCREMENT_GROUP_LABEL = 'SKU Auto Increment';
export const NAME_MIRROR_POLISH_GROUP_LABEL = 'Name EN -> PL Mirror';

export const POLISH_NAME_MIRROR_CATEGORY_MAPPINGS = [
  { sourceLabel: 'Keychain', sourceRegex: 'Keychain', replacement: 'Brelok' },
  { sourceLabel: 'Pin', sourceRegex: '\\bPin\\b', replacement: 'Przypinka' },
  { sourceLabel: 'Pendant', sourceRegex: '\\bPendant\\b', replacement: 'Zawieszka' },
  { sourceLabel: 'Ring', sourceRegex: '\\bRing\\b', replacement: 'Pierścień' },
  { sourceLabel: 'Earrings', sourceRegex: '\\bEarrings\\b', replacement: 'Kolczyki' },
  { sourceLabel: 'Figurine', sourceRegex: '\\bFigurine\\b', replacement: 'Figurka' },
  { sourceLabel: 'Cards', sourceRegex: '\\bCards\\b', replacement: 'Karty' },
] as const;

export type PolishNameMirrorCategoryMapping =
  (typeof POLISH_NAME_MIRROR_CATEGORY_MAPPINGS)[number];

type ValidatorTemplatePatternDefinition = {
  key: string;
  buildPayload: () => CreateProductValidationPatternInput;
  matchesExisting: (pattern: ProductValidationPattern) => boolean;
  needsUpdate?: (pattern: ProductValidationPattern) => boolean;
};

export type ValidatorTemplatePresetDefinition = {
  type: string;
  patterns: readonly ValidatorTemplatePatternDefinition[];
};

export type ValidatorSemanticSequenceBundle = {
  sequenceGroupId: string;
  sequenceGroupLabel: string;
  sequenceGroupDebounceMs: number;
  patterns: CreateProductValidationPatternInput[];
};

export const buildUniquePresetLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmedLabel = label.trim();
  const trimmed = trimmedLabel.length > 0 ? trimmedLabel : 'Pattern';
  let candidate = trimmed;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${trimmed} ${counter}`;
    counter += 1;
  }
  existingLabels.add(candidate.toLowerCase());
  return candidate;
};

const buildSemanticState = ({
  presetId,
  operation,
  sourceField = null,
  targetField = null,
  tags,
  metadata,
}: {
  presetId: string;
  operation: ProductValidationSemanticOperationId;
  sourceField?: string | null;
  targetField?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): ProductValidationSemanticState => ({
  version: LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION,
  presetId,
  operation,
  sourceField,
  targetField,
  ...(tags !== undefined && tags.length > 0 ? { tags } : {}),
  ...(metadata !== undefined && Object.keys(metadata).length > 0 ? { metadata } : {}),
});

export const buildNameSegmentCategorySemanticState = (): ProductValidationSemanticState =>
  buildSemanticState({
    presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.inferCategoryFromNameSegment,
    operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
    sourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4,
    targetField: 'categoryId',
    tags: ['template', 'category', 'name_segment'],
    metadata: { segmentIndex: 4, locale: 'en' },
  });

export const buildLatestFieldMirrorSemanticState = (
  field: 'price' | 'stock'
): ProductValidationSemanticState =>
  buildSemanticState({
    presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField,
    operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
    sourceField: field,
    targetField: field,
    tags: ['sequence', 'latest_product', 'auto_fill'],
    metadata: { field },
  });

export const buildSkuAutoIncrementLatestSemanticState =
  (): ProductValidationSemanticState =>
    buildSemanticState({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.incrementLatestSkuSuffix,
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix,
      sourceField: 'sku',
      targetField: 'sku',
      tags: ['sequence', 'sku', 'auto_fill'],
      metadata: {
        placeholder: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        padLength: 3,
      },
    });

export const buildSkuAutoIncrementGuardSemanticState =
  (): ProductValidationSemanticState =>
    buildSemanticState({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.guardPlaceholderSku,
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku,
      sourceField: 'sku',
      targetField: 'sku',
      tags: ['sequence', 'sku', 'guard'],
      metadata: { placeholder: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER },
    });

export const buildNameMirrorPolishBaseSemanticState =
  (): ProductValidationSemanticState =>
    buildSemanticState({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorNameLocale,
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
      sourceField: 'name_en',
      targetField: 'name_pl',
      tags: ['sequence', 'name', 'locale_mirror'],
      metadata: { sourceLocale: 'en', targetLocale: 'pl' },
    });

export const buildNameMirrorPolishTranslationSemanticState = ({
  sourceLabel,
  sourceRegex,
  replacement,
}: PolishNameMirrorCategoryMapping): ProductValidationSemanticState =>
  buildSemanticState({
    presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.translateNameToken,
    operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
    sourceField: 'name_pl',
    targetField: 'name_pl',
    tags: ['sequence', 'name', 'translation'],
    metadata: { sourceLabel, sourceRegex, replacement, targetLocale: 'pl' },
  });

export const buildNameSegmentDimensionsSemanticState =
  (): ProductValidationSemanticState =>
    buildSemanticState({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateNameContainsDimensionsToken,
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken,
      sourceField: 'name_en',
      targetField: 'name',
      tags: ['template', 'dimensions'],
      metadata: { tokenPattern: '\\d+x\\d+', locale: 'en' },
    });
