import 'server-only';

import type { Db, Document, Filter } from 'mongodb';

import { createDefaultKangurGames } from '@/features/kangur/games';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import { kangurGameDefinitionSchema } from '@/shared/contracts/kangur-games';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { KangurGameListInput, KangurGameRepository } from './types';

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

const buildFilter = (input?: KangurGameListInput): Filter<MongoKangurGameDocument> => {
  if (!input) return {};

  const filter: Filter<MongoKangurGameDocument> = {};
  if (input.subject) {
    filter['subject'] = input.subject;
  }
  if (input.ageGroup) {
    filter['ageGroup'] = input.ageGroup;
  }
  if (input.status) {
    filter['status'] = input.status;
  }
  if (input.surface) {
    filter['surfaces'] = input.surface;
  }
  if (input.lessonComponentId) {
    filter['lessonComponentIds'] = input.lessonComponentId;
  }

  return filter;
};

const filterGames = (
  games: KangurGameDefinition[],
  input?: KangurGameListInput
): KangurGameDefinition[] => {
  let next = games;
  const subject = input?.subject;
  const ageGroup = input?.ageGroup;
  const status = input?.status;
  const surface = input?.surface;
  const lessonComponentId = input?.lessonComponentId;

  if (subject) {
    next = next.filter((game) => game.subject === subject);
  }
  if (ageGroup) {
    next = next.filter((game) => game.ageGroup === ageGroup);
  }
  if (status) {
    next = next.filter((game) => game.status === status);
  }
  if (surface) {
    next = next.filter((game) => game.surfaces.includes(surface));
  }
  if (lessonComponentId) {
    next = next.filter((game) => game.lessonComponentIds.includes(lessonComponentId));
  }

  return next;
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

export const mongoKangurGameRepository: KangurGameRepository = {
  async listGames(input?: KangurGameListInput): Promise<KangurGameDefinition[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameDocument>(COLLECTION);
    const docs = await collection
      .find(buildFilter(input))
      .sort({ sortOrder: 1, title: 1, id: 1 })
      .toArray();

    if (docs.length === 0) {
      const defaults = createDefaultKangurGames();
      return filterGames(defaults, input);
    }

    return docs.map(toGameDefinition);
  },

  async replaceGames(games: KangurGameDefinition[]): Promise<KangurGameDefinition[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameDocument>(COLLECTION);
    const now = new Date();

    if (games.length === 0) {
      await collection.deleteMany({});
      return [];
    }

    const gameIds = games.map((game) => game.id);
    const operations = games.map((game) => ({
      updateOne: {
        filter: { _id: game.id },
        update: {
          $set: {
            ...game,
            id: game.id,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(operations, { ordered: false });
    await collection.deleteMany({ _id: { $nin: gameIds } });

    return games;
  },

  async saveGame(game: KangurGameDefinition): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameDocument>(COLLECTION);
    const now = new Date();

    await collection.updateOne(
      { _id: game.id },
      {
        $set: {
          ...game,
          id: game.id,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  },

  async removeGame(gameId: string): Promise<void> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameDocument>(COLLECTION);
    await collection.deleteOne({ _id: gameId });
  },
};
