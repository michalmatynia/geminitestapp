import { QueryClient } from '@tanstack/react-query';

import type { ProductWithImages } from '@/shared/contracts/products/product';

export const baseQuickExportTestProduct = {
  id: 'product-1',
  sku: 'SKU-001',
  gtin: null,
  asin: null,
  name: {
    en: 'Product 1',
    pl: null,
    de: null,
  },
  description: {
    en: null,
    pl: null,
    de: null,
  },
  name_en: 'Product 1',
  name_pl: '',
  name_de: '',
  description_en: null,
  description_pl: null,
  description_de: null,
  supplierName: null,
  supplierLink: null,
  priceComment: null,
  price: 10,
  stock: 3,
  sizeLength: null,
  sizeWidth: null,
  weight: null,
  length: null,
  ean: null,
  baseProductId: null,
  published: true,
  archived: false,
  images: [],
  imageLinks: [],
  imageBase64s: [],
  categoryId: 'category-1',
  catalogId: 'catalog-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  parameters: [],
  tags: [],
  catalogs: [],
  producers: [],
  defaultPriceGroupId: null,
} satisfies ProductWithImages;

export const createBaseQuickExportTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
