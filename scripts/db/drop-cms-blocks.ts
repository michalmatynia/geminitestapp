import { MongoClient } from 'mongodb';

const COLLECTIONS = ['cms_blocks', 'cms_page_blocks'] as const;

async function dropCollections() {
  if (!process.env['MONGODB_URI']) {
    console.log('[cms-blocks] Mongo skipped (MONGODB_URI not set)');
    return;
  }
  const dbName = process.env['MONGODB_DB'] || 'app';
  const client = new MongoClient(process.env['MONGODB_URI']!);
  await client.connect();
  const db = client.db(dbName);
  const existing = new Set((await db.listCollections().toArray()).map((item) => item.name));

  for (const name of COLLECTIONS) {
    if (!existing.has(name)) {
      console.log(`[cms-blocks] Collection "${name}" not found, skipping`);
      continue;
    }
    await db.collection(name).drop();
    console.log(`[cms-blocks] Dropped collection "${name}"`);
  }

  await client.close();
}

dropCollections().catch((error) => {
  console.error('[cms-blocks] Cleanup failed:', error);
  process.exit(1);
});
