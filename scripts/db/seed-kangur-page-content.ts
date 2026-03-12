import 'dotenv/config';

import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { getMongoClient } from '@/shared/lib/db/mongo-client';

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to seed Kangur page content.');
  }

  const mongoClient = await getMongoClient();

  try {
    const store = await getKangurPageContentStore('pl');

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        locale: store.locale,
        version: store.version,
        entryCount: store.entries.length,
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
