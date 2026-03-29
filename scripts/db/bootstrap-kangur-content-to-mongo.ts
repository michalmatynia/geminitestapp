import 'dotenv/config';

import { getMongoClient } from '@/shared/lib/db/mongo-client';
import {
  bootstrapKangurContentToMongo,
  KANGUR_CONTENT_BOOTSTRAP_LOCALES,
} from '@/features/kangur/server/kangur-content-bootstrap';

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to bootstrap Kangur content into MongoDB.');
  }

  const mongoClient = await getMongoClient();

  try {
    const summary = await bootstrapKangurContentToMongo(KANGUR_CONTENT_BOOTSTRAP_LOCALES);
    process.stdout.write(`${JSON.stringify({ ok: true, ...summary })}\n`);
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
