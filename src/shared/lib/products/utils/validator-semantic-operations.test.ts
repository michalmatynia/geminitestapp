import { describe, expect, it } from 'vitest';

import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

import {
  PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
  allowsProductValidationSemanticOperationExecutionWithoutRegexMatch,
  buildProductValidationSemanticOperationPresetLabel,
  buildProductValidationSemanticOperationPresetMessage,
  getProductValidationSemanticOperationDefinition,
  getProductValidationSemanticOperationUiMetadata,
  inferProductValidationSemanticStateFromPattern,
  migrateProductValidationSemanticOperationIdToLatest,
  migrateProductValidationSemanticPresetIdToLatest,
  reconcileProductValidationSemanticState,
} from './validator-semantic-operations';

describe('validator semantic operations', () => {
  it('migrates legacy operation and preset ids to the latest canonical ids', () => {
    expect(
      migrateProductValidationSemanticOperationIdToLatest(
        'legacy_name_segment_dimensions_template'
      )
    ).toBe(PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken);
    expect(
      migrateProductValidationSemanticPresetIdToLatest('products.latest-field-mirror.v1')
    ).toBe(PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField);
  });

  it('exposes regex-optional execution behavior through the operation registry', () => {
    expect(
      allowsProductValidationSemanticOperationExecutionWithoutRegexMatch(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField
      )
    ).toBe(true);
    expect(
      allowsProductValidationSemanticOperationExecutionWithoutRegexMatch(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken
      )
    ).toBe(false);
  });

  it('infers latest-field mirror semantics from replacement recipes', () => {
    expect(
      inferProductValidationSemanticStateFromPattern({
        target: 'stock',
        replacementEnabled: true,
        replacementValue: encodeDynamicReplacementRecipe({
          version: 1,
          sourceMode: 'latest_product_field',
          sourceField: 'stock',
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
      })
    ).toMatchObject({
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
      sourceField: 'stock',
      targetField: 'stock',
    });
  });

  it('returns definitions for known canonical operations', () => {
    expect(
      getProductValidationSemanticOperationDefinition(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken
      )
    ).toMatchObject({
      id: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken,
      allowExecutionWithoutRegexMatch: false,
    });
  });

  it('infers semantic state from strongly-typed preset pattern shapes', () => {
    expect(
      inferProductValidationSemanticStateFromPattern({
        target: 'category',
        replacementEnabled: true,
        replacementValue: encodeDynamicReplacementRecipe({
          version: 1,
          sourceMode: 'form_field',
          sourceField: 'nameEnSegment4',
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
      })
    ).toMatchObject({
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment,
      sourceField: 'nameEnSegment4',
      targetField: 'categoryId',
    });
  });

  it('reconciles preset semantics when a user edits the pattern into another semantic shape', () => {
    expect(
      reconcileProductValidationSemanticState({
        currentSemanticState: {
          version: 2,
          presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField,
          operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
          sourceField: 'price',
          targetField: 'price',
        },
        pattern: {
          target: 'name',
          locale: 'pl',
          replacementEnabled: true,
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
        },
      })
    ).toMatchObject({
      operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorNameLocale,
      sourceField: 'name_en',
      targetField: 'name_pl',
    });
  });

  it('clears semantic state when a user edits a preset-derived pattern into a generic rule', () => {
    expect(
      reconcileProductValidationSemanticState({
        currentSemanticState: {
          version: 2,
          presetId: PRODUCT_VALIDATION_SEMANTIC_PRESET_IDS.mirrorLatestField,
          operation: PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
          sourceField: 'price',
          targetField: 'price',
        },
        pattern: {
          target: 'name',
          locale: 'en',
          regex: 'sale',
          replacementEnabled: true,
          replacementValue: 'discounted',
        },
      })
    ).toBeNull();
  });

  it('exposes shared ui metadata and preset copy builders', () => {
    expect(
      getProductValidationSemanticOperationUiMetadata(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.inferCategoryFromNameSegment
      )
    ).toMatchObject({
      title: 'Name Segment #4 -> Category',
      categoryFixturesLabel: 'Category Fixtures',
    });
    expect(
      buildProductValidationSemanticOperationPresetLabel(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.mirrorLatestField,
        { field: 'stock' }
      )
    ).toBe('Stock from latest product');
    expect(
      buildProductValidationSemanticOperationPresetMessage(
        PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.translateNameToken,
        {
          targetLocale: 'Polish',
          sourceLabel: 'Keychain',
          replacement: 'Brelok',
        }
      )
    ).toBe('Replace "Keychain" with "Brelok" in Polish name.');
  });
});
