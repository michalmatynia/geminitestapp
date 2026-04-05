import type { CreateProductValidationPatternInput, ProductValidationPattern, ProductValidationSemanticState } from '@/shared/contracts/products/validation';
import { LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION } from '@/shared/contracts/products/validation';
import {
  buildProductValidationSemanticOperationPresetLabel,
  buildProductValidationSemanticOperationPresetMessage,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
  PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS as PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS_SHARED,
  type ProductValidationSemanticOperationId,
} from '@/shared/lib/products/utils/validator-semantic-operations';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';
import { PRODUCT_VALIDATION_SOURCE_FIELD_IDS } from '@/features/products/lib/validatorSourceFields';
import { hasProductValidationSemanticPreset } from '@/shared/lib/products/utils/validator-semantic-state';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

export const PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS =
  PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS_SHARED;

const NAME_SEGMENT_CATEGORY_LABEL =
  buildProductValidationSemanticOperationPresetLabel(
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
    { segmentIndex: 4 }
  ) ?? 'Name Segment #4 -> Category';
const LEGACY_NAME_SEGMENT_CATEGORY_LABEL = 'Name Segment: Category';
const NAME_SEGMENT_DIMENSIONS_LABEL =
  buildProductValidationSemanticOperationPresetLabel(
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken
  ) ?? 'Name Segment: Dimensions';
const SKU_AUTO_INCREMENT_GROUP_LABEL = 'SKU Auto Increment';
const NAME_MIRROR_POLISH_GROUP_LABEL = 'Name EN -> PL Mirror';

const POLISH_NAME_MIRROR_CATEGORY_MAPPINGS: ReadonlyArray<{
  sourceLabel: string;
  sourceRegex: string;
  replacement: string;
}> = [
  {
    sourceLabel: 'Keychain',
    sourceRegex: 'Keychain',
    replacement: 'Brelok',
  },
  {
    sourceLabel: 'Pin',
    sourceRegex: '\\bPin\\b',
    replacement: 'Przypinka',
  },
  {
    sourceLabel: 'Pendant',
    sourceRegex: '\\bPendant\\b',
    replacement: 'Zawieszka',
  },
  {
    sourceLabel: 'Ring',
    sourceRegex: '\\bRing\\b',
    replacement: 'Pierścień',
  },
  {
    sourceLabel: 'Earrings',
    sourceRegex: '\\bEarrings\\b',
    replacement: 'Kolczyki',
  },
  {
    sourceLabel: 'Figurine',
    sourceRegex: '\\bFigurine\\b',
    replacement: 'Figurka',
  },
  {
    sourceLabel: 'Cards',
    sourceRegex: '\\bCards\\b',
    replacement: 'Karty',
  },
] as const;

type ValidatorTemplatePatternDefinition = {
  key: string;
  buildPayload: () => CreateProductValidationPatternInput;
  matchesExisting: (pattern: ProductValidationPattern) => boolean;
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

const buildUniquePresetLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim() || 'Pattern';
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
  ...(tags && tags.length > 0 ? { tags } : {}),
  ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
});

export const buildNameSegmentCategorySemanticState = (): ProductValidationSemanticState =>
  buildSemanticState({
    presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.inferCategoryFromNameSegment,
    operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
    sourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4,
    targetField: 'categoryId',
    tags: ['template', 'category', 'name_segment'],
    metadata: {
      segmentIndex: 4,
      locale: 'en',
    },
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
    metadata: {
      field,
    },
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
      metadata: {
        placeholder: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
      },
    });

export const buildNameMirrorPolishBaseSemanticState =
  (): ProductValidationSemanticState =>
    buildSemanticState({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorNameLocale,
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
      sourceField: 'name_en',
      targetField: 'name_pl',
      tags: ['sequence', 'name', 'locale_mirror'],
      metadata: {
        sourceLocale: 'en',
        targetLocale: 'pl',
      },
    });

export const buildNameMirrorPolishTranslationSemanticState = ({
  sourceLabel,
  sourceRegex,
  replacement,
}: {
  sourceLabel: string;
  sourceRegex: string;
  replacement: string;
}): ProductValidationSemanticState =>
  buildSemanticState({
    presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.translateNameToken,
    operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
    sourceField: 'name_pl',
    targetField: 'name_pl',
    tags: ['sequence', 'name', 'translation'],
    metadata: {
      sourceLabel,
      sourceRegex,
      replacement,
      targetLocale: 'pl',
    },
  });

