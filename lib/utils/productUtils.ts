import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createMockProduct(productData: { name?: string; price?: string; sku?: string; stock?: number }) {
  const product = await prisma.product.create({
    data: {
      name: productData.name || 'Mock Product',
      price: productData.price ? parseInt(productData.price) : 100,
      sku: productData.sku || `MOCK-SKU-${Date.now()}-${Math.random()}`,
      stock: productData.stock || 10,
      description: 'This is a mock product description.',
      supplierName: 'Mock Supplier',
      supplierLink: 'https://mock.supplier.com',
      priceComment: 'Mock price comment',
      sizeLength: 10,
      sizeWidth: 10,
    },
  });
  return product;
}
