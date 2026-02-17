import { describe, it, expect } from 'vitest';

import { mapBaseProduct, extractBaseImageUrls } from '@/features/integrations/services/imports/base-mapper';

describe('Base Mapper', () => {
  describe('extractBaseImageUrls', () => {
    it('extracts URLs from various formats', () => {
      const record = {
        images: ['https://example.com/1.jpg'],
        image_url: 'https://example.com/2.jpg',
        nested: {
          photo: 'https://example.com/3.jpg',
        }
      };
      const urls = extractBaseImageUrls(record);
      expect(urls).toContain('https://example.com/1.jpg');
      expect(urls).toContain('https://example.com/2.jpg');
      // Note: pickNested isn't used by extractBaseImageUrls directly for any key, 
      // but collectUrls traverses the whole object.
      expect(urls).toContain('https://example.com/3.jpg');
    });
  });

  describe('mapBaseProduct', () => {
    it('maps basic fields correctly', () => {
      const record = {
        product_id: '123',
        name_en: 'Test Product',
        sku: 'SKU123',
        price: 99.99,
        stock: 10,
      };
      const result = mapBaseProduct(record);
      expect(result.baseProductId).toBe('123');
      expect(result.name_en).toBe('Test Product');
      expect(result.sku).toBe('SKU123');
      expect(result.price).toBe(100); // 99.99 rounded to 100
      expect(result.stock).toBe(10);
    });

    it('maps nested fields', () => {
      const record = {
        text_fields: {
          name_en: 'Nested Name',
          description_en: 'Nested Desc',
        },
        prices: {
          '0': { price_brutto: 150 }
        }
      };
      const result = mapBaseProduct(record);
      expect(result.name_en).toBe('Nested Name');
      expect(result.description_en).toBe('Nested Desc');
      expect(result.price).toBe(150);
    });

    it('applies template mappings', () => {
      const record = {
        custom_sku: 'CUSTOM-1',
        params: [
          { name: 'Material', value: 'Wood' }
        ],
        image_links: ['https://img.com/1.jpg']
      };
      const mappings = [
        { sourceKey: 'custom_sku', targetField: 'sku' },
        { sourceKey: 'Material', targetField: 'description_en' },
        { sourceKey: 'image_link_1', targetField: 'image_slot_2' }
      ];
      const result = mapBaseProduct(record, mappings);
      expect(result.sku).toBe('CUSTOM-1');
      expect(result.description_en).toBe('Wood');
      expect(result.imageLinks).toContain('https://img.com/1.jpg');
    });

    it('handles image slots in templates', () => {
      const record = {
        images: ['https://img.com/a.jpg', 'https://img.com/b.jpg']
      };
      const mappings = [
        { sourceKey: 'image_slot_2', targetField: 'description_pl' }
      ];
      const result = mapBaseProduct(record, mappings);
      expect(result.description_pl).toBe('https://img.com/b.jpg');
    });

    it('maps template values into custom product parameters', () => {
      const record = {
        params: [
          { name: 'Material', value: 'Wood' },
        ],
      };
      const mappings = [
        { sourceKey: 'Material', targetField: 'parameter:param-material' },
      ];
      const result = mapBaseProduct(record, mappings);
      expect(result.parameters).toEqual([
        { parameterId: 'param-material', value: 'Wood' },
      ]);
    });
  });
});
