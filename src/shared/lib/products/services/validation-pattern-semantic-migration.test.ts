import { ObjectId } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import {
  buildProductValidationPatternSemanticMigrationSetPatch,
  getNormalizedProductValidationPatternSemanticFields,
  migrateProductValidationPatternSemanticsToLatest,
} from './validation-pattern-semantic-migration';

describe('validation pattern semantic migration', () => {
  it('normalizes legacy semantic metadata into the latest persisted shape', () => {
    const normalized = getNormalizedProductValidationPatternSemanticFields({
      semanticState: {
        version: 1,
        presetId: 'products.latest-field-mirror.v1',
        operation: 'mirror_latest_field',
        sourceField: 'price',
        targetField: 'price',
        tags: [' legacy ', 'legacy', 'auto_fill '],
      },
      semanticAuditHistory: [
        {
          recordedAt: '2026-03-19T10:00:00.000Z',
          source: 'import',
          trigger: 'update',
          transition: 'recognized',
          previous: null,
          current: {
            version: 1,
            presetId: 'products.latest-field-mirror.v1',
            operation: 'mirror_latest_field',
            sourceField: 'price',
            targetField: 'price',
          },
        },
      ],
    });

    expect(normalized.needsPersistence).toBe(true);
    expect(normalized.semanticState).toEqual({
      version: 2,
      presetId: 'products.latest-field-mirror.v2',
      operation: 'mirror_latest_field',
      sourceField: 'price',
      targetField: 'price',
      tags: ['legacy', 'auto_fill'],
    });
    expect(normalized.semanticAuditHistory[0]?.current).toMatchObject({
      version: 2,
      presetId: 'products.latest-field-mirror.v2',
      operation: 'mirror_latest_field',
    });
  });

  it('builds a stable migration patch and reports no-op current documents', () => {
    const current = buildProductValidationPatternSemanticMigrationSetPatch({
      semanticState: {
        version: 2,
        presetId: 'products.name-segment-category.v2',
        operation: 'infer_category_from_name_segment',
        sourceField: 'nameEnSegment4',
        targetField: 'categoryId',
      },
      semanticAudit: null,
      semanticAuditHistory: [],
    });

    expect(current.normalized.needsPersistence).toBe(false);
    expect(current.setPatch).toEqual({
      semanticState: {
        version: 2,
        presetId: 'products.name-segment-category.v2',
        operation: 'infer_category_from_name_segment',
        sourceField: 'nameEnSegment4',
        targetField: 'categoryId',
      },
      semanticAudit: null,
      semanticAuditHistory: [],
    });
  });

  it('supports a dry-run full-collection migration without writing', async () => {
    const docs = [
      {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        semanticState: {
          version: 1,
          presetId: 'products.latest-field-mirror.v1',
          operation: 'mirror_latest_field',
          sourceField: 'stock',
          targetField: 'stock',
        },
      },
    ];
    const updateOne = vi.fn();
    const find = vi.fn(() => ({
      async *[Symbol.asyncIterator]() {
        for (const doc of docs) yield doc;
      },
    }));
    const collection = { find, updateOne };
    const db = {
      collection: vi.fn(() => collection),
    } as never;

    const summary = await migrateProductValidationPatternSemanticsToLatest({
      dryRun: true,
      db,
    });

    expect(find).toHaveBeenCalledOnce();
    expect(updateOne).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      mode: 'dry-run',
      patternFilter: 'all',
      scanned: 1,
      changed: 1,
      writesAttempted: 0,
      writesApplied: 0,
      writesFailed: 0,
      migratedPatternIds: ['507f1f77bcf86cd799439011'],
    });
  });
});
