import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

export type ProductDbProvider = 'prisma' | 'mongodb';

const PRODUCT_PROVIDER_CACHE_TTL_MS = 10_000;
let productProviderCache: { value: ProductDbProvider; ts: number } | null = null;
let productProviderInflight: Promise<ProductDbProvider> | null = null;

export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  const now = Date.now();
  if (productProviderCache && now - productProviderCache.ts < PRODUCT_PROVIDER_CACHE_TTL_MS) {
    return productProviderCache.value;
  }
  if (productProviderInflight) {
    return productProviderInflight;
  }

  productProviderInflight = (async (): Promise<ProductDbProvider> => {
    const appProvider = await getAppDbProvider();
    return appProvider === 'prisma' ? 'prisma' : 'mongodb';
  })();

  try {
    const value = await productProviderInflight;
    productProviderCache = { value, ts: Date.now() };
    return value;
  } finally {
    productProviderInflight = null;
  }
};

export const invalidateProductDataProviderCache = (): void => {
  productProviderCache = null;
  productProviderInflight = null;
};
