import { describe, expect, it } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

import { buildProductFormData, type BuildProductFormDataInput } from './useProductFormSubmit.payload';

const buildInput = (
  data: Partial<ProductFormData>
): BuildProductFormDataInput => ({
  data: data as ProductFormData,
  imageSlots: [],
  imageLinks: [],
  imageBase64s: [],
  selectedCatalogIds: ['catalog-1'],
  selectedCategoryId: 'category-1',
  selectedTagIds: [],
  selectedProducerIds: [],
  selectedNoteIds: [],
  customFieldValues: [],
  parameterValues: [],
  studioProjectId: null,
});

describe('buildProductFormData', () => {
  it('includes selected price-group and sourcePrice fields in product saves', () => {
    const formData = buildProductFormData(
      buildInput({
        sku: 'SKU-1',
        defaultPriceGroupId: 'group-pln',
        price: 100,
        sourcePrice: 42.5,
      })
    );

    expect(formData.get('defaultPriceGroupId')).toBe('group-pln');
    expect(formData.get('sourcePrice')).toBe('42.5');
    expect(formData.get('price')).toBe('100');
  });
});
