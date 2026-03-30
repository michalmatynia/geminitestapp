import 'server-only';

import type { Collection, Db, Document, Filter } from 'mongodb';

import { getKangurGameContentSetsForGame, getKangurGameDefinition } from '@/features/kangur/games';
import type { KangurGameContentSet } from '@/shared/contracts/kangur-game-instances';
import { kangurGameContentSetSchema } from '@/shared/contracts/kangur-game-instances';
import type { KangurGameId } from '@/shared/contracts/kangur-games';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  KangurGameContentSetListInput,
  KangurGameContentSetRepository,
} from './types';

const COLLECTION = 'kangur_game_content_sets';
const GAME_SORT_INDEX = 'kangur_game_content_sets_game_sort_idx';
const ID_UNIQUE_INDEX = 'kangur_game_content_sets_id_unique_idx';

type MongoKangurGameContentSetDocument = Document &
  KangurGameContentSet & {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
  };

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;
const defaultsInitializedForGame = new Set<string>();
const defaultsInFlightByGame = new Map<string, Promise<void>>();

const ensureIndexes = async (db: Db): Promise<void> => {
  if (indexesInitialized) return;
  if (indexesInFlight) {
    await indexesInFlight;
    return;
  }

  indexesInFlight = (async (): Promise<void> => {
    const collection = db.collection<MongoKangurGameContentSetDocument>(COLLECTION);
    await Promise.all([
      collection.createIndex({ gameId: 1, sortOrder: 1 }, { name: GAME_SORT_INDEX }),
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
  input?: KangurGameContentSetListInput
): Filter<MongoKangurGameContentSetDocument> => {
  if (!input) {
    return {};
  }

  const filter: Filter<MongoKangurGameContentSetDocument> = {};

  if (input.gameId) {
    filter['gameId'] = input.gameId;
  }

  if (input.contentSetId) {
    filter['id'] = input.contentSetId;
  }

  return filter;
};

const toGameContentSet = (
  doc: MongoKangurGameContentSetDocument
): KangurGameContentSet => {
  const parsed = kangurGameContentSetSchema.safeParse(doc);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    id: doc.id,
    gameId: doc.gameId,
    engineId: doc.engineId,
    launchableRuntimeId: doc.launchableRuntimeId,
    label: doc.label,
    description: doc.description,
    contentKind: doc.contentKind,
    rendererProps: doc.rendererProps ?? {},
    sortOrder: doc.sortOrder ?? 0,
  };
};

const seedMissingBuiltInContentSetsForGame = async (
  collection: Collection<MongoKangurGameContentSetDocument>,
  gameId?: string
): Promise<boolean> => {
  if (!gameId) {
    return false;
  }

  const builtInContentSets = getKangurGameContentSetsForGame(
    getKangurGameDefinition(gameId as KangurGameId)
  );
  if (builtInContentSets.length === 0) {
    return false;
  }

  const now = new Date();
  await collection.bulkWrite(
    builtInContentSets.map((contentSet) => ({
      updateOne: {
        filter: { _id: contentSet.id },
        update: {
          $setOnInsert: {
            ...contentSet,
            gameId,
            id: contentSet.id,
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

const resolveSeedGameId = (
  input?: KangurGameContentSetListInput
): string | null => {
  if (input?.gameId) {
    return input.gameId;
  }

  if (!input?.contentSetId) {
    return null;
  }

  const [candidate] = input.contentSetId.split(':');
  return candidate?.trim() ? candidate.trim() : null;
};

const ensureBuiltInContentSetsForGame = async (
  collection: Collection<MongoKangurGameContentSetDocument>,
  gameId?: string | null
): Promise<void> => {
  if (!gameId) {
    return;
  }

  if (defaultsInitializedForGame.has(gameId)) {
    return;
  }

  const inFlight = defaultsInFlightByGame.get(gameId);
  if (inFlight) {
    await inFlight;
    return;
  }

  const promise = (async (): Promise<void> => {
    await seedMissingBuiltInContentSetsForGame(collection, gameId);
    defaultsInitializedForGame.add(gameId);
  })();

  defaultsInFlightByGame.set(gameId, promise);

  try {
    await promise;
  } finally {
    defaultsInFlightByGame.delete(gameId);
  }
};

export const mongoKangurGameContentSetRepository: KangurGameContentSetRepository = {
  async listContentSets(input?: KangurGameContentSetListInput): Promise<KangurGameContentSet[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameContentSetDocument>(COLLECTION);
    await ensureBuiltInContentSetsForGame(collection, resolveSeedGameId(input));

    const docs = await collection
      .find(buildFilter(input))
      .sort({ sortOrder: 1, id: 1 })
      .toArray();

    return docs.map(toGameContentSet);
  },

  async replaceContentSetsForGame(gameId, contentSets): Promise<KangurGameContentSet[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurGameContentSetDocument>(COLLECTION);
    const now = new Date();

    if (contentSets.length === 0) {
      await collection.deleteMany({ gameId });
      return [];
    }

    const ids = contentSets.map((contentSet) => contentSet.id);
    const operations = contentSets.map((contentSet) => ({
      updateOne: {
        filter: { _id: contentSet.id },
        update: {
          $set: {
            ...contentSet,
            gameId,
            id: contentSet.id,
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

    return contentSets;
  },
};
