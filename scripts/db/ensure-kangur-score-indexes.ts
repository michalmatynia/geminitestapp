import 'dotenv/config';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

const KANGUR_SCORES_COLLECTION = 'kangur_scores';

async function main() {
  if (!process.env['MONGODB_URI']) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  const db = await getMongoDb();
  const collection = db.collection(KANGUR_SCORES_COLLECTION);

  await collection.createIndex(
    { created_date: -1 },
    {
      name: 'kangur_scores_created_date_desc',
      background: true,
    }
  );

  await collection.createIndex(
    { score: -1, created_date: -1 },
    {
      name: 'kangur_scores_score_desc_created_date_desc',
      background: true,
    }
  );

  await collection.createIndex(
    { player_name: 1, created_date: -1 },
    {
      name: 'kangur_scores_player_name_created_date_desc',
      background: true,
    }
  );

  await collection.createIndex(
    { operation: 1, created_date: -1 },
    {
      name: 'kangur_scores_operation_created_date_desc',
      background: true,
    }
  );

  await collection.createIndex(
    { created_by: 1, created_date: -1 },
    {
      name: 'kangur_scores_created_by_created_date_desc',
      background: true,
      partialFilterExpression: {
        created_by: { $type: 'string' },
      },
    }
  );

  console.log('Kangur score indexes ensured.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to ensure Kangur score indexes:', error);
  process.exit(1);
});
