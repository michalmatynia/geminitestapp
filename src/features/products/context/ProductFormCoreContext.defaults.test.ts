import { describe, expect, it } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import { resolveProductFormDefaultValues } from './ProductFormCoreContext.defaults';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages => {
  const product: ProductWithImages = {
    id: 'product-1',
    sku: 'BATTLESTOCK-1',
    baseProductId: null,
    importSource: 'scrape',
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Imported BattleStock Product', pl: 'Importowany produkt', de: null },
    description: { en: '', pl: null, de: null },
    name_en: null,
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 0,
    sourcePrice: null,
    price: 0,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: true,
    archived: false,
    categoryId: null,
    catalogId: 'catalog-battlestock',
    images: [],
    catalogs: [],
    tags: [],
    producers: [],
    customFields: [],
    parameters: [],
    marketplaceContentOverrides: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
  return product;
};

describe('resolveProductFormDefaultValues', () => {
  it('hydrates modal names from localized product payload fields when scalar names are missing', () => {
    const defaults = resolveProductFormDefaultValues({
      product: createProduct({
        name: {
          en: 'Imported BattleStock Product',
          pl: 'Importowany produkt BattleStock',
          de: 'Importiertes BattleStock Produkt',
        },
      }),
    });

    expect(defaults).toMatchObject({
      name_en: 'Imported BattleStock Product',
      name_pl: 'Importowany produkt BattleStock',
      name_de: 'Importiertes BattleStock Produkt',
    });
  });

  it('keeps scalar product names ahead of localized payload fallbacks', () => {
    const defaults = resolveProductFormDefaultValues({
      product: createProduct({
        name: { en: 'Localized fallback', pl: null, de: null },
        name_en: 'Canonical scalar name',
      }),
    });

    expect(defaults.name_en).toBe('Canonical scalar name');
  });
});
