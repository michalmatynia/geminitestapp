import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      { name: 'Laptop', price: 1200, sku: 'LP-1200', descriptionPL: 'A powerful laptop for all your needs.' },
      { name: 'Mouse', price: 50, sku: 'MS-50', descriptionPL: 'A comfortable and responsive mouse.' },
      { name: 'Keyboard', price: 100, sku: 'KB-100', descriptionPL: 'A mechanical keyboard with customizable RGB lighting.' },
      { name: 'Monitor', price: 400, sku: 'MN-400', descriptionPL: 'A 27-inch 4K monitor with stunning visuals.' },
      { name: 'Webcam', price: 80, sku: 'WC-80', descriptionPL: 'A 1080p webcam with a built-in microphone.' },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });