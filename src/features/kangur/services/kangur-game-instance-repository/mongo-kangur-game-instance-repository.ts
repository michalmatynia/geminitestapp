import 'server-only';

import type { Collection, Db, Document, Filter } from 'mongodb';

import { getKangurGameBuiltInInstancesForGame, getKangurGameDefinition } from '@/features/kangur/games';
import type { KangurGameInstance } from '@/shared/contracts/kangur-game-instances';
import {
  kangurGameInstanceSchema,
} from '@/shared/contracts/kangur-game-instances';
import type { KangurGameId } from '@/shared/contracts/kangur-games';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  KangurGameInstanceListInput,
  KangurGameInstanceRepository,
} from './types';

const COLLECTION = 'kangur_game_instances';
const GAME_SORT_INDEX = 'kangur_game_instances_game_sort_idx';
const ID_UNIQUE_INDEX = 'kangur_game_instances_id_unique_idx';
const ENABLED_GAME_SORT_INDEX = 'kangur_game_instances_enabled_game_sort_idx';

type MongoKangurGameInstanceDocument = Document &
  KangurGameInstance & {
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
    const collection = db.collection<MongoKangurGameInstanceDocument>(COLLECTION);
    await Promise.all([
      collection.createIndex({ gameId: 1, sortOrder: 1 }, { name: GAME_SORT_INDEX }),
      collection.createIndex(
        { gameId: 1, enabled: 1, sortOrder: 1 },
        { name: ENABLED_GAME_SORT_INDEX }
      ),
      collection.createIndex({ id: 1 }, { name: ID_UNIQUE_INDEX, unique: true }),
    ]);
    indexesInitialized = true;
  })();

  try {
    await indexesInFlight;
  } finally {
    indexesInFlight = null;
  }
};

const buildFilter = (
  input?: KangurGameInstanceListInput
): Filter<MongoKangurGameInstanceDocument> => {
  if (!input) {
    return {};
  }

  const filter: Filter<MongoKangurGameInstanceDocument> = {};

  if (input.gameId) {
    filter['gameId'] = input.gameId;
  }

  if (input.instanceId) {
    filter['id'] = input.instanceId;
  }

  if (input.enabledOnly) {
    filter['enabled'] = true;
  }

  return filter;
};

const toGameInstance = (
  doc: MongoKangurGameInstanceDocument
): KangurGameInstance => {
  const parsed = kangurGameInstanceSchema.safeParse(doc);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    id: doc.id,
    gameId: doc.gameId,
    launchableRuntimeId: doc.launchableRuntimeId,
    contentSetId: doc.contentSetId,
    title: doc.title,
    description: doc.description ?? '',
    emoji: doc.emoji,
    enabled: doc.enabled ?? true,
    sortOrder: doc.sortOrder,
    engineOverrides: doc.engineOverrides ?? {},
  };
};

const resolveSeedGameId = (
  input?: KangurGameInstanceListInput
): string | null => {
  if (input?.gameId) {
    return input.gameId;
  }

  if (!input?.instanceId) {
    return null;
  }

  const [candidate] = input.instanceId.split(':instance:');
  return candidate?.trim() ? candidate.trim() : null;
};

const seedMissingBuiltInInstancesForGame = async (
  collection: Collection<MongoKangurGameInstanceDocument>,
  gameId?: string | null
): Promise<boolean> => {
  if (!gameId) {
    return false;
  }

  const builtInInstances = getKangurGameBuiltInInstancesForGame(
    getKangurGameDefinition(gameId as KangurGameId)
  );
  if (builtInInstances.length === 0) {
    return false;
  }

  const now = new Date();
  await collection.bulkWrite(
    builtInInstances.map((instance) => ({
      updateOne: {
        filter: { _id: instance.id },
        update: {
          $setOnInsert: {
            ...instance,
            gameId,
            id: instance.id,
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

export const mongoKangurGameInstanceRepository: KangurGameInstanceRepository = {
  async listInstances(input?: KangurGameInstanceListInput): Promise<KangurGameInstance[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameInstanceDocument>(COLLECTION);
    let docs = await collection
      .find(buildFilter(input))
      .sort({ sortOrder: 1, id: 1 })
      .toArray();

    if (docs.length === 0) {
      await seedMissingBuiltInInstancesForGame(collection, resolveSeedGameId(input));
      docs = await collection
        .find(buildFilter(input))
        .sort({ sortOrder: 1, id: 1 })
        .toArray();
    }

    return docs.map(toGameInstance);
  },

  async replaceInstancesForGame(gameId, instances): Promise<KangurGameInstance[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameInstanceDocument>(COLLECTION);
    const now = new Date();

    if (instances.length === 0) {
      await collection.deleteMany({ gameId });
      return [];
    }

    const ids = instances.map((instance) => instance.id);
    const operations = instances.map((instance) => ({
      updateOne: {
        filter: { _id: instance.id },
        update: {
          $set: {
            ...instance,
            gameId,
            id: instance.id,
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
    await collection.deleteMany({ gameId, _id: { $nin: ids } });

    return instances;
  },
};
