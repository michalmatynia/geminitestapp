import prisma from './lib/prisma.ts';

async function main() {
  const catalogId = 'cad266e9-5a76-4ed3-8e49-a8c7b6bdfc10';
  
  console.log('\n=== Checking Catalog ===');
  const catalog = await prisma.catalog.findUnique({
    where: { id: catalogId },
    include: {
      languages: {
        include: {
          language: true
        }
      }
    }
  });
  
  if (!catalog) {
    console.log('❌ Catalog NOT FOUND in database!');
    
    // Let's see what catalogs exist
    const allCatalogs = await prisma.catalog.findMany({
      select: { id: true, name: true }
    });
    console.log('\n=== All Catalogs in Database ===');
    console.log('Count:', allCatalogs.length);
    allCatalogs.forEach(c => {
      console.log(`- ${c.name} (${c.id})`);
    });
  } else {
    console.log('✅ Catalog FOUND:', catalog.name);
    console.log('Languages:', catalog.languages.length);
    catalog.languages.forEach(cl => {
      console.log(`  - ${cl.language.name} (${cl.language.code})`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
