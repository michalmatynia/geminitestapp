import { describe, it } from 'vitest';

import { prismaProductRepository } from '@/shared/lib/products/services/product-repository/prisma-product-repository';

describe('Debug getProducts', () => {
  it('should list products', async () => {
    const products = await prismaProductRepository.getProducts({ page: 1, pageSize: 10 });
    console.log('Total products found:', products.length);
    if (products.length > 0) {
      const firstProduct = products[0];
      if (firstProduct) {
        console.log('Sample product:', {
          id: firstProduct.id,
          sku: firstProduct.sku,
          name_en: firstProduct.name_en,
          categoryId: firstProduct.categoryId,
          catalogsCount: firstProduct.catalogs?.length,
        });
      }
    }
  });
});