const buildNameSegmentDimensionsSemanticState =
  (): ProductValidationSemanticState =>
    buildSemanticState({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateNameContainsDimensionsToken,
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken,
      sourceField: 'name_en',
      targetField: 'name',
      tags: ['template', 'dimensions'],
      metadata: {
        tokenPattern: '\\d+x\\d+',
        locale: 'en',
      },
    });

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

const buildNameSegmentDimensionsTemplatePayload =
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

const buildLatestFieldMirrorRecipe = (field: 'price' | 'stock'): string =>
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

export const buildLatestFieldMirrorPatternPayload = ({
  field,
  label,
  sequence,
}: {
  field: 'price' | 'stock';
  label: string;
  sequence: number;
}): CreateProductValidationPatternInput => ({
  label,
  target: field,
  locale: null,
  regex: '^.*$',
  flags: null,
  message:
    buildProductValidationSemanticOperationPresetMessage(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
      { field }
    ) ??
    (field === 'price'
      ? 'Auto-propose price from the latest created product when current price is empty or 0.'
      : 'Auto-propose stock from the latest created product when current stock is empty or 0.'),
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: buildLatestFieldMirrorRecipe(field),
  replacementFields: [field],
  replacementAppliesToScopes: ['draft_template', 'product_create'],
  postAcceptBehavior: 'revalidate',
  validationDebounceMs: 300,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: false,
  launchEnabled: true,
  launchAppliesToScopes: ['product_create'],
  launchScopeBehavior: 'condition_only',
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'regex',
  launchValue: '^\\s*(?:0+)?\\s*$',
  launchFlags: null,
  appliesToScopes: ['draft_template', 'product_create'],
  semanticState: buildLatestFieldMirrorSemanticState(field),
});

