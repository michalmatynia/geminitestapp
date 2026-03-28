import { QueryClient } from '@tanstack/react-query';

import type { ProductWithImages } from '@/shared/contracts/products';

export const baseQuickExportTestProduct = {
  id: 'product-1',
  sku: 'SKU-001',
  name_en: 'Product 1',
  name_pl: '',
  name_de: '',
  description_en: null,
  description_pl: null,
  description_de: null,
  price: 10,
  stock: 3,
  weight: null,
  ean: null,
  baseProductId: null,
  images: [],
  imageLinks: [],
  imageBase64s: [],
  categoryId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  producer: null,
  parameters: [],
  tags: [],
  catalogs: [],
  defaultPriceGroupId: null,
  priceGroupPrices: [],
} as unknown as ProductWithImages;

export const createBaseQuickExportTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
