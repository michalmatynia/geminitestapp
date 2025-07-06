const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      { name: 'Laptop', price: 1200 },
      { name: 'Mouse', price: 50 },
      { name: 'Keyboard', price: 100 },
      { name: 'Monitor', price: 400 },
      { name: 'Webcam', price: 80 },
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
