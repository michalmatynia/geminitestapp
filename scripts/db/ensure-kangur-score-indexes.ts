import 'dotenv/config';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

const KANGUR_SCORES_COLLECTION = 'kangur_scores';
const KANGUR_LEARNERS_COLLECTION = 'kangur_learners';
const SETTINGS_COLLECTION = 'settings';

async function main() {
  if (!process.env['MONGODB_URI']) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  const db = await getMongoDb();
  const scoresCollection = db.collection(KANGUR_SCORES_COLLECTION);
  const learnersCollection = db.collection(KANGUR_LEARNERS_COLLECTION);
  const settingsCollection = db.collection(SETTINGS_COLLECTION);

  await settingsCollection.createIndex(
    { key: 1 },
    {
      name: 'settings_key',
      background: true,
    }
  );

  await learnersCollection.createIndex(
    { loginName: 1 },
    {
      name: 'kangur_learners_loginName',
      background: true,
      unique: true,
    }
  );

  await learnersCollection.createIndex(
    { ownerUserId: 1, displayName: 1 },
    {
      name: 'kangur_learners_ownerUserId_displayName',
      background: true,
    }
  );

  await learnersCollection.createIndex(
    { legacyUserKey: 1 },
    {
      name: 'kangur_learners_legacyUserKey',
      background: true,
      partialFilterExpression: {
        legacyUserKey: { $type: 'string' },
      },
    }
  );

  await scoresCollection.createIndex(
    { created_date: -1 },
    {
      name: 'kangur_scores_created_date_desc',
      background: true,
    }
  );

  await scoresCollection.createIndex(
    { score: -1, created_date: -1 },
    {
      name: 'kangur_scores_score_desc_created_date_desc',
      background: true,
    }
  );

  await scoresCollection.createIndex(
    { player_name: 1, created_date: -1 },
    {
      name: 'kangur_scores_player_name_created_date_desc',
      background: true,
    }
  );

  await scoresCollection.createIndex(
    { operation: 1, created_date: -1 },
    {
      name: 'kangur_scores_operation_created_date_desc',
      background: true,
    }
  );

  await scoresCollection.createIndex(
    { created_by: 1, created_date: -1 },
    {
      name: 'kangur_scores_created_by_created_date_desc',
      background: true,
      partialFilterExpression: {
        created_by: { $type: 'string' },
      },
    }
  );

  await scoresCollection.createIndex(
    { learner_id: 1, created_date: -1 },
    {
      name: 'kangur_scores_learner_id_created_date_desc',
      background: true,
      partialFilterExpression: {
        learner_id: { $type: 'string' },
      },
    }
  );

  console.log('Kangur MongoDB indexes ensured.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to ensure Kangur MongoDB indexes:', error);
  process.exit(1);
});
