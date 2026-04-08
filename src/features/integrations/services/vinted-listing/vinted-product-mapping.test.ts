import { describe, expect, it } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { resolveVintedProductMapping } from './vinted-product-mapping';

const NOW = '2026-04-08T00:00:00.000Z';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: overrides.id ?? 'product-1',
    sku: overrides.sku ?? 'SKU-1',
    baseProductId: overrides.baseProductId ?? null,
    defaultPriceGroupId: overrides.defaultPriceGroupId ?? null,
    ean: overrides.ean ?? null,
    gtin: overrides.gtin ?? null,
    asin: overrides.asin ?? null,
    name: overrides.name ?? { en: 'Test product', pl: 'Produkt testowy', de: null },
    description:
      overrides.description ?? { en: 'English description', pl: 'Polski opis', de: null },
    name_en: overrides.name_en ?? 'Test product',
    name_pl: overrides.name_pl ?? 'Produkt testowy',
    name_de: overrides.name_de ?? null,
    description_en: overrides.description_en ?? 'English description',
    description_pl: overrides.description_pl ?? 'Polski opis',
    description_de: overrides.description_de ?? null,
    supplierName: overrides.supplierName ?? null,
    supplierLink: overrides.supplierLink ?? null,
    priceComment: overrides.priceComment ?? null,
    stock: overrides.stock ?? 1,
    price: overrides.price ?? 149.9,
    sizeLength: overrides.sizeLength ?? null,
    sizeWidth: overrides.sizeWidth ?? null,
    weight: overrides.weight ?? null,
    length: overrides.length ?? null,
    published: overrides.published ?? true,
    categoryId: overrides.categoryId ?? 'internal-leaf',
    shippingGroupId: overrides.shippingGroupId ?? null,
    catalogId: overrides.catalogId ?? 'catalog-1',
    category: overrides.category,
    shippingGroup: overrides.shippingGroup,
    shippingGroupSource: overrides.shippingGroupSource,
    shippingGroupResolutionReason: overrides.shippingGroupResolutionReason,
    shippingGroupMatchedCategoryRuleIds: overrides.shippingGroupMatchedCategoryRuleIds,
    shippingGroupMatchingGroupNames: overrides.shippingGroupMatchingGroupNames,
    tags: overrides.tags ?? [],
    producers: overrides.producers ?? [],
    images: overrides.images ?? [],
    catalogs: overrides.catalogs ?? [],
    customFields: overrides.customFields ?? [],
    parameters: overrides.parameters ?? [],
    imageLinks: overrides.imageLinks ?? [],
    imageBase64s: overrides.imageBase64s ?? [],
    noteIds: overrides.noteIds ?? [],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  }) as ProductWithImages;

const createCategory = (overrides: Partial<ProductCategory>): ProductCategory =>
  ({
    id: overrides.id ?? 'category-1',
    name: overrides.name ?? 'Category',
    name_en: overrides.name_en ?? null,
    name_pl: overrides.name_pl ?? null,
    name_de: overrides.name_de ?? null,
    color: overrides.color ?? null,
    parentId: overrides.parentId ?? null,
    catalogId: overrides.catalogId ?? 'catalog-1',
    sortIndex: overrides.sortIndex ?? null,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  }) as ProductCategory;

const createCustomFieldDefinition = (
  overrides: Partial<ProductCustomFieldDefinition>
): ProductCustomFieldDefinition =>
  ({
    id: overrides.id ?? 'field-1',
    name: overrides.name ?? 'Field',
    type: overrides.type ?? 'text',
    options: overrides.options ?? [],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  }) as ProductCustomFieldDefinition;

const createParameter = (overrides: Partial<ProductParameter>): ProductParameter =>
  ({
    id: overrides.id ?? 'parameter-1',
    catalogId: overrides.catalogId ?? 'catalog-1',
    name: overrides.name ?? 'Parameter',
    name_en: overrides.name_en ?? 'Parameter',
    name_pl: overrides.name_pl ?? null,
    name_de: overrides.name_de ?? null,
    selectorType: overrides.selectorType ?? 'text',
    optionLabels: overrides.optionLabels ?? [],
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  }) as ProductParameter;

