import prisma from './lib/prisma.ts';

async function main() {
  const productId = '0ff8a495-ee7b-4d71-b305-dc338c402f10';

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      catalogs: {
        include: {
          catalog: {
            include: {
              languages: {
                include: { language: true },
              },
            },
          },
        },
      },
    },
  });

  console.log('\n=== Product Info ===');
  console.log('ID:', product?.id);
  console.log('Name:', product?.name_en);
  console.log('Catalogs:', product?.catalogs?.length || 0);

  if (product?.catalogs) {
    console.log('\n=== Catalogs ===');
    for (const entry of product.catalogs) {
      console.log(`\nCatalog: ${entry.catalog.name}`);
      console.log(`Languages (${entry.catalog.languages.length}):`);
      for (const cl of entry.catalog.languages) {
        console.log(`  - ${cl.language.name} (${cl.language.code})`);
      }
    }
  }

  const targetLanguages = [];
  if (product?.catalogs) {
    for (const entry of product.catalogs) {
      for (const cl of entry.catalog.languages) {
        if (cl.language.code !== 'EN') {
          targetLanguages.push(cl.language.name);
        }
      }
    }
  }

  console.log('\n=== Target Languages ===');
  console.log('Count:', targetLanguages.length);
  console.log('Languages:', targetLanguages.join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
