import { prismaProductRepository } from '../src/features/products/services/product-repository/prisma-product-repository';

async function debug() {
  try {
    const products = await prismaProductRepository.getProducts({ page: 1, pageSize: 10 });
    console.log('Total products found:', products.length);
    if (products.length > 0) {
      console.log('First product sample:', JSON.stringify(products[0], null, 2));
    } else {
      console.log('No products found in database.');
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

debug();