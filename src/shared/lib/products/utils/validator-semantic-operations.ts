import type {
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products';
import { LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION } from '@/shared/contracts/products';
import { areValidatorCategoryLabelsEquivalent } from '@/shared/lib/products/utils/validator-category-labels';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

export const PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS = {
  inferCategoryFromNameSegment: 'infer_category_from_name_segment',
  mirrorLatestField: 'mirror_latest_field',
  incrementLatestSkuSuffix: 'increment_latest_sku_suffix',
  guardPlaceholderSku: 'guard_placeholder_sku',
  mirrorNameLocale: 'mirror_name_locale',
  translateNameToken: 'translate_name_token',
  validateRepeatedWhitespace: 'validate_repeated_whitespace',
  validateNameContainsDimensionsToken: 'validate_name_contains_dimensions_token',
} as const;

export type ProductValidationSemanticOperationId =
  (typeof PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS)[keyof typeof PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS];

export type ProductValidationSemanticOperationCopyContext = {
  field?: 'price' | 'stock';
  segmentIndex?: number;
  sourceLabel?: string;
  replacement?: string;
  sourceLocale?: string;
  targetLocale?: string;
  placeholder?: string;
};

export type ProductValidationSemanticOperationUiMetadata = {
  title: string;
  description: string;
  labelPlaceholder?: string;
  messagePlaceholder?: string;
  simulatorDescription?: string;
  categoryFixturesLabel?: string;
  categoryFixturesDescription?: string;
  categoryFixturesPlaceholder?: string;
};

export type ProductValidationSemanticRuntimeBehaviorContext = {
  fieldName: string;
  values: Record<string, unknown>;
  replacementValue: string | null | undefined;
};

type ProductValidationSemanticPatternShape = Partial<
  Pick<
    ProductValidationPattern,
    | 'label'
    | 'target'
    | 'locale'
    | 'regex'
    | 'replacementEnabled'
    | 'replacementValue'
    | 'launchEnabled'
    | 'launchSourceMode'
    | 'launchSourceField'
    | 'launchOperator'
    | 'launchValue'
  >
>;

export const PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS = {
  inferCategoryFromNameSegment: 'products.name-segment-category.v2',
  mirrorLatestField: 'products.latest-field-mirror.v2',
  incrementLatestSkuSuffix: 'products.sku-auto-increment.latest.v2',
  guardPlaceholderSku: 'products.sku-auto-increment.guard.v2',
  mirrorNameLocale: 'products.name-mirror-polish.base.v2',
  translateNameToken: 'products.name-mirror-polish.translation.v2',
  validateRepeatedWhitespace: 'products.repeated-whitespace.v2',
  validateNameContainsDimensionsToken: 'products.name-segment-dimensions.v2',
} as const;

const LEGACY_PRODUCT_VALIDATION_SEMANTIC_OPERATION_ID_MIGRATIONS: Record<
  string,
  ProductValidationSemanticOperationId
> = {
  legacy_name_segment_dimensions_template:
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken,
};

const LEGACY_PRODUCT_VALIDATION_SEMANTIC_PRESET_ID_MIGRATIONS: Record<string, string> = {
  'products.name-segment-category.v1':
    PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.inferCategoryFromNameSegment,
  'products.latest-field-mirror.v1': PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField,
  'products.sku-auto-increment.latest.v1':
    PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.incrementLatestSkuSuffix,
  'products.sku-auto-increment.guard.v1':
    PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.guardPlaceholderSku,
  'products.name-mirror-polish.base.v1':
    PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorNameLocale,
  'products.name-mirror-polish.translation.v1':
    PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.translateNameToken,
  'products.repeated-whitespace.v1':
    PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateRepeatedWhitespace,
  'products.name-segment-dimensions.legacy.v1':
    PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateNameContainsDimensionsToken,
};

type ProductValidationSemanticOperationDefinition = {
  id: ProductValidationSemanticOperationId;
  allowExecutionWithoutRegexMatch: boolean;
  ui: ProductValidationSemanticOperationUiMetadata;
  isNoopReplacement?: (context: ProductValidationSemanticRuntimeBehaviorContext) => boolean;
  buildPresetLabel?: (context?: ProductValidationSemanticOperationCopyContext) => string | null;
  buildPresetMessage?: (context?: ProductValidationSemanticOperationCopyContext) => string | null;
  reconcileSemanticState?: (args: {
    pattern: ProductValidationSemanticPatternShape;
    currentSemanticState: ProductValidationSemanticState | null;
  }) => ProductValidationSemanticState | null;
  inferSemanticStateFromPattern?: (
    pattern: ProductValidationSemanticPatternShape
  ) => ProductValidationSemanticState | null;
};

const parseReplacementRecipe = (pattern: ProductValidationSemanticPatternShape) =>
  typeof pattern.replacementValue === 'string' && pattern.replacementValue.trim().length > 0
    ? parseDynamicReplacementRecipe(pattern.replacementValue)
    : null;

const parseLocaleCodeFromFieldName = (fieldName: string | null | undefined): string | null => {
  if (typeof fieldName !== 'string') return null;
  const match = /_(en|pl|de)$/i.exec(fieldName.trim());
  return match?.[1]?.toLowerCase() ?? null;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const buildSemanticState = ({
  currentSemanticState,
  presetId,
  operation,
  sourceField,
  targetField,
  tags,
  metadata,
}: {
  currentSemanticState: ProductValidationSemanticState | null;
  presetId: string;
  operation: ProductValidationSemanticOperationId;
  sourceField: string | null;
  targetField: string | null;
  tags: string[];
  metadata?: Record<string, unknown>;
}): ProductValidationSemanticState => ({
  version: LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION,
  presetId:
    migrateProductValidationSemanticPresetIdToLatest(currentSemanticState?.presetId) ?? presetId,
  operation,
  sourceField,
  targetField,
  tags: currentSemanticState?.tags?.length ? currentSemanticState.tags : tags,
  ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
});

const PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS: Record<
  ProductValidationSemanticOperationId,
  ProductValidationSemanticOperationDefinition
> = {
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
    allowExecutionWithoutRegexMatch: true,
    ui: {
      title: 'Name Segment #4 -> Category',
      description:
        'Infers product category from Name EN segment #4 and proposes a category change when the current category differs.',
      labelPlaceholder: 'Name Segment #4 -> Category',
      messagePlaceholder:
        'Infer category from Name EN segment #4 when the current category differs.',
      simulatorDescription:
        'Preview category inference from Name EN segment #4 without touching live product data.',
      categoryFixturesLabel: 'Category Fixtures',
      categoryFixturesDescription:
        'Optional. One category per line: `id|name|name_en|name_pl|name_de`.',
      categoryFixturesPlaceholder: 'category-1|Keychains|Keychains|Breloki|Schlusselanhanger',
    },
    isNoopReplacement: ({ fieldName, values, replacementValue }) => {
      if (fieldName !== 'categoryId') return false;
      const currentCategoryLabel = toStringValue(values['categoryName']) ?? '';
      if (!currentCategoryLabel.trim()) return false;
      return areValidatorCategoryLabelsEquivalent(currentCategoryLabel, replacementValue ?? '');
    },
    buildPresetLabel: (context) => `Name Segment #${context?.segmentIndex ?? 4} -> Category`,
    buildPresetMessage: (context) =>
      `Infer category from Name EN segment #${context?.segmentIndex ?? 4} when the current category differs.`,
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if (pattern.target !== 'category' || !pattern.replacementEnabled) return null;
      const recipe = parseReplacementRecipe(pattern);
      if (
        recipe?.sourceMode !== 'form_field' ||
        recipe.sourceField == null ||
        !/^nameEnSegment\d+$/u.test(recipe.sourceField) ||
        recipe.targetApply !== 'replace_whole_field'
      ) {
        return null;
      }
      const segmentIndex = Number(recipe.sourceField.replace('nameEnSegment', ''));
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.inferCategoryFromNameSegment,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
        sourceField: recipe.sourceField,
        targetField: 'categoryId',
        tags: ['template', 'category', 'name_segment'],
        metadata: {
          segmentIndex: Number.isFinite(segmentIndex) ? segmentIndex : 4,
          locale: 'en',
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
    allowExecutionWithoutRegexMatch: true,
    ui: {
      title: 'Mirror Latest Field',
      description:
        'Mirrors a field such as price or stock from the latest created product into the current form.',
      labelPlaceholder: 'Price from latest product',
      messagePlaceholder: 'Use latest price from the newest product when current price is empty.',
      simulatorDescription:
        'Preview how the latest created product value would be mirrored into the current field.',
    },
    buildPresetLabel: (context) =>
      context?.field === 'stock' ? 'Stock from latest product' : 'Price from latest product',
    buildPresetMessage: (context) =>
      context?.field === 'stock'
        ? 'Auto-propose stock from the latest created product when current stock is empty or 0.'
        : 'Auto-propose price from the latest created product when current price is empty or 0.',
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if ((pattern.target !== 'price' && pattern.target !== 'stock') || !pattern.replacementEnabled) {
        return null;
      }
      const recipe = parseReplacementRecipe(pattern);
      if (
        recipe?.sourceMode !== 'latest_product_field' ||
        recipe.sourceField !== pattern.target ||
        recipe.targetApply !== 'replace_whole_field'
      ) {
        return null;
      }
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
        sourceField: pattern.target,
        targetField: pattern.target,
        tags: ['sequence', 'latest_product', 'auto_fill'],
        metadata: {
          field: pattern.target,
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix,
    allowExecutionWithoutRegexMatch: false,
    ui: {
      title: 'Increment Latest SKU Suffix',
      description:
        'Builds a new SKU by reading the latest product SKU suffix and incrementing it.',
      labelPlaceholder: 'SKU Auto Increment (Latest Product)',
      messagePlaceholder: 'Auto-generated SKU proposal from the latest product SKU sequence.',
      simulatorDescription:
        'Preview the next SKU candidate produced from the latest product sequence.',
    },
    buildPresetLabel: () => 'SKU Auto Increment (Latest Product)',
    buildPresetMessage: () => 'Auto-generated SKU proposal from the latest product SKU sequence.',
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if (pattern.target !== 'sku' || !pattern.replacementEnabled) return null;
      const recipe = parseReplacementRecipe(pattern);
      if (
        recipe?.sourceMode !== 'latest_product_field' ||
        recipe.sourceField !== 'sku' ||
        recipe.mathOperation !== 'add' ||
        recipe.targetApply !== 'replace_whole_field' ||
        recipe.resultAssembly !== 'source_replace_match'
      ) {
        return null;
      }
      const placeholder =
        (typeof pattern.launchValue === 'string' && pattern.launchValue.trim()) ||
        (typeof currentSemanticState?.metadata?.['placeholder'] === 'string'
          ? currentSemanticState.metadata['placeholder']
          : 'KEYCHA000');
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.incrementLatestSkuSuffix,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix,
        sourceField: 'sku',
        targetField: 'sku',
        tags: ['sequence', 'sku', 'auto_fill'],
        metadata: {
          placeholder,
          padLength: recipe.padLength ?? 3,
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.incrementLatestSkuSuffix
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku,
    allowExecutionWithoutRegexMatch: false,
    ui: {
      title: 'Guard Placeholder SKU',
      description:
        'Warns when the SKU placeholder is still present after the auto-increment sequence.',
      labelPlaceholder: 'SKU Auto Increment Guard',
      messagePlaceholder:
        'SKU is still KEYCHA000. Check latest product SKU format or set SKU manually.',
      simulatorDescription:
        'Preview the guard rule that blocks leaving the placeholder SKU unchanged.',
    },
    buildPresetLabel: () => 'SKU Auto Increment Guard',
    buildPresetMessage: (context) =>
      `SKU is still ${context?.placeholder ?? 'KEYCHA000'}. Check latest product SKU format or set SKU manually.`,
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if (pattern.target !== 'sku' || pattern.replacementEnabled) return null;
      if (
        pattern.launchEnabled !== true ||
        pattern.launchSourceMode !== 'current_field' ||
        pattern.launchOperator !== 'equals' ||
        typeof pattern.launchValue !== 'string' ||
        pattern.launchValue.trim().length === 0
      ) {
        return null;
      }
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.guardPlaceholderSku,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku,
        sourceField: 'sku',
        targetField: 'sku',
        tags: ['sequence', 'sku', 'guard'],
        metadata: {
          placeholder: pattern.launchValue.trim(),
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.guardPlaceholderSku
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
    allowExecutionWithoutRegexMatch: false,
    ui: {
      title: 'Mirror Name Locale',
      description:
        'Copies one localized product name into another locale before translation-specific steps run.',
      labelPlaceholder: 'Mirror Name EN to Name PL',
      messagePlaceholder:
        'Mirror English name into Polish name before running Polish replacement rules.',
      simulatorDescription:
        'Preview how one localized product name is copied into another locale.',
    },
    buildPresetLabel: (context) =>
      `Mirror Name ${(context?.sourceLocale ?? 'EN').toUpperCase()} to Name ${(context?.targetLocale ?? 'PL').toUpperCase()}`,
    buildPresetMessage: (context) =>
      `Mirror ${(context?.sourceLocale ?? 'English')} name into ${(context?.targetLocale ?? 'Polish')} name before running locale replacement rules.`,
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if (pattern.target !== 'name') return null;
      const recipe = parseReplacementRecipe(pattern);
      if (
        recipe?.sourceMode !== 'form_field' ||
        recipe.sourceField == null ||
        parseLocaleCodeFromFieldName(recipe.sourceField) == null ||
        recipe.targetApply !== 'replace_whole_field' ||
        typeof pattern.locale !== 'string' ||
        pattern.locale.trim().length === 0
      ) {
        return null;
      }
      const sourceLocale = parseLocaleCodeFromFieldName(recipe.sourceField);
      const targetLocale = pattern.locale.trim().toLowerCase();
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorNameLocale,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
        sourceField: recipe.sourceField,
        targetField: `name_${targetLocale}`,
        tags: ['sequence', 'name', 'locale_mirror'],
        metadata: {
          sourceLocale,
          targetLocale,
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
    allowExecutionWithoutRegexMatch: false,
    ui: {
      title: 'Translate Name Token',
      description:
        'Replaces a token inside the localized product name with its translated counterpart.',
      labelPlaceholder: 'Name PL: Keychain -> Brelok',
      messagePlaceholder: 'Replace "Keychain" with "Brelok" in Polish name.',
      simulatorDescription:
        'Preview token-level translation rules against the localized product name.',
    },
    buildPresetLabel: (context) =>
      `Name ${(context?.targetLocale ?? 'PL').toUpperCase()}: ${context?.sourceLabel ?? 'Token'} -> ${context?.replacement ?? 'Value'}`,
    buildPresetMessage: (context) =>
      `Replace "${context?.sourceLabel ?? 'token'}" with "${context?.replacement ?? 'value'}" in ${(context?.targetLocale ?? 'Polish')} name.`,
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if (
        pattern.target !== 'name' ||
        !pattern.replacementEnabled ||
        typeof pattern.replacementValue !== 'string' ||
        pattern.replacementValue.length === 0 ||
        parseDynamicReplacementRecipe(pattern.replacementValue) != null ||
        typeof pattern.locale !== 'string' ||
        pattern.locale.trim().length === 0 ||
        typeof pattern.regex !== 'string' ||
        pattern.regex.trim().length === 0
      ) {
        return null;
      }
      const currentSourceLabel =
        typeof currentSemanticState?.metadata?.['sourceLabel'] === 'string'
          ? currentSemanticState.metadata['sourceLabel']
          : pattern.regex.trim();
      const targetLocale = pattern.locale.trim().toLowerCase();
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.translateNameToken,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
        sourceField: `name_${targetLocale}`,
        targetField: `name_${targetLocale}`,
        tags: ['sequence', 'name', 'translation'],
        metadata: {
          sourceLabel: currentSourceLabel,
          sourceRegex: pattern.regex.trim(),
          replacement: pattern.replacementValue,
          targetLocale,
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateRepeatedWhitespace]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateRepeatedWhitespace,
    allowExecutionWithoutRegexMatch: false,
    ui: {
      title: 'Repeated Whitespace',
      description:
        'Detects repeated whitespace runs in text fields such as product descriptions.',
      labelPlaceholder: 'Double spaces in Description',
      messagePlaceholder: 'Description contains repeated whitespace.',
      simulatorDescription:
        'Preview repeated-whitespace validation against the current field value.',
    },
    buildPresetLabel: (context) =>
      `Repeated whitespace in ${context?.targetLocale ?? 'field'}`,
    buildPresetMessage: () => 'Field contains repeated whitespace.',
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if (
        (pattern.target !== 'name' && pattern.target !== 'description') ||
        typeof pattern.regex !== 'string' ||
        pattern.regex.trim() !== '\\s{2,}' ||
        pattern.replacementEnabled
      ) {
        return null;
      }
      const targetField =
        pattern.target === 'description'
          ? `description${pattern.locale ? `_${pattern.locale.trim().toLowerCase()}` : ''}`
          : `name${pattern.locale ? `_${pattern.locale.trim().toLowerCase()}` : ''}`;
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateRepeatedWhitespace,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateRepeatedWhitespace,
        sourceField: targetField,
        targetField: targetField,
        tags: ['validation', 'whitespace'],
        metadata: {
          regex: '\\s{2,}',
          target: pattern.target,
          locale: pattern.locale?.trim().toLowerCase() || null,
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateRepeatedWhitespace
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
  [PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken]: {
    id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken,
    allowExecutionWithoutRegexMatch: false,
    ui: {
      title: 'Name Segment: Dimensions',
      description: 'Checks that the product name contains a dimensions token such as `10x20`.',
      labelPlaceholder: 'Name Segment: Dimensions',
      messagePlaceholder: 'Product name must contain dimensions.',
      simulatorDescription:
        'Preview the dimensions-token validator against the current product name.',
    },
    buildPresetLabel: () => 'Name Segment: Dimensions',
    buildPresetMessage: () => 'Product name must contain dimensions.',
    reconcileSemanticState: ({ pattern, currentSemanticState }) => {
      if (
        (pattern.target !== 'name' &&
          pattern.target !== 'length' &&
          pattern.target !== 'size_length') ||
        typeof pattern.regex !== 'string' ||
        pattern.regex.trim().length === 0
      ) {
        return null;
      }
      return buildSemanticState({
        currentSemanticState,
        presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.validateNameContainsDimensionsToken,
        operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken,
        sourceField: 'name_en',
        targetField: 'name',
        tags: ['template', 'dimensions'],
        metadata: {
          tokenPattern: pattern.regex.trim(),
          locale: 'en',
        },
      });
    },
    inferSemanticStateFromPattern: (pattern) =>
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken
      ].reconcileSemanticState?.({ pattern, currentSemanticState: null }) ?? null,
  },
};

export const migrateProductValidationSemanticOperationIdToLatest = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return LEGACY_PRODUCT_VALIDATION_SEMANTIC_OPERATION_ID_MIGRATIONS[trimmed] ?? trimmed;
};

export const migrateProductValidationSemanticPresetIdToLatest = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return LEGACY_PRODUCT_VALIDATION_SEMANTIC_PRESET_ID_MIGRATIONS[trimmed] ?? trimmed;
};

export const getProductValidationSemanticOperationDefinition = (
  value: string | null | undefined
): ProductValidationSemanticOperationDefinition | null => {
  const normalized = migrateProductValidationSemanticOperationIdToLatest(value);
  if (!normalized) return null;
  return (
    PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS[
      normalized as ProductValidationSemanticOperationId
    ] ?? null
  );
};

export const inferProductValidationSemanticStateFromPattern = (
  pattern: ProductValidationSemanticPatternShape
): ProductValidationSemanticState | null => {
  for (const definition of Object.values(PRODUCT_VALIDATION_SEMANTIC_OPERATION_DEFINITIONS)) {
    const inferred = definition.inferSemanticStateFromPattern?.(pattern);
    if (inferred) return inferred;
  }
  return null;
};

export const reconcileProductValidationSemanticState = ({
  currentSemanticState,
  pattern,
}: {
  currentSemanticState: ProductValidationSemanticState | null;
  pattern: ProductValidationSemanticPatternShape;
}): ProductValidationSemanticState | null => {
  const normalizedCurrent =
    currentSemanticState && typeof currentSemanticState.operation === 'string'
      ? {
          ...currentSemanticState,
          operation: migrateProductValidationSemanticOperationIdToLatest(
            currentSemanticState.operation
          ) as ProductValidationSemanticOperationId,
          presetId: migrateProductValidationSemanticPresetIdToLatest(
            currentSemanticState.presetId
          ),
        }
      : null;
  const reconciledCurrent = normalizedCurrent
    ? getProductValidationSemanticOperationDefinition(normalizedCurrent.operation)?.reconcileSemanticState?.({
        pattern,
        currentSemanticState: normalizedCurrent,
      }) ?? null
    : null;
  if (reconciledCurrent) return reconciledCurrent;
  return inferProductValidationSemanticStateFromPattern(pattern);
};

export const allowsProductValidationSemanticOperationExecutionWithoutRegexMatch = (
  value: string | null | undefined
): boolean => Boolean(getProductValidationSemanticOperationDefinition(value)?.allowExecutionWithoutRegexMatch);

export const isProductValidationSemanticOperationNoopReplacement = ({
  value,
  context,
}: {
  value: string | null | undefined;
  context: ProductValidationSemanticRuntimeBehaviorContext;
}): boolean => Boolean(getProductValidationSemanticOperationDefinition(value)?.isNoopReplacement?.(context));

export const getProductValidationSemanticOperationUiMetadata = (
  value: string | null | undefined
): ProductValidationSemanticOperationUiMetadata | null =>
  getProductValidationSemanticOperationDefinition(value)?.ui ?? null;

export const buildProductValidationSemanticOperationPresetLabel = (
  value: string | null | undefined,
  context?: ProductValidationSemanticOperationCopyContext
): string | null => getProductValidationSemanticOperationDefinition(value)?.buildPresetLabel?.(context) ?? null;

export const buildProductValidationSemanticOperationPresetMessage = (
  value: string | null | undefined,
  context?: ProductValidationSemanticOperationCopyContext
): string | null =>
  getProductValidationSemanticOperationDefinition(value)?.buildPresetMessage?.(context) ?? null;
