import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

const KANGUR_CONTENT_METADATA_COLLECTION = 'kangur_content_metadata';
const KANGUR_LESSON_CONTENT_METADATA_ID = 'lesson-content';

export type KangurLessonContentMetadata = {
  lessonContentRevision: string;
  locales: string[];
  source: 'localhost';
  syncedAt: string;
};

type KangurLessonContentMetadataDocument = KangurLessonContentMetadata & {
  _id: string;
};

export const writeKangurLessonContentMetadata = async (
  metadata: Omit<KangurLessonContentMetadata, 'syncedAt'>
): Promise<KangurLessonContentMetadata> => {
  const db = await getMongoDb();
  const syncedAt = new Date().toISOString();
  const nextMetadata: KangurLessonContentMetadata = {
    ...metadata,
    syncedAt,
  };

  await db.collection<KangurLessonContentMetadataDocument>(KANGUR_CONTENT_METADATA_COLLECTION).updateOne(
    { _id: KANGUR_LESSON_CONTENT_METADATA_ID },
    {
      $set: {
        ...nextMetadata,
        _id: KANGUR_LESSON_CONTENT_METADATA_ID,
      },
    },
    { upsert: true }
  );

  return nextMetadata;
};

export const readKangurLessonContentMetadata =
  async (): Promise<KangurLessonContentMetadata | null> => {
    const db = await getMongoDb();
    const document = await db
      .collection<KangurLessonContentMetadataDocument>(KANGUR_CONTENT_METADATA_COLLECTION)
      .findOne({ _id: KANGUR_LESSON_CONTENT_METADATA_ID });

    if (!document || typeof document !== 'object') {
      return null;
    }

    const lessonContentRevision =
      typeof document['lessonContentRevision'] === 'string'
        ? document['lessonContentRevision']
        : null;
    const source = document['source'] === 'localhost' ? 'localhost' : null;
    const syncedAt = typeof document['syncedAt'] === 'string' ? document['syncedAt'] : null;
    const locales = Array.isArray(document['locales'])
      ? document['locales'].filter((value): value is string => typeof value === 'string')
      : [];

    if (!lessonContentRevision || !source || !syncedAt) {
      return null;
    }

    return {
      lessonContentRevision,
      locales,
      source,
      syncedAt,
    };
  };
