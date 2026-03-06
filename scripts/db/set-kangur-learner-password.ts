import 'dotenv/config';

import {
  getKangurStoredLearnerById,
  getKangurStoredLearnerByLoginName,
  updateKangurLearner,
} from '@/features/kangur/services/kangur-learner-repository';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type CliOptions = {
  learnerId: string | null;
  loginName: string | null;
  password: string | null;
  help: boolean;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    learnerId: null,
    loginName: null,
    password: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg.startsWith('--learner-id=')) {
      const value = arg.slice('--learner-id='.length).trim();
      options.learnerId = value.length > 0 ? value : null;
      continue;
    }
    if (arg.startsWith('--login-name=')) {
      const value = arg.slice('--login-name='.length).trim().toLowerCase();
      options.loginName = value.length > 0 ? value : null;
      continue;
    }
    if (arg.startsWith('--password=')) {
      const value = arg.slice('--password='.length);
      options.password = value.length > 0 ? value : null;
    }
  }

  return options;
};

const printUsage = (): void => {
  console.log(`Usage: npm run kangur:learner:set-password -- --login-name=<name> --password=<password>
   or: npm run kangur:learner:set-password -- --learner-id=<id> --password=<password>

Exactly one selector is required: --login-name or --learner-id.`);
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const client = await getMongoClient().catch(() => null);
    await client?.close().catch(() => {});
  }
};

const run = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  if (!options.password || options.password.length < 8) {
    throw new Error('A password with at least 8 characters is required.');
  }

  const selectorCount = Number(Boolean(options.learnerId)) + Number(Boolean(options.loginName));
  if (selectorCount !== 1) {
    throw new Error('Provide exactly one selector: --learner-id or --login-name.');
  }

  const learner =
    options.learnerId !== null
      ? await getKangurStoredLearnerById(options.learnerId)
      : await getKangurStoredLearnerByLoginName(options.loginName ?? '');

  if (!learner) {
    throw new Error('Kangur learner not found.');
  }

  const updated = await updateKangurLearner(learner.id, {
    password: options.password,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        learnerId: updated.id,
        loginName: updated.loginName,
        displayName: updated.displayName,
        ownerUserId: updated.ownerUserId,
        status: updated.status,
      },
      null,
      2
    )
  );
};

void run()
  .then(async () => {
    await closeResources();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(
      'Failed to set Kangur learner password:',
      error instanceof Error ? error.message : String(error)
    );
    await closeResources();
    process.exit(1);
  });