export const buildSkuAutoIncrementSequenceBundle = ({
  existingLabels,
  sequenceGroupId,
  firstSequence,
}: {
  existingLabels: Set<string>;
  sequenceGroupId: string;
  firstSequence: number;
}): ValidatorSemanticSequenceBundle => {
  const labels = new Set(existingLabels);
  const autoLabel = buildUniquePresetLabel(
    buildProductValidationSemanticOperationPresetLabel(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix
    ) ?? 'SKU Auto Increment (Latest Product)',
    labels
  );
  const guardLabel = buildUniquePresetLabel(
    buildProductValidationSemanticOperationPresetLabel(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku
    ) ?? 'SKU Auto Increment Guard',
    labels
  );

  return {
    sequenceGroupId,
    sequenceGroupLabel: SKU_AUTO_INCREMENT_GROUP_LABEL,
    sequenceGroupDebounceMs: 300,
    patterns: [
      {
        label: autoLabel,
        target: 'sku',
        locale: null,
        regex: `^${PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER}$`,
        flags: null,
        message:
          buildProductValidationSemanticOperationPresetMessage(
            PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix
          ) ?? 'Auto-generated SKU proposal from the latest product SKU sequence.',
        severity: 'warning',
        enabled: true,
        replacementEnabled: true,
        replacementAutoApply: true,
        replacementValue: encodeDynamicReplacementRecipe({
          version: 1,
          sourceMode: 'latest_product_field',
          sourceField: 'sku',
          sourceRegex: '(\\d+)$',
          sourceFlags: null,
          sourceMatchGroup: 1,
          mathOperation: 'add',
          mathOperand: 1,
          roundMode: 'none',
          padLength: 3,
          padChar: '0',
          logicOperator: 'none',
          logicOperand: null,
          logicFlags: null,
          logicWhenTrueAction: 'keep',
          logicWhenTrueValue: null,
          logicWhenFalseAction: 'keep',
          logicWhenFalseValue: null,
          resultAssembly: 'source_replace_match',
          targetApply: 'replace_whole_field',
        }),
        replacementFields: ['sku'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel: SKU_AUTO_INCREMENT_GROUP_LABEL,
        sequenceGroupDebounceMs: 300,
        sequence: firstSequence,
        chainMode: 'stop_on_replace',
        maxExecutions: 1,
        passOutputToNext: true,
        launchEnabled: true,
        launchAppliesToScopes: ['draft_template', 'product_create'],
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'equals',
        launchValue: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        launchFlags: null,
        semanticState: buildSkuAutoIncrementLatestSemanticState(),
      },
      {
        label: guardLabel,
        target: 'sku',
        locale: null,
        regex: `^${PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER}$`,
        flags: null,
        message:
          buildProductValidationSemanticOperationPresetMessage(
            PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku,
            { placeholder: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER }
          ) ??
          `SKU is still ${PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER}. Check latest product SKU format or set SKU manually.`,
        severity: 'error',
        enabled: true,
        replacementEnabled: false,
        replacementAutoApply: false,
        replacementValue: null,
        replacementFields: ['sku'],
        postAcceptBehavior: 'revalidate',
        validationDebounceMs: 300,
        sequenceGroupId,
        sequenceGroupLabel: SKU_AUTO_INCREMENT_GROUP_LABEL,
        sequenceGroupDebounceMs: 300,
        sequence: firstSequence + 10,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: false,
        launchEnabled: true,
        launchAppliesToScopes: ['draft_template', 'product_create'],
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'equals',
        launchValue: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        launchFlags: null,
        semanticState: buildSkuAutoIncrementGuardSemanticState(),
      },
    ],
  };
};

export const buildNameMirrorPolishSequenceBundle = ({
  existingLabels,
  sequenceGroupId,
  firstSequence,
}: {
  existingLabels: Set<string>;
  sequenceGroupId: string;
  firstSequence: number;
}): ValidatorSemanticSequenceBundle => {
  const labels = new Set(existingLabels);
  const patterns: CreateProductValidationPatternInput[] = [];
  const mirrorBaseLabel =
    buildProductValidationSemanticOperationPresetLabel(
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
      { sourceLocale: 'EN', targetLocale: 'PL' }
    ) ?? 'Mirror Name EN to Name PL';
  const shouldCreateMirrorPattern = !labels.has(mirrorBaseLabel.toLowerCase());

  if (shouldCreateMirrorPattern) {
    patterns.push({
      label: buildUniquePresetLabel(mirrorBaseLabel, labels),
      target: 'name',
      locale: 'pl',
      regex: '^.*$',
      flags: null,
      message:
        buildProductValidationSemanticOperationPresetMessage(
          PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
          { sourceLocale: 'English', targetLocale: 'Polish' }
        ) ?? 'Mirror English name into Polish name before running Polish replacement rules.',
      severity: 'warning',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'form_field',
        sourceField: 'name_en',
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
      replacementFields: ['name_pl'],
      postAcceptBehavior: 'revalidate',
      validationDebounceMs: 300,
      sequenceGroupId,
      sequenceGroupLabel: NAME_MIRROR_POLISH_GROUP_LABEL,
      sequenceGroupDebounceMs: 300,
      sequence: firstSequence,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      launchEnabled: true,
      launchSourceMode: 'form_field',
      launchSourceField: 'name_en',
      launchOperator: 'is_not_empty',
      launchValue: null,
      launchFlags: null,
      semanticState: buildNameMirrorPolishBaseSemanticState(),
    });
  }

  let offset = 1;
  for (const mapping of POLISH_NAME_MIRROR_CATEGORY_MAPPINGS) {
    const baseLabel =
      buildProductValidationSemanticOperationPresetLabel(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
        {
          targetLocale: 'PL',
          sourceLabel: mapping.sourceLabel,
          replacement: mapping.replacement,
        }
      ) ?? `Name PL: ${mapping.sourceLabel} -> ${mapping.replacement}`;
    if (labels.has(baseLabel.toLowerCase())) continue;
    const label = buildUniquePresetLabel(baseLabel, labels);
    patterns.push({
      label,
      target: 'name',
      locale: 'pl',
      regex: mapping.sourceRegex,
      flags: 'gi',
      message:
        buildProductValidationSemanticOperationPresetMessage(
          PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
          {
            targetLocale: 'Polish',
            sourceLabel: mapping.sourceLabel,
            replacement: mapping.replacement,
          }
        ) ?? `Replace "${mapping.sourceLabel}" with "${mapping.replacement}" in Polish name.`,
      severity: 'warning',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: mapping.replacement,
      replacementFields: ['name_pl'],
      postAcceptBehavior: 'revalidate',
      validationDebounceMs: 300,
      sequenceGroupId,
      sequenceGroupLabel: NAME_MIRROR_POLISH_GROUP_LABEL,
      sequenceGroupDebounceMs: 300,
      sequence: firstSequence + offset * 5,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      launchEnabled: true,
      launchSourceMode: 'form_field',
      launchSourceField: 'name_pl',
      launchOperator: 'is_not_empty',
      launchValue: null,
      launchFlags: null,
      semanticState: buildNameMirrorPolishTranslationSemanticState(mapping),
    });
    offset += 1;
  }

  return {
    sequenceGroupId,
    sequenceGroupLabel: NAME_MIRROR_POLISH_GROUP_LABEL,
    sequenceGroupDebounceMs: 300,
    patterns,
  };
};

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
] as const;

export const getValidatorTemplatePresetByType = (
  type: string
): ValidatorTemplatePresetDefinition | null =>
  VALIDATOR_TEMPLATE_PRESETS.find((preset) => preset.type === type) ?? null;
