import { describe, expect, it } from 'vitest';

import { mapBaseProduct } from './base-mapper';

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
});
