import { describe, expect, it } from 'vitest';

import {
  PRODUCT_BATCH_EDIT_FIELD_DEFINITIONS,
  PRODUCT_BATCH_EDIT_FIELD_VALUES,
  type ProductBatchEditField,
} from '@/shared/contracts/products/batch-edit';
import { productUpdateInputSchema } from '@/shared/contracts/products/io';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { buildProductBatchEditPatch } from './batch-edit';

const PRODUCT_INPUT_FIELD_ALIASES = {
  id: null,
  name_en: 'name',
  name_pl: 'name',
  name_de: 'name',
  description_en: 'description',
  description_pl: 'description',
  description_de: 'description',
} satisfies Record<string, ProductBatchEditField | null>;

const resolveBatchEditField = (inputField: string): ProductBatchEditField | null => {
  const alias = PRODUCT_INPUT_FIELD_ALIASES[inputField as keyof typeof PRODUCT_INPUT_FIELD_ALIASES];
  if (alias !== undefined) return alias;
  return inputField as ProductBatchEditField;
};

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    importSource: null,
    defaultPriceGroupId: null,
    ean: '111',
    gtin: '222',
    asin: 'B000',
    name: { en: 'Old name', pl: null, de: null },
    description: { en: 'Old description', pl: null, de: null },
    name_en: 'Old name',
    name_pl: 'Stara nazwa',
    name_de: null,
    description_en: 'Old description',
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 3,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: true,
    archived: false,
    categoryId: null,
    shippingGroupId: null,
    studioProjectId: null,
    catalogId: 'default',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    images: [{ productId: 'product-1', imageFileId: 'image-1', assignedAt: 'now' }],
    catalogs: [{ productId: 'product-1', catalogId: 'catalog-1', assignedAt: 'now' }],
    tags: [{ productId: 'product-1', tagId: 'tag-1', assignedAt: 'now' }],
    producers: [],
    customFields: [],
    parameters: [],
    marketplaceContentOverrides: [],
    notes: null,
    imageLinks: ['https://example.com/a.jpg'],
    imageBase64s: [],
    noteIds: [],
    ...overrides,
  }) as ProductWithImages;

describe('buildProductBatchEditPatch', () => {
  it('covers every editable product input field except immutable id', () => {
    const supportedFields = new Set<ProductBatchEditField>(PRODUCT_BATCH_EDIT_FIELD_VALUES);
    const updateInputFields = productUpdateInputSchema.keyof().options;
    const missingFields = updateInputFields.filter((inputField: string): boolean => {
      const batchField = resolveBatchEditField(inputField);
      return batchField !== null && !supportedFields.has(batchField);
    });

    expect(missingFields).toEqual([]);
  });

  it('has one field definition for every supported batch edit field', () => {
    expect(PRODUCT_BATCH_EDIT_FIELD_DEFINITIONS.map((definition) => definition.field)).toEqual(
      PRODUCT_BATCH_EDIT_FIELD_VALUES
    );
  });

  it('updates EAN, GTIN, and ASIN as separate fields', () => {
    const result = buildProductBatchEditPatch(createProduct(), [
      { field: 'ean', mode: 'set', value: 'EAN-NEW' },
      { field: 'gtin', mode: 'set', value: 'GTIN-NEW' },
      { field: 'asin', mode: 'set', value: 'ASIN-NEW' },
    ]);

    expect(result.patch).toMatchObject({
      ean: 'EAN-NEW',
      gtin: 'GTIN-NEW',
      asin: 'ASIN-NEW',
    });
    expect(result.changes.map((change) => change.field)).toEqual(['ean', 'gtin', 'asin']);
  });

  it('applies localized field operations to the selected language only', () => {
    const result = buildProductBatchEditPatch(createProduct(), [
      { field: 'name', language: 'pl', mode: 'append', value: '!' },
    ]);

    expect(result.patch).toEqual({ name_pl: 'Stara nazwa!' });
    expect(result.changes).toEqual([
      {
        field: 'name_pl',
        oldValue: 'Stara nazwa',
        newValue: 'Stara nazwa!',
      },
    ]);
  });

  it('replaces text values and appends array values without duplicates', () => {
    const result = buildProductBatchEditPatch(createProduct(), [
      { field: 'description', language: 'en', mode: 'replace', find: 'Old', replaceWith: 'New' },
      { field: 'tagIds', mode: 'append', value: 'tag-1,tag-2' },
    ]);

    expect(result.patch).toMatchObject({
      description_en: 'New description',
      tagIds: ['tag-1', 'tag-2'],
    });
  });

  it('clears booleans and numeric fields with remove', () => {
    const result = buildProductBatchEditPatch(createProduct({ archived: true, stock: 4 }), [
      { field: 'archived', mode: 'remove' },
      { field: 'stock', mode: 'remove' },
    ]);

    expect(result.patch).toMatchObject({
      archived: false,
      stock: 0,
    });
  });

  it('clears notes through an empty object that product update normalization stores as null', () => {
    const result = buildProductBatchEditPatch(
      createProduct({ notes: { text: 'Review later', color: 'yellow' } }),
      [{ field: 'notes', mode: 'remove' }]
    );

    expect(result.patch).toEqual({ notes: {} });
  });

  it('sets and clears the studio project relation field', () => {
    const setResult = buildProductBatchEditPatch(createProduct(), [
      { field: 'studioProjectId', mode: 'set', value: 'studio-1' },
    ]);
    const clearResult = buildProductBatchEditPatch(
      createProduct({ studioProjectId: 'studio-1' }),
      [{ field: 'studioProjectId', mode: 'remove' }]
    );

    expect(setResult.patch).toEqual({ studioProjectId: 'studio-1' });
    expect(clearResult.patch).toEqual({ studioProjectId: null });
  });
});
