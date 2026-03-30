import 'dotenv/config';

import { getMongoClient } from '@/shared/lib/db/mongo-client';
import {
  KANGUR_CONTENT_BOOTSTRAP_LOCALES,
} from '@/features/kangur/server/kangur-content-bootstrap';
import { verifyKangurContentInMongo } from '@/features/kangur/server/kangur-content-verification';
import { runKangurContentVerifyCli } from './lib/kangur-content-cli-runner';

const argv = process.argv.slice(2);

async function main(): Promise<void> {
  process.exitCode = await runKangurContentVerifyCli({
    argv,
    env: process.env,
    getMongoClient,
    locales: KANGUR_CONTENT_BOOTSTRAP_LOCALES,
    verify: verifyKangurContentInMongo,
    writeStdout: (value) => process.stdout.write(value),
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
