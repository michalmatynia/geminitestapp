import type { KangurContentBootstrapSummary } from '@/features/kangur/server/kangur-content-bootstrap';
import type { KangurContentVerificationResult } from '@/features/kangur/server/kangur-content-verification';

import {
  buildKangurContentSyncCliOutput,
  buildKangurContentVerifyCliOutput,
} from './kangur-content-cli-output';

export const KANGUR_CONTENT_SYNC_MONGODB_URI_ERROR =
  'MONGODB_URI is required to sync the exact localhost-authored Kangur lesson snapshot into MongoDB.';

export const KANGUR_CONTENT_VERIFY_MONGODB_URI_ERROR =
  'MONGODB_URI is required to verify MongoDB against the localhost-authored Kangur lesson snapshot.';

type ClosableMongoClient = {
  close: () => Promise<void>;
};

type SyncCliOptions = {
  bootstrap: (locales: readonly string[]) => Promise<KangurContentBootstrapSummary>;
  env: Record<string, string | undefined>;
  getMongoClient: () => Promise<ClosableMongoClient>;
  locales: readonly string[];
  writeStdout: (value: string) => void;
};

type VerifyCliOptions = {
  argv: readonly string[];
  env: Record<string, string | undefined>;
  getMongoClient: () => Promise<ClosableMongoClient>;
  locales: readonly string[];
  verify: (locales: readonly string[]) => Promise<KangurContentVerificationResult>;
  writeStdout: (value: string) => void;
};

export const runKangurContentSyncCli = async ({
  bootstrap,
  env,
  getMongoClient,
  locales,
  writeStdout,
}: SyncCliOptions): Promise<number> => {
  if (!env['MONGODB_URI']) {
    throw new Error(KANGUR_CONTENT_SYNC_MONGODB_URI_ERROR);
  }

  const mongoClient = await getMongoClient();

  try {
    const summary = await bootstrap(locales);
    writeStdout(`${JSON.stringify(buildKangurContentSyncCliOutput(summary))}\n`);
    return 0;
  } finally {
    await mongoClient.close();
  }
};

export const runKangurContentVerifyCli = async ({
  argv,
  env,
  getMongoClient,
  locales,
  verify,
  writeStdout,
}: VerifyCliOptions): Promise<number> => {
  if (!env['MONGODB_URI']) {
    throw new Error(KANGUR_CONTENT_VERIFY_MONGODB_URI_ERROR);
  }

  const strict = argv.includes('--strict');
  const mongoClient = await getMongoClient();

  try {
    const summary = await verify(locales);
    writeStdout(`${JSON.stringify(buildKangurContentVerifyCliOutput(summary))}\n`);
    return strict && !summary.ok ? 1 : 0;
  } finally {
    await mongoClient.close();
  }
};
