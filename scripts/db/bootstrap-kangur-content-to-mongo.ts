import 'dotenv/config';

import { getMongoClient } from '@/shared/lib/db/mongo-client';
import {
  bootstrapKangurContentToMongo,
  KANGUR_CONTENT_BOOTSTRAP_LOCALES,
} from '@/features/kangur/server/kangur-content-bootstrap';
import { runKangurContentSyncCli } from './lib/kangur-content-cli-runner';

async function main(): Promise<void> {
  process.exitCode = await runKangurContentSyncCli({
    bootstrap: bootstrapKangurContentToMongo,
    env: process.env,
    getMongoClient,
    locales: KANGUR_CONTENT_BOOTSTRAP_LOCALES,
    writeStdout: (value) => process.stdout.write(value),
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
