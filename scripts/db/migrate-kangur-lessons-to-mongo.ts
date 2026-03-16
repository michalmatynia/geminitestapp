import 'dotenv/config';

import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  KANGUR_LESSONS_SETTING_KEY,
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
} from '@/shared/contracts/kangur';
import { parseKangurLessons } from '@/features/kangur/settings';
import { parseKangurLessonDocumentStore } from '@/features/kangur/lesson-documents';
import { mongoKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository/mongo-kangur-lesson-repository';
import { mongoKangurLessonDocumentRepository } from '@/features/kangur/services/kangur-lesson-document-repository/mongo-kangur-lesson-document-repository';

const SETTINGS_COLLECTION = 'settings';

type SettingDoc = {
  key?: string;
  value?: string;
  _id?: string;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const db = await getMongoDb();
  const row = await db.collection<SettingDoc>(SETTINGS_COLLECTION).findOne({
    $or: [{ key }, { _id: key }],
  });
  return typeof row?.value === 'string' ? row.value : null;
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to migrate Kangur lessons.');
  }

  const mongoClient = await getMongoClient();

  try {
    const [rawLessons, rawLessonDocuments] = await Promise.all([
      readSettingValue(KANGUR_LESSONS_SETTING_KEY),
      readSettingValue(KANGUR_LESSON_DOCUMENTS_SETTING_KEY),
    ]);

    const lessons = parseKangurLessons(rawLessons);
    const lessonDocuments = parseKangurLessonDocumentStore(rawLessonDocuments);

    const [persistedLessons, persistedDocuments] = await Promise.all([
      mongoKangurLessonRepository.replaceLessons(lessons),
      mongoKangurLessonDocumentRepository.replaceLessonDocuments(lessonDocuments),
    ]);

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        lessons: persistedLessons.length,
        documents: Object.keys(persistedDocuments).length,
      })}\n`
    );
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
