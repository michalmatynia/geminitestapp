import 'server-only';

import type { Collection, Db, Document } from 'mongodb';

import { createDefaultKangurGames } from '@/features/kangur/games';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import { kangurGameDefinitionSchema } from '@/shared/contracts/kangur-games';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION = 'kangur_games';
const SUBJECT_SORT_INDEX = 'kangur_games_subject_sort_idx';
const STATUS_SORT_INDEX = 'kangur_games_status_sort_idx';
const GAME_ID_UNIQUE_INDEX = 'kangur_games_gameId_unique_idx';

type MongoKangurGameDocument = Document &
  KangurGameDefinition & {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
  };

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;
let defaultsInitialized = false;
let defaultsInFlight: Promise<void> | null = null;

const ensureIndexes = async (db: Db): Promise<void> => {
  if (indexesInitialized) return;
  if (indexesInFlight) {
    await indexesInFlight;
    return;
  }

  indexesInFlight = (async (): Promise<void> => {
    const collection = db.collection<MongoKangurGameDocument>(COLLECTION);
    await Promise.all([
      collection.createIndex({ subject: 1, sortOrder: 1 }, { name: SUBJECT_SORT_INDEX }),
      collection.createIndex({ status: 1, sortOrder: 1 }, { name: STATUS_SORT_INDEX }),
      collection.createIndex({ id: 1 }, { name: GAME_ID_UNIQUE_INDEX, unique: true }),
    ]);
    indexesInitialized = true;
  })();

  try {
    await indexesInFlight;
  } finally {
    indexesInFlight = null;
  }
};

const toGameDefinition = (doc: MongoKangurGameDocument): KangurGameDefinition => {
  const parsed = kangurGameDefinitionSchema.safeParse(doc);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    id: doc.id,
    engineId: doc.engineId,
    subject: doc.subject,
    ageGroup: doc.ageGroup,
    lessonComponentIds: doc.lessonComponentIds ?? [],
    activityIds: doc.activityIds ?? [],
    legacyScreenIds: doc.legacyScreenIds ?? [],
    label: doc.label,
    title: doc.title,
    description: doc.description,
    emoji: doc.emoji,
    mechanic: doc.mechanic,
    interactionMode: doc.interactionMode,
    surfaces: doc.surfaces ?? ['library'],
    tags: doc.tags ?? [],
    variants: doc.variants ?? [],
    status: doc.status ?? 'active',
    sortOrder: doc.sortOrder ?? 0,
  };
};

const seedMissingGames = async (
  collection: Collection<MongoKangurGameDocument>
): Promise<boolean> => {
  const defaults = createDefaultKangurGames();
  if (defaults.length === 0) {
    return false;
  }

  const now = new Date();
  await collection.bulkWrite(
    defaults.map((game) => ({
      updateOne: {
        filter: { _id: game.id },
        update: {
          $setOnInsert: {
            ...game,
            id: game.id,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return true;
};

const ensureDefaultGames = async (
  collection: Collection<MongoKangurGameDocument>
): Promise<void> => {
  if (defaultsInitialized) return;
  if (defaultsInFlight) {
    await defaultsInFlight;
    return;
  }

  defaultsInFlight = (async (): Promise<void> => {
    await seedMissingGames(collection);
    defaultsInitialized = true;
  })();

  try {
    await defaultsInFlight;
  } finally {
    defaultsInFlight = null;
  }
};

export const listKangurGames = async (): Promise<KangurGameDefinition[]> => {
  const db = await getMongoDb();
  await ensureIndexes(db);

  const collection = db.collection<MongoKangurGameDocument>(COLLECTION);
  await ensureDefaultGames(collection);

  const docs = await collection
    .find({})
    .sort({ sortOrder: 1, title: 1, id: 1 })
    .toArray();

  if (docs.length === 0) {
    return createDefaultKangurGames();
  }

  return docs.map(toGameDefinition);
};