describe('resolveVintedProductMapping', () => {
  it('prefers explicit Vinted custom fields over generic product metadata', () => {
    const mapping = resolveVintedProductMapping({
      product: createProduct({
        customFields: [
          { fieldId: 'cf-brand', textValue: 'Acne Studios' },
          { fieldId: 'cf-category', textValue: 'Women / Tops' },
          { fieldId: 'cf-condition', textValue: 'Very good' },
          { fieldId: 'cf-size', textValue: 'M' },
        ],
        parameters: [
          { parameterId: 'param-condition', value: 'Wrong fallback' },
          { parameterId: 'param-size', value: 'L' },
        ],
        producers: [
          {
            productId: 'product-1',
            producerId: 'producer-1',
            assignedAt: NOW,
            producer: { id: 'producer-1', name: 'Fallback Brand' },
          },
        ] as never,
        price: 219.75,
      }),
      customFieldDefinitions: [
        createCustomFieldDefinition({ id: 'cf-brand', name: 'Vinted Brand' }),
        createCustomFieldDefinition({ id: 'cf-category', name: 'Vinted Category' }),
        createCustomFieldDefinition({ id: 'cf-condition', name: 'Vinted Condition' }),
        createCustomFieldDefinition({ id: 'cf-size', name: 'Vinted Size' }),
      ],
      parameters: [
        createParameter({ id: 'param-condition', name: 'Condition' }),
        createParameter({ id: 'param-size', name: 'Rozmiar', name_pl: 'Rozmiar' }),
      ],
      categories: [
        createCategory({ id: 'internal-root', name: 'Internal root' }),
        createCategory({
          id: 'internal-leaf',
          name: 'Internal leaf',
          parentId: 'internal-root',
        }),
      ],
    });

    expect(mapping.title).toBe('Produkt testowy');
    expect(mapping.description).toBe('Polski opis');
    expect(mapping.price).toBe('219');
    expect(mapping.brand).toEqual({
      label: 'Acne Studios',
      source: 'custom_field',
      sourceName: 'Vinted Brand',
    });
    expect(mapping.category).toEqual({
      label: 'Tops',
      pathLabel: 'Women > Tops',
      pathSegments: ['Women', 'Tops'],
      source: 'custom_field',
      sourceName: 'Vinted Category',
    });
    expect(mapping.condition).toEqual({
      label: 'Very good',
      source: 'custom_field',
      sourceName: 'Vinted Condition',
    });
    expect(mapping.size).toEqual({
      label: 'M',
      source: 'custom_field',
      sourceName: 'Vinted Size',
    });
  });

  it('falls back to parameters, producers, and internal category paths when explicit Vinted fields are missing', () => {
    const mapping = resolveVintedProductMapping({
      product: createProduct({
        customFields: [],
        parameters: [
          {
            parameterId: 'param-condition',
            valuesByLanguage: { pl: 'Nowy z metka', en: 'New with tags' },
          },
          {
            parameterId: 'param-size',
            value: '38',
          },
        ],
        producers: [
          {
            productId: 'product-1',
            producerId: 'producer-1',
            assignedAt: NOW,
            producer: { id: 'producer-1', name: 'COS' },
          },
        ] as never,
        categoryId: 'dress-leaf',
      }),
      customFieldDefinitions: [],
      parameters: [
        createParameter({
          id: 'param-condition',
          name: 'Condition',
          name_en: 'Condition',
          name_pl: 'Stan',
        }),
        createParameter({
          id: 'param-size',
          name: 'Size',
          name_en: 'Size',
          name_pl: 'Rozmiar',
        }),
      ],
      categories: [
        createCategory({ id: 'fashion-root', name: 'Women' }),
        createCategory({
          id: 'dress-leaf',
          name: 'Dresses',
          parentId: 'fashion-root',
        }),
      ],
    });

    expect(mapping.brand).toEqual({
      label: 'COS',
      source: 'producer',
      sourceName: 'producer',
    });
    expect(mapping.condition).toEqual({
      label: 'Nowy z metka',
      source: 'parameter',
      sourceName: 'Condition',
    });
    expect(mapping.size).toEqual({
      label: '38',
      source: 'parameter',
      sourceName: 'Size',
    });
    expect(mapping.category).toEqual({
      label: 'Dresses',
      pathLabel: 'Women > Dresses',
      pathSegments: ['Women', 'Dresses'],
      source: 'product_category',
      sourceName: 'dress-leaf',
    });
    expect(mapping.diagnostics).toEqual({
      availableCustomFields: [],
      availableParameters: ['Condition', 'Stan', 'Size', 'Rozmiar'],
      productCategoryPath: 'Women > Dresses',
      producerNames: ['COS'],
    });
  });
});
