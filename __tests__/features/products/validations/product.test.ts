import { describe, it, expect } from 'vitest';

import { productCreateSchema, productUpdateSchema } from '@/shared/lib/products/validations';

const VALID_NAME = 'Product | 5 cm | Metal | Pins | Theme';

describe('product validations', () => {
  describe('productCreateSchema', () => {
    it('should allow valid product data', () => {
      const data = {
        name_en: VALID_NAME,
        sku: 'PROD-123',
        price: 100,
      };
      const result = productCreateSchema.safeParse(data);
      if (!result.success) console.log(result.error.format());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(100);
      }
    });

    it('should handle empty price correctly', () => {
      const data = {
        name_en: VALID_NAME,
        sku: 'PROD-123',
        price: '',
      };
      const result = productCreateSchema.safeParse(data);
      if (!result.success) console.log(result.error.format());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBeUndefined();
      }
    });

    it('should handle SKU preprocessing', () => {
      const r1 = productCreateSchema.safeParse({ name_en: VALID_NAME, sku: '' });
      // productCreateSchema requires sku.min(1), so empty string should fail
      expect(r1.success).toBe(false);

      const r2 = productCreateSchema.safeParse({ name_en: VALID_NAME, sku: '  ' });
      // trimmed empty string should also fail
      expect(r2.success).toBe(false);

      const r3 = productCreateSchema.safeParse({ name_en: VALID_NAME, sku: 'VALID' });
      expect(r3.success).toBe(true);
    });

    it('should handle imageLinks preprocessing (CSV/JSON/Array)', () => {
      // CSV
      const csvResult = productCreateSchema.safeParse({
        name_en: VALID_NAME,
        sku: 'S1',
        imageLinks: 'a.jpg, b.jpg',
      });
      expect(csvResult.success).toBe(true);
      if (csvResult.success) {
        expect(csvResult.data.imageLinks).toEqual(['a.jpg', 'b.jpg']);
      }

      // JSON
      const jsonResult = productCreateSchema.safeParse({
        name_en: VALID_NAME,
        sku: 'S1',
        imageLinks: '["c.jpg", "d.jpg"]',
      });
      expect(jsonResult.success).toBe(true);
      if (jsonResult.success) {
        expect(jsonResult.data.imageLinks).toEqual(['c.jpg', 'd.jpg']);
      }

      // Array
      const arrayResult = productCreateSchema.safeParse({
        name_en: VALID_NAME,
        sku: 'S1',
        imageLinks: ['e.jpg'],
      });
      expect(arrayResult.success).toBe(true);
      if (arrayResult.success) {
        expect(arrayResult.data.imageLinks).toEqual(['e.jpg']);
      }
    });

    it('should handle parameters preprocessing', () => {
      const params = [{ parameterId: 'p1', value: 'v1' }];
      const jsonParams = JSON.stringify(params);
      const result = productCreateSchema.safeParse({
        name_en: VALID_NAME,
        sku: 'S1',
        parameters: jsonParams,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters).toEqual(params);
      }
    });
  });

  describe('productUpdateSchema', () => {
    it('should normalize empty SKU values to null', () => {
      const result = productUpdateSchema.safeParse({ sku: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBeNull();
      }
    });

    it('should keep non-empty SKU values trimmed', () => {
      const result = productUpdateSchema.safeParse({ sku: '  SKU-123  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe('SKU-123');
      }
    });
  });
});
