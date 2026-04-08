import { describe, expect, it } from 'vitest';

import {
  baseMarketExclusionFlatFeatureRecord,
  baseMarketExclusionGroupedOptionObjectsRecord,
  baseMarketExclusionGroupedValuesRecord,
  baseMarketExclusionNestedFeatureRecord,
} from './base-import-fixtures';
import {
  collectCustomFieldImportDiagnostics,
  mapBaseProduct,
} from './base-mapper';

describe('mapBaseProduct', () => {
  describe('auto-extraction of producers and tags', () => {
    it('auto-extracts producerIds from record.producers array using producerId field', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        sku: 'TEST-SKU',
        producers: [
          { producerId: 'prod-1', name: 'Brand A' },
          { producerId: 'prod-2', name: 'Brand B' },
        ],
      };

      const result = mapBaseProduct(record, []) as typeof result & {
        producerIds?: string[];
      };

      expect(result.producerIds).toEqual(['prod-1', 'prod-2']);
    });

    it('auto-extracts producerIds from record.producers using producer_id field', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        producers: [{ producer_id: 'mfr-99' }],
      };

      const result = mapBaseProduct(record, []) as typeof result & {
        producerIds?: string[];
      };

      expect(result.producerIds).toEqual(['mfr-99']);
    });

    it('auto-extracts producerIds from record.manufacturers array', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        manufacturers: [
          { manufacturerId: 'man-1' },
          { id: 'man-2' },
        ],
      };

      const result = mapBaseProduct(record, []) as typeof result & {
        producerIds?: string[];
      };

      expect(result.producerIds).toEqual(['man-1', 'man-2']);
    });

    it('auto-extracts tagIds from record.tags array using tagId field', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        tags: [
          { tagId: 'tag-a' },
          { tagId: 'tag-b' },
        ],
      };

      const result = mapBaseProduct(record, []) as typeof result & {
        tagIds?: string[];
      };

      expect(result.tagIds).toEqual(['tag-a', 'tag-b']);
    });

    it('auto-extracts tagIds from record.tags using id field', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        tags: [{ id: 'tag-x' }, { id: 'tag-y' }],
      };

      const result = mapBaseProduct(record, []) as typeof result & {
        tagIds?: string[];
      };

      expect(result.tagIds).toEqual(['tag-x', 'tag-y']);
    });

    it('auto-extracts tagIds from record.labels array', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        labels: [{ id: 'lbl-1' }],
      };

      const result = mapBaseProduct(record, []) as typeof result & {
        tagIds?: string[];
      };

      expect(result.tagIds).toEqual(['lbl-1']);
    });

    it('does not set producerIds when record.producers is empty', () => {
      const record = { product_id: 'p1', name: 'Test Product', producers: [] };

      const result = mapBaseProduct(record, []) as typeof result & {
        producerIds?: string[];
      };

      expect(result.producerIds).toBeUndefined();
    });

    it('does not set tagIds when record has no tags', () => {
      const record = { product_id: 'p1', name: 'Test Product' };

      const result = mapBaseProduct(record, []) as typeof result & {
        tagIds?: string[];
      };

      expect(result.tagIds).toBeUndefined();
    });

    it('deduplicates auto-extracted producerIds', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        producers: [
          { producerId: 'prod-1' },
          { producerId: 'prod-1' }, // duplicate
          { producerId: 'prod-2' },
        ],
      };

      const result = mapBaseProduct(record, []) as typeof result & {
        producerIds?: string[];
      };

      expect(result.producerIds).toEqual(['prod-1', 'prod-2']);
    });

    it('template mapping for producers overrides auto-extracted producerIds', () => {
      const record = {
        product_id: 'p1',
        name: 'Test Product',
        producers: [{ producerId: 'auto-producer' }],
        custom_producer_field: 'template-producer',
      };

      const result = mapBaseProduct(
        record,
        [{ sourceKey: 'custom_producer_field', targetField: 'producerIds' }]
      ) as typeof result & { producerIds?: string[] };

      // Template mapping should override auto-extracted value
      expect(result.producerIds).toEqual(['template-producer']);
    });
  });

  describe('standard field mapping', () => {
    it('maps name_pl and name_en from record', () => {
      const record = {
        product_id: 'p1',
        name: 'Produkt testowy',
        name_en: 'Test product',
        sku: 'SKU-1',
        price: 4999,
      };

      const result = mapBaseProduct(record, []);

      expect(result.name_pl).toBe('Produkt testowy');
      expect(result.name_en).toBe('Test product');
      expect(result.sku).toBe('SKU-1');
      expect(result.price).toBe(4999);
    });

    it('generates a BASE- prefixed SKU when record has no sku', () => {
      const record = { product_id: 'abc123', name: 'Test' };

      const result = mapBaseProduct(record, []);

      expect(result.sku).toBe('BASE-abc123');
    });

    it('extracts image URLs from record.images array', () => {
      const record = {
        product_id: 'p1',
        name: 'Test',
        images: [
          { url: 'https://example.com/img1.jpg' },
          { url: 'https://example.com/img2.jpg' },
        ],
      };

      const result = mapBaseProduct(record, []);

      expect(result.imageLinks).toContain('https://example.com/img1.jpg');
      expect(result.imageLinks).toContain('https://example.com/img2.jpg');
    });
  });

  describe('custom field mapping', () => {
    it('auto-maps checkbox-set options from matching Base source labels', () => {
      const result = mapBaseProduct(
        baseMarketExclusionFlatFeatureRecord,
        [],
        {
          customFieldDefinitions: [
            {
              id: 'market-exclusion',
              name: 'Market Exclusion',
              type: 'checkbox_set',
              options: [
                { id: 'tradera', label: 'Tradera' },
                { id: 'vinted', label: 'Vinted' },
              ],
              createdAt: '2026-04-08T00:00:00.000Z',
              updatedAt: '2026-04-08T00:00:00.000Z',
            },
          ],
        }
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: ['tradera'] },
      ]);
    });

    it('auto-maps checkbox-set options from grouped parent features', () => {
      const result = mapBaseProduct(
        baseMarketExclusionNestedFeatureRecord,
        [],
        {
          customFieldDefinitions: [
            {
              id: 'market-exclusion',
              name: 'Market Exclusion',
              type: 'checkbox_set',
              options: [
                { id: 'tradera', label: 'Tradera' },
                { id: 'willhaben', label: 'Willhaben' },
                { id: 'vinted', label: 'Vinted' },
              ],
              createdAt: '2026-04-08T00:00:00.000Z',
              updatedAt: '2026-04-08T00:00:00.000Z',
            },
          ],
        }
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: ['tradera', 'willhaben'] },
      ]);
    });

    it('auto-maps checkbox-set options from grouped selected values arrays', () => {
      const result = mapBaseProduct(
        baseMarketExclusionGroupedValuesRecord,
        [],
        {
          customFieldDefinitions: [
            {
              id: 'market-exclusion',
              name: 'Market Exclusion',
              type: 'checkbox_set',
              options: [
                { id: 'tradera', label: 'Tradera' },
                { id: 'willhaben', label: 'Willhaben' },
                { id: 'vinted', label: 'Vinted' },
              ],
              createdAt: '2026-04-08T00:00:00.000Z',
              updatedAt: '2026-04-08T00:00:00.000Z',
            },
          ],
        }
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: ['tradera', 'willhaben'] },
      ]);
    });

    it('auto-maps checkbox-set options from grouped option objects with explicit state', () => {
      const result = mapBaseProduct(
        baseMarketExclusionGroupedOptionObjectsRecord,
        [],
        {
          customFieldDefinitions: [
            {
              id: 'market-exclusion',
              name: 'Market Exclusion',
              type: 'checkbox_set',
              options: [
                { id: 'tradera', label: 'Tradera' },
                { id: 'willhaben', label: 'Willhaben' },
                { id: 'vinted', label: 'Vinted' },
              ],
              createdAt: '2026-04-08T00:00:00.000Z',
              updatedAt: '2026-04-08T00:00:00.000Z',
            },
          ],
        }
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: ['tradera', 'willhaben'] },
      ]);
    });

    it('maps text custom fields from template mappings', () => {
      const result = mapBaseProduct(
        {
          product_id: 'p1',
          sku: 'SKU-1',
          custom_note: 'Handle with care',
        },
        [{ sourceKey: 'custom_note', targetField: 'custom_field:notes' }]
      );

      expect(result.customFields).toEqual([{ fieldId: 'notes', textValue: 'Handle with care' }]);
    });

    it('maps checkbox-set options from truthy template values', () => {
      const result = mapBaseProduct(
        {
          product_id: 'p1',
          sku: 'SKU-1',
          tradera_excluded: '1',
          vinted_excluded: 'false',
        },
        [
          {
            sourceKey: 'tradera_excluded',
            targetField: 'custom_field_option:market-exclusion:tradera',
          },
          {
            sourceKey: 'vinted_excluded',
            targetField: 'custom_field_option:market-exclusion:vinted',
          },
        ]
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: ['tradera'] },
      ]);
    });

    it('maps grouped checkbox options from explicit dotted template mappings', () => {
      const result = mapBaseProduct(
        baseMarketExclusionNestedFeatureRecord,
        [
          {
            sourceKey: 'Market Exclusion.Tradera',
            targetField: 'custom_field_option:market-exclusion:tradera',
          },
          {
            sourceKey: 'Market Exclusion.Willhaben',
            targetField: 'custom_field_option:market-exclusion:willhaben',
          },
          {
            sourceKey: 'Market Exclusion.Vinted',
            targetField: 'custom_field_option:market-exclusion:vinted',
          },
        ]
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: ['tradera', 'willhaben'] },
      ]);
    });

    it('lets explicit checkbox mappings override auto-detected options', () => {
      const result = mapBaseProduct(
        {
          product_id: 'p1',
          sku: 'SKU-1',
          Tradera: '1',
          tradera_excluded: '0',
        },
        [
          {
            sourceKey: 'tradera_excluded',
            targetField: 'custom_field_option:market-exclusion:tradera',
          },
        ],
        {
          customFieldDefinitions: [
            {
              id: 'market-exclusion',
              name: 'Market Exclusion',
              type: 'checkbox_set',
              options: [{ id: 'tradera', label: 'Tradera' }],
              createdAt: '2026-04-08T00:00:00.000Z',
              updatedAt: '2026-04-08T00:00:00.000Z',
            },
          ],
        }
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: [] },
      ]);
    });

    it('keeps an empty checkbox-set entry when all mapped options are falsey', () => {
      const result = mapBaseProduct(
        {
          product_id: 'p1',
          sku: 'SKU-1',
          tradera_excluded: '0',
        },
        [
          {
            sourceKey: 'tradera_excluded',
            targetField: 'custom_field_option:market-exclusion:tradera',
          },
        ]
      );

      expect(result.customFields).toEqual([
        { fieldId: 'market-exclusion', selectedOptionIds: [] },
      ]);
    });

    it('collects override diagnostics when explicit mappings change auto-matched checkbox values', () => {
      const diagnostics = collectCustomFieldImportDiagnostics(
        {
          product_id: 'p1',
          sku: 'SKU-1',
          Tradera: '1',
          tradera_excluded: '0',
        },
        [
          {
            sourceKey: 'tradera_excluded',
            targetField: 'custom_field_option:market-exclusion:tradera',
          },
        ],
        [
          {
            id: 'market-exclusion',
            name: 'Market Exclusion',
            type: 'checkbox_set',
            options: [{ id: 'tradera', label: 'Tradera' }],
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
          },
        ]
      );

      expect(diagnostics.autoMatchedFieldNames).toEqual(['Market Exclusion']);
      expect(diagnostics.explicitMappedFieldNames).toEqual(['Market Exclusion']);
      expect(diagnostics.overriddenFieldNames).toEqual(['Market Exclusion']);
      expect(diagnostics.skippedFieldNames).toEqual([]);
    });

    it('collects skipped diagnostics when explicit custom-field mappings have no source value', () => {
      const diagnostics = collectCustomFieldImportDiagnostics(
        {
          product_id: 'p1',
          sku: 'SKU-1',
        },
        [
          {
            sourceKey: 'custom_note',
            targetField: 'custom_field:notes',
          },
        ],
        [
          {
            id: 'notes',
            name: 'Notes',
            type: 'text',
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
          },
        ]
      );

      expect(diagnostics.autoMatchedFieldNames).toEqual([]);
      expect(diagnostics.explicitMappedFieldNames).toEqual([]);
      expect(diagnostics.overriddenFieldNames).toEqual([]);
      expect(diagnostics.skippedFieldNames).toEqual(['Notes']);
    });
  });
});
