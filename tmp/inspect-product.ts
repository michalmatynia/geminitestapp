import { MongoClient } from 'mongodb';

const safe = (value: unknown): string => {
  const json = JSON.stringify(value);
  return typeof json === 'string' ? json.slice(0, 4000) : String(value);
};

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'app';
  if (!uri) throw new Error('No MONGODB_URI');
  const productId = process.argv[2];
  if (!productId) throw new Error('Missing product id');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const doc = await db.collection('products').findOne({ id: productId });
  if (!doc) {
    console.log('not found');
    await client.close();
    return;
  }

  const keys = Object.keys(doc).sort();
  console.log('keys', keys.join(', '));
  const fields = [
    'id',
    'catalogId',
    'catalogs',
    'catalogIds',
    'categoryId',
    'categories',
    'parameters',
    'customFields',
    'metadata',
  ] as const;
  for (const field of fields) {
    console.log(`\n${field}:`, safe(doc[field]));
  }

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
