import 'dotenv/config';

import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  parseKangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'kangur_ai_tutor_content';

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to seed Kangur AI Tutor content.');
  }

  const mongoClient = await getMongoClient();

  try {
    const content = parseKangurAiTutorContent(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
    const db = await getMongoDb();
    const collection = db.collection(COLLECTION_NAME);
    const now = new Date();

    await collection.updateOne(
      { locale: content.locale },
      {
        $set: {
          content,
          updatedAt: now,
        },
        $setOnInsert: {
          locale: content.locale,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    process.stdout.write(
      `${JSON.stringify({ ok: true, locale: content.locale, version: content.version })}\n`
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
