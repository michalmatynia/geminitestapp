import { describe, expect, it } from 'vitest';

import {
  createProductSchema,
  productCreateInputSchema,
  productUpdateInputSchema,
  updateProductSchema,
} from './io';

describe('product io schemas', () => {
  it('normalizes numeric form fields on create payloads', () => {
    const parsed = productCreateInputSchema.parse({
      sku: 'SKU-1',
      price: ' 12.5 ',
      stock: '7',
    });

    expect(parsed.price).toBe(12.5);
    expect(parsed.stock).toBe(7);
  });

  it('treats empty and NaN-like numeric values as undefined', () => {
    const parsed = productCreateInputSchema.parse({
      sku: 'SKU-1',
      price: 'NaN',
      stock: '',
    });

    expect(parsed.price).toBeUndefined();
    expect(parsed.stock).toBeUndefined();
  });

  it('normalizes blank update skus to null', () => {
    const parsed = productUpdateInputSchema.parse({
      sku: '   ',
    });

    expect(parsed.sku).toBeNull();
  });

  it('parses archived booleans from form-style update payloads', () => {
    expect(productUpdateInputSchema.parse({ archived: 'true' }).archived).toBe(true);
    expect(productUpdateInputSchema.parse({ archived: 'false' }).archived).toBe(false);
  });

  it('parses marketplace content overrides from JSON form fields', () => {
    const parsed = productCreateInputSchema.parse({
      sku: 'SKU-1',
      marketplaceContentOverrides: JSON.stringify([
        {
          integrationIds: [' integration-tradera ', 'integration-vinted'],
          title: ' Alternate title ',
          description: ' Alternate description ',
        },
      ]),
    });

    expect(parsed.marketplaceContentOverrides).toEqual([
      {
        integrationIds: ['integration-tradera', 'integration-vinted'],
        title: 'Alternate title',
        description: 'Alternate description',
      },
    ]);
  });

  it('rejects duplicate marketplace integration assignments across overrides', () => {
    expect(() =>
      productCreateInputSchema.parse({
        sku: 'SKU-1',
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-tradera'],
            title: 'First title',
            description: null,
          },
          {
            integrationIds: ['integration-tradera'],
            title: null,
            description: 'Second description',
          },
        ],
      })
    ).toThrow(/Each marketplace integration can only belong to one alternate copy rule\./);
  });

  it('keeps read-only shipping group metadata out of create DTOs', () => {
    const parsed = createProductSchema.parse({
      sku: 'SKU-1',
      baseProductId: null,
      defaultPriceGroupId: null,
      ean: null,
      gtin: null,
      asin: null,
      name: { en: 'Product 1' },
      description: { en: '' },
      supplierName: null,
      supplierLink: null,
      priceComment: null,
      stock: 1,
      price: 10,
      sizeLength: null,
      sizeWidth: null,
      weight: null,
      length: null,
      published: false,
      categoryId: 'category-1',
      shippingGroupId: 'shipping-group-1',
      catalogId: 'catalog-1',
      shippingGroupSource: 'category_rule',
      shippingGroupResolutionReason: 'category_rule',
      shippingGroupMatchedCategoryRuleIds: ['category-1'],
      shippingGroupMatchingGroupNames: ['Jewellery 7 EUR'],
      shippingGroup: {
        id: 'shipping-group-1',
        name: 'Jewellery 7 EUR',
        catalogId: 'catalog-1',
        autoAssignCategoryIds: ['category-1'],
      },
    });

    expect(parsed).not.toHaveProperty('shippingGroupSource');
    expect(parsed).not.toHaveProperty('shippingGroupResolutionReason');
    expect(parsed).not.toHaveProperty('shippingGroupMatchedCategoryRuleIds');
    expect(parsed).not.toHaveProperty('shippingGroupMatchingGroupNames');
    expect(parsed).not.toHaveProperty('shippingGroup');
  });

  it('keeps read-only shipping group metadata out of update DTOs', () => {
    const parsed = updateProductSchema.parse({
      shippingGroupSource: 'manual',
      shippingGroupResolutionReason: 'manual',
      shippingGroupMatchedCategoryRuleIds: ['category-1'],
      shippingGroupMatchingGroupNames: ['Manual parcel'],
      shippingGroup: {
        id: 'shipping-group-1',
        name: 'Manual parcel',
        catalogId: 'catalog-1',
      },
    });

    expect(parsed).not.toHaveProperty('shippingGroupSource');
    expect(parsed).not.toHaveProperty('shippingGroupResolutionReason');
    expect(parsed).not.toHaveProperty('shippingGroupMatchedCategoryRuleIds');
    expect(parsed).not.toHaveProperty('shippingGroupMatchingGroupNames');
    expect(parsed).not.toHaveProperty('shippingGroup');
  });
});
