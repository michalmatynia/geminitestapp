import { describe, expect, it } from 'vitest';

import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

import {
  PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS,
  buildLatestFieldMirrorPatternPayload,
  buildNameMirrorPolishSequenceBundle,
  buildNameSegmentCategoryTemplatePayload,
  buildStarGaterProducerTemplatePayload,
  buildSkuAutoIncrementSequenceBundle,
  getValidatorTemplatePresetByType,
} from './validatorSemanticPresets';

describe('validator semantic presets', () => {
  it('builds category template payloads with explicit semantic state', () => {
    const payload = buildNameSegmentCategoryTemplatePayload();

    expect(payload.label).toBe('Name Segment #4 -> Category');
    expect(payload.message).toBe('Infer category from Name EN segment #4 when the current category differs.');
    expect(payload.semanticState).toMatchObject({
      version: 2,
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.inferCategoryFromNameSegment,
      operation: 'infer_category_from_name_segment',
      sourceField: 'nameEnSegment4',
      targetField: 'categoryId',
    });
  });

  it('builds latest-field mirror patterns with semantic metadata and a dynamic recipe', () => {
    const payload = buildLatestFieldMirrorPatternPayload({
      field: 'price',
      label: 'Price from latest product',
      sequence: 10,
    });
    const recipe = parseDynamicReplacementRecipe(payload.replacementValue);

    expect(payload.semanticState).toMatchObject({
      version: 2,
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField,
      operation: 'mirror_latest_field',
      sourceField: 'price',
      targetField: 'price',
    });
    expect(recipe).toMatchObject({
      sourceMode: 'latest_product_field',
      sourceField: 'price',
      targetApply: 'replace_whole_field',
    });
    expect(payload.message).toBe(
      'Auto-propose price from the latest created product when current price is empty or 0.'
    );
  });

  it('resolves template presets by route type', () => {
    expect(getValidatorTemplatePresetByType('name-segment-category')?.patterns).toHaveLength(1);
    expect(getValidatorTemplatePresetByType('name-segment-dimensions')?.patterns).toHaveLength(1);
    expect(getValidatorTemplatePresetByType('producer-stargater')?.patterns).toHaveLength(1);
    expect(getValidatorTemplatePresetByType('missing')).toBeNull();
  });

  it('builds the StarGater producer template with producer replacement wiring', () => {
    const payload = buildStarGaterProducerTemplatePayload();

    expect(payload).toMatchObject({
      label: 'Producer -> StarGater.net',
      target: 'producer',
      regex: '^.*$',
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: 'StarGater.net',
      replacementFields: ['producerIds'],
      appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    });
  });

  it('builds the SKU auto-increment bundle from semantic preset builders', () => {
    const bundle = buildSkuAutoIncrementSequenceBundle({
      existingLabels: new Set(),
      sequenceGroupId: 'seq-sku',
      firstSequence: 10,
    });

    expect(bundle.sequenceGroupLabel).toBe('SKU Auto Increment');
    expect(bundle.patterns).toHaveLength(2);
    expect(bundle.patterns[0]?.semanticState).toMatchObject({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.incrementLatestSkuSuffix,
      operation: 'increment_latest_sku_suffix',
    });
    expect(bundle.patterns[1]?.semanticState).toMatchObject({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.guardPlaceholderSku,
      operation: 'guard_placeholder_sku',
    });
  });

  it('builds the Polish name mirror bundle and skips patterns whose labels already exist', () => {
    const bundle = buildNameMirrorPolishSequenceBundle({
      existingLabels: new Set([
        'mirror name en to name pl',
        'name pl: keychain -> brelok',
      ]),
      sequenceGroupId: 'seq-name-pl',
      firstSequence: 10,
    });

    expect(bundle.sequenceGroupLabel).toBe('Name EN -> PL Mirror');
    expect(bundle.patterns).toHaveLength(6);
    expect(bundle.patterns[0]?.semanticState).toMatchObject({
      presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.translateNameToken,
      operation: 'translate_name_token',
    });
    expect(bundle.patterns.some((pattern) => pattern.label === 'Mirror Name EN to Name PL')).toBe(
      false
    );
    expect(bundle.patterns.some((pattern) => pattern.label === 'Name PL: Keychain -> Brelok')).toBe(
      false
    );
  });
});
