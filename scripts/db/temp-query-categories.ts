import 'dotenv/config';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

async function main() {
  const db = await getMongoDb();
  const categories = await db.collection('product_categories').find().toArray();

  console.log(
    categories
      .filter(
        (c) =>
          !c['name_pl'] || c['id'] === c['name'] || typeof c['name_pl'] !== 'string'
      )
      .map((c) => ({
        id: c['id'] ?? c._id,
        name_en: c['name_en'],
        name_pl: c['name_pl'],
        name: c['name'],
      }))
  );

  const allFormatted = categories.map((c) => ({
    id: c['id'] ?? c._id,
    name_en: c['name_en'] ?? c['name'],
    name_pl: c['name_pl'],
  }));
  console.log('All categories:');
  console.log(JSON.stringify(allFormatted, null, 2));

  process.exit(0);
}

main().catch(console.error);
