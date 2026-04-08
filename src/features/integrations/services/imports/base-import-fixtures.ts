export const baseMarketExclusionFlatFeatureRecord = {
  product_id: 'p-flat',
  sku: 'SKU-FLAT',
  text_fields: {
    features: {
      Tradera: '1',
      Vinted: '0',
    },
  },
} as const;

export const baseMarketExclusionNestedFeatureRecord = {
  product_id: 'p-feature-group',
  sku: 'SKU-FEATURE-GROUP',
  text_fields: {
    features: {
      'Market Exclusion': {
        Tradera: '1',
        Willhaben: 'yes',
        Vinted: '0',
      },
    },
  },
} as const;

export const baseMarketExclusionGroupedValuesRecord = {
  product_id: 'p-grouped-values',
  sku: 'SKU-GROUPED-VALUES',
  parameters: [
    {
      name: 'Market Exclusion',
      values: ['Tradera', 'Willhaben'],
    },
  ],
} as const;

export const baseMarketExclusionGroupedOptionObjectsRecord = {
  product_id: 'p-grouped-options',
  sku: 'SKU-GROUPED-OPTIONS',
  parameters: [
    {
      name: 'Market Exclusion',
      values: [
        { label: 'Tradera', selected: true },
        { label: 'Willhaben', checked: true },
        { label: 'Vinted', selected: false },
      ],
    },
  ],
} as const;

export const baseInventoryProductsListObjectPayload = {
  products: {
    '2001': {
      sku: 'SKU-OBJECT-FIRST',
    },
    '2002': {
      product_id: 'p-2002',
      sku: 'SKU-OBJECT-SECOND',
    },
  },
} as const;
