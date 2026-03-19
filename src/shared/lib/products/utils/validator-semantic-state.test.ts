import { describe, expect, it } from 'vitest';

import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

import {
  buildProductValidationSemanticAuditRecord,
  describeProductValidationSemanticAuditRecord,
  getLatestProductValidationSemanticAuditRecord,
  getProductValidationSemanticAuditHistory,
  getProductValidationSemanticTransition,
  getProductValidationSemanticState,
  hasProductValidationSemanticPreset,
  matchesProductValidationSemanticOperation,
  normalizeProductValidationSemanticAuditRecord,
  normalizeProductValidationSemanticState,
  serializeProductValidationSemanticState,
} from './validator-semantic-state';

describe('validator semantic state utils', () => {
  it('normalizes semantic state fields, migrates the version, and deduplicates tags', () => {
    expect(
      normalizeProductValidationSemanticState({
        version: 1,
        presetId: '  preset.id  ',
        operation: '  op  ',
        sourceField: '  name_en ',
        targetField: ' price ',
        tags: [' one ', 'one', 'two '],
      })
    ).toEqual({
      version: 2,
      presetId: 'preset.id',
      operation: 'op',
      sourceField: 'name_en',
      targetField: 'price',
      tags: ['one', 'two'],
    });
  });

  it('matches semantic presets from pattern metadata', () => {
    expect(
      hasProductValidationSemanticPreset(
        {
          semanticState: {
            version: 2,
            presetId: 'products.latest-field-mirror.v2',
            operation: 'mirror_latest_field',
          },
        },
        'products.latest-field-mirror.v2'
      )
    ).toBe(true);
  });

  it('migrates legacy semantic ids and exposes matcher helpers', () => {
    const pattern = {
      semanticState: {
        version: 1,
        presetId: 'products.name-segment-dimensions.legacy.v1',
        operation: 'legacy_name_segment_dimensions_template',
        sourceField: 'name_en',
        targetField: 'name',
      },
    };

    expect(getProductValidationSemanticState(pattern)?.operation).toBe(
      'validate_name_contains_dimensions_token'
    );
    expect(
      matchesProductValidationSemanticOperation(pattern, {
        presetId: 'products.name-segment-dimensions.v2',
        operation: 'validate_name_contains_dimensions_token',
        sourceField: 'name_en',
        targetField: 'name',
      })
    ).toBe(true);
  });

  it('infers latest-field mirror semantics from dynamic recipes', () => {
    const pattern = {
      target: 'price',
      replacementEnabled: true,
      replacementValue: encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'latest_product_field',
        sourceField: 'price',
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
    };

    expect(getProductValidationSemanticState(pattern)).toMatchObject({
      presetId: 'products.latest-field-mirror.v2',
      operation: 'mirror_latest_field',
      sourceField: 'price',
      targetField: 'price',
    });
  });

  it('infers dimensions semantics from template-shaped rules', () => {
    const pattern = {
      label: 'Name Segment: Dimensions',
      target: 'length',
      regex: '\\d+x\\d+',
    };

    expect(getProductValidationSemanticState(pattern)).toMatchObject({
      presetId: 'products.name-segment-dimensions.v2',
      operation: 'validate_name_contains_dimensions_token',
      sourceField: 'name_en',
      targetField: 'name',
    });
  });

  it('serializes invalid or missing state as null', () => {
    expect(serializeProductValidationSemanticState(undefined)).toBe('null');
    expect(serializeProductValidationSemanticState({ bad: true })).toBe('null');
  });

  it('classifies semantic transition states for modal compatibility messaging', () => {
    expect(
      getProductValidationSemanticTransition({
        previous: {
          version: 2,
          presetId: 'products.latest-field-mirror.v2',
          operation: 'mirror_latest_field',
          sourceField: 'price',
          targetField: 'price',
        },
        current: {
          version: 2,
          presetId: 'products.name-mirror-polish.base.v2',
          operation: 'mirror_name_locale',
          sourceField: 'name_en',
          targetField: 'name_pl',
        },
      }).kind
    ).toBe('migrated');
    expect(
      getProductValidationSemanticTransition({
        previous: {
          version: 2,
          presetId: 'products.latest-field-mirror.v2',
          operation: 'mirror_latest_field',
        },
        current: null,
      }).kind
    ).toBe('cleared');
    expect(
      getProductValidationSemanticTransition({
        previous: null,
        current: {
          version: 2,
          presetId: 'products.latest-field-mirror.v2',
          operation: 'mirror_latest_field',
        },
      }).kind
    ).toBe('recognized');
  });

  it('builds semantic audit records with normalized transitions', () => {
    expect(
      buildProductValidationSemanticAuditRecord({
        previous: {
          version: 2,
          presetId: 'products.latest-field-mirror.v2',
          operation: 'mirror_latest_field',
          sourceField: 'price',
          targetField: 'price',
        },
        current: {
          version: 2,
          presetId: 'products.name-mirror-polish.base.v2',
          operation: 'mirror_name_locale',
          sourceField: 'name_en',
          targetField: 'name_pl',
        },
        source: 'import',
        trigger: 'update',
        recordedAt: '2026-03-19T10:00:00.000Z',
      })
    ).toMatchObject({
      recordedAt: '2026-03-19T10:00:00.000Z',
      source: 'import',
      trigger: 'update',
      transition: 'migrated',
      previous: {
        operation: 'mirror_latest_field',
      },
      current: {
        operation: 'mirror_name_locale',
      },
    });
  });

  it('normalizes and describes semantic audit records', () => {
    const record = normalizeProductValidationSemanticAuditRecord({
      recordedAt: '2026-03-19T10:00:00.000Z',
      source: 'template',
      trigger: 'update',
      transition: 'cleared',
      previous: {
        version: 2,
        presetId: 'products.latest-field-mirror.v2',
        operation: 'mirror_latest_field',
      },
      current: null,
    });

    expect(record).toMatchObject({
      source: 'template',
      trigger: 'update',
      transition: 'cleared',
    });
    expect(describeProductValidationSemanticAuditRecord(record)).toBe(
      'Converted from "Mirror Latest Field" to a generic rule.'
    );
  });

  it('dedupes semantic audit history and returns the latest record first', () => {
    const latest = {
      recordedAt: '2026-03-19T11:30:00.000Z',
      source: 'manual_save' as const,
      trigger: 'update' as const,
      transition: 'migrated' as const,
      previous: {
        version: 2,
        presetId: 'products.latest-field-mirror.v2',
        operation: 'mirror_latest_field',
      },
      current: {
        version: 2,
        presetId: 'products.name-mirror-polish.base.v2',
        operation: 'mirror_name_locale',
      },
    };

    const history = getProductValidationSemanticAuditHistory({
      semanticAudit: latest,
      semanticAuditHistory: [
        {
          recordedAt: '2026-03-19T09:15:00.000Z',
          source: 'template',
          trigger: 'create',
          transition: 'recognized',
          previous: null,
          current: {
            version: 2,
            presetId: 'products.latest-field-mirror.v2',
            operation: 'mirror_latest_field',
          },
        },
        latest,
      ],
    });

    expect(history).toHaveLength(2);
    expect(history[0]?.transition).toBe('migrated');
    expect(getLatestProductValidationSemanticAuditRecord({
      semanticAudit: latest,
      semanticAuditHistory: history,
    })?.transition).toBe('migrated');
  });

  it('serializes metadata with stable key ordering', () => {
    expect(
      serializeProductValidationSemanticState({
        version: 2,
        presetId: 'preset',
        operation: 'op',
        metadata: {
          z: 1,
          a: {
            y: true,
            x: true,
          },
        },
      })
    ).toBe(
      JSON.stringify({
        version: 2,
        presetId: 'preset',
        operation: 'op',
        sourceField: null,
        targetField: null,
        metadata: {
          a: {
            x: true,
            y: true,
          },
          z: 1,
        },
      })
    );
  });
});
