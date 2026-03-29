import 'dotenv/config';

import { getMongoClient } from '@/shared/lib/db/mongo-client';
import {
  KANGUR_CONTENT_BOOTSTRAP_LOCALES,
} from '@/features/kangur/server/kangur-content-bootstrap';
import { verifyKangurContentInMongo } from '@/features/kangur/server/kangur-content-verification';

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to verify Kangur content in MongoDB.');
  }

  const mongoClient = await getMongoClient();

  try {
    const summary = await verifyKangurContentInMongo(KANGUR_CONTENT_BOOTSTRAP_LOCALES);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (strict && !summary.ok) {
      process.exitCode = 1;
    }
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
