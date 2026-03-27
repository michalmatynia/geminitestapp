import { describe, expect, it } from 'vitest';

import type { ProductDraft, ProductWithImages } from '@/shared/contracts/products';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';

import { resolveProductFormDefaultSku } from './ProductFormCoreContext';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-EDIT-1',
    ...overrides,
  }) as ProductWithImages;

const createDraft = (overrides: Partial<ProductDraft> = {}): ProductDraft =>
  ({
    id: 'draft-1',
    name: 'Draft Template',
    sku: 'OLD-DRAFT-SKU',
    ...overrides,
  }) as ProductDraft;

describe('resolveProductFormDefaultSku', () => {
  it('uses the saved product SKU when editing an existing product', () => {
    expect(
      resolveProductFormDefaultSku({
        product: createProduct({ sku: 'SKU-EDIT-9' }),
        draft: createDraft(),
        initialSku: 'IGNORED',
      })
    ).toBe('SKU-EDIT-9');
  });

  it('uses an explicit initial SKU for standard create flows', () => {
    expect(
      resolveProductFormDefaultSku({
        product: undefined,
        draft: null,
        initialSku: 'MANUAL-SKU-1',
      })
    ).toBe('MANUAL-SKU-1');
  });

  it('uses the validator placeholder for create-from-draft instead of the draft SKU', () => {
    expect(
      resolveProductFormDefaultSku({
        product: undefined,
        draft: createDraft({ sku: 'OLD-DRAFT-SKU' }),
      })
    ).toBe(PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER);
  });

  it('leaves the SKU empty for plain create when no initial SKU is provided', () => {
    expect(
      resolveProductFormDefaultSku({
        product: undefined,
        draft: null,
      })
    ).toBe('');
  });
});
