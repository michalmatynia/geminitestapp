import { describe, expect, it } from 'vitest';

import { buildBaseProductData } from "@/features/integrations/services/exports/base-exporter";

import type { ProductWithImages } from '@/shared/contracts/products';

const createProduct = (): ProductWithImages =>
  ({
    id: 'product-1',
    name: {},
    description: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name_en: 'Test Product',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 5,
    price: 20,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: 'catalog-1',
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    images: [],
    catalogs: [],
    tags: [],
    parameters: [],
    producers: [
      {
        productId: 'product-1',
        producerId: 'producer-local-1',
        assignedAt: new Date().toISOString(),
      },
    ],
  }) as ProductWithImages;

describe('buildBaseProductData producer mapping', () => {
  it('exports producer_id for producer alias mappings', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(
      product,
      [{ sourceKey: 'producer', targetField: 'producerIds' }],
      null,
      {
        producerNameById: { 'producer-local-1': 'Noe' },
      }
    );

    expect(payload['producer_id']).toBe('producer-local-1');
  });

  it('falls back to producer id when lookup is unavailable', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(product, [
      { sourceKey: 'producer', targetField: 'producerIds' },
    ]);

    expect(payload['producer_id']).toBe('producer-local-1');
  });

  it('normalizes producerids alias and exports producer list', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(
      product,
      [{ sourceKey: 'producerids', targetField: 'producerIds' }],
      null,
      {
        producerNameById: { 'producer-local-1': 'Noe' },
      }
    );

    expect(payload['producer_ids']).toEqual(['producer-local-1']);
  });

  it('normalizes producers alias and exports producer_ids list', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(
      product,
      [{ sourceKey: 'producers', targetField: 'producerIds' }],
      null,
      {
        producerNameById: { 'producer-local-1': 'Noe' },
      }
    );

    expect(payload['producer_ids']).toEqual(['producer-local-1']);
  });

  it('exports custom-field values via parameter:<id> mapping', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-color',
        value: 'Red',
      },
    ];
    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'custom_color',
        targetField: 'parameter:param-color',
      },
    ]);

    expect(payload['custom_color']).toBe('Red');
  });

  it('falls back to valuesByLanguage for parameter mappings', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-material',
        value: '',
        valuesByLanguage: {
          en: 'Wood',
          de: 'Holz',
        },
      },
    ];
    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'custom_material',
        targetField: 'parameter:param-material',
      },
    ]);

    expect(payload['custom_material']).toBe('Wood');
  });

  it('exports language-specific parameter values via parameter:<id>|<lang>', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-material',
        value: '',
        valuesByLanguage: {
          en: 'Wood',
          de: 'Holz',
        },
      },
    ];
    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'custom_material_de',
        targetField: 'parameter:param-material|de',
      },
    ]);

    expect(payload['custom_material_de']).toBe('Holz');
  });

  it('falls back when requested parameter language is missing', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-material',
        value: '',
        valuesByLanguage: {
          en: 'Wood',
          de: 'Holz',
        },
      },
    ];
    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'custom_material_pl',
        targetField: 'parameter:param-material|pl',
      },
    ]);

    expect(payload['custom_material_pl']).toBe('Wood');
  });

  it('normalizes parameter-prefixed source fields to Base parameter keys', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-color',
        value: 'Red',
      },
    ];

    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'parameter:param-color',
        targetField: 'parameter:param-color',
      },
    ]);

    expect(payload['param-color']).toBe('Red');
  });

  it('normalizes language-scoped parameter-prefixed source fields to Base keys', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-material',
        value: '',
        valuesByLanguage: {
          en: 'Wood',
          de: 'Holz',
        },
      },
    ];

    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'parameter:param-material|de',
        targetField: 'parameter:param-material|de',
      },
    ]);

    expect(payload['param-material|de']).toBe('Holz');
  });

  it('maps text_fields.features parameter targets to nested text_fields payload', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-material',
        value: 'Wood',
      },
    ];

    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'text_fields.features.Material',
        targetField: 'parameter:param-material',
      },
    ]);

    expect(payload['text_fields']).toMatchObject({
      features: {
        Material: 'Wood',
      },
    });
  });

  it('maps localized text_fields.features parameter targets to nested text_fields payload', async () => {
    const product = createProduct();
    product.parameters = [
      {
        parameterId: 'param-material',
        value: '',
        valuesByLanguage: {
          en: 'Wood',
          de: 'Holz',
        },
      },
    ];

    const payload = await buildBaseProductData(product, [
      {
        sourceKey: 'text_fields.features|de.Material',
        targetField: 'parameter:param-material|de',
      },
    ]);

    expect(payload['text_fields']).toMatchObject({
      'features|de': {
        Material: 'Holz',
      },
    });
  });
});
