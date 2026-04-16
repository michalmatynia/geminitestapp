import { describe, expect, it } from 'vitest';

import { validateProductCreate, validateProductUpdate } from './validators';

describe('product validators', () => {
  it('accepts a complete structured English title during create', async () => {
    const result = await validateProductCreate({
      sku: 'SKU-1',
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed structured English titles during create', async () => {
    const result = await validateProductCreate({
      sku: 'SKU-1',
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected create validation to fail.');
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name_en',
          message:
            'English name must use format: <name> | <size> | <material> | <category> | <lore or theme>',
        }),
      ])
    );
  });

  it('keeps update validation lenient for existing products', async () => {
    const result = await validateProductUpdate({
      name_en: 'Legacy Product Title',
    });

    expect(result.success).toBe(true);
  });
});
