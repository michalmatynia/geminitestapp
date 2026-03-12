import { getMongoDb } from '@/shared/lib/db/mongo-client';

const LEGACY_KEYS = ['product_db_provider', 'integration_db_provider', 'auth_db_provider'];

async function cleanupMongo() {
  if (!process.env['MONGODB_URI']) {
    console.log('[cleanup] Mongo skipped (MONGODB_URI not set)');
    return { count: 0 };
  }
  try {
    const db = await getMongoDb();
    const result = await db.collection<{ _id: string; key: string }>('settings').deleteMany({
      $or: [{ _id: { $in: Array.from(LEGACY_KEYS) } }, { key: { $in: LEGACY_KEYS } }],
    });
    console.log(`[cleanup] Mongo deleted ${result.deletedCount ?? 0} legacy settings`);
    return { count: result.deletedCount ?? 0 };
  } catch (error) {
    console.error('[cleanup] Mongo cleanup failed:', error);
    return { count: 0 };
  }
}

async function main() {
  await cleanupMongo();
  process.exit(0);
}

main().catch((error) => {
  console.error('[cleanup] Failed:', error);
  process.exit(1);
});
