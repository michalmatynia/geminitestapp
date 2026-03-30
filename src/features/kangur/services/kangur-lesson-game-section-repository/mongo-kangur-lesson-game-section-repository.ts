import 'server-only';

import type { Db, Document, Filter } from 'mongodb';

import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';
import { kangurLessonGameSectionSchema } from '@/shared/contracts/kangur-lesson-game-sections';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  KangurLessonGameSectionListInput,
  KangurLessonGameSectionRepository,
} from './types';

const COLLECTION = 'kangur_lesson_game_sections';
const GAME_SORT_INDEX = 'kangur_lesson_game_sections_game_sort_idx';
const LESSON_SORT_INDEX = 'kangur_lesson_game_sections_lesson_sort_idx';
const ID_UNIQUE_INDEX = 'kangur_lesson_game_sections_id_unique_idx';

type MongoKangurLessonGameSectionDocument = Document &
  KangurLessonGameSection & {
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
    const collection = db.collection<MongoKangurLessonGameSectionDocument>(COLLECTION);
    await Promise.all([
      collection.createIndex(
        { gameId: 1, lessonComponentId: 1, sortOrder: 1 },
        { name: GAME_SORT_INDEX }
      ),
      collection.createIndex(
        { lessonComponentId: 1, gameId: 1, sortOrder: 1 },
        { name: LESSON_SORT_INDEX }
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
  input?: KangurLessonGameSectionListInput
): Filter<MongoKangurLessonGameSectionDocument> => {
  if (!input) {
    return {};
  }

  const filter: Filter<MongoKangurLessonGameSectionDocument> = {};

  if (input.gameId) {
    filter['gameId'] = input.gameId;
  }

  if (input.lessonComponentId) {
    filter['lessonComponentId'] = input.lessonComponentId;
  }

  if (input.enabledOnly) {
    filter['enabled'] = true;
  }

  return filter;
};

const toLessonGameSection = (
  doc: MongoKangurLessonGameSectionDocument
): KangurLessonGameSection => {
  const parsed = kangurLessonGameSectionSchema.safeParse(doc);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    id: doc.id,
    lessonComponentId: doc.lessonComponentId,
    gameId: doc.gameId,
    title: doc.title,
    description: doc.description ?? '',
    emoji: doc.emoji,
    sortOrder: doc.sortOrder,
    enabled: doc.enabled ?? true,
    settings: doc.settings ?? {},
  };
};

export const mongoKangurLessonGameSectionRepository: KangurLessonGameSectionRepository = {
  async listSections(
    input?: KangurLessonGameSectionListInput
  ): Promise<KangurLessonGameSection[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurLessonGameSectionDocument>(COLLECTION);
    const docs = await collection
      .find(buildFilter(input))
      .sort({ sortOrder: 1, id: 1 })
      .toArray();

    return docs.map(toLessonGameSection);
  },

  async replaceSectionsForGame(
    gameId,
    sections
  ): Promise<KangurLessonGameSection[]> {
    const db = await getMongoDb();
    await ensureIndexes(db);

    const collection = db.collection<MongoKangurLessonGameSectionDocument>(COLLECTION);
    const now = new Date();

    if (sections.length === 0) {
      await collection.deleteMany({ gameId });
      return [];
    }

    const ids = sections.map((section) => section.id);
    const operations = sections.map((section) => ({
      updateOne: {
        filter: { _id: section.id },
        update: {
          $set: {
            ...section,
            gameId,
            id: section.id,
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

    return sections;
  },
};
