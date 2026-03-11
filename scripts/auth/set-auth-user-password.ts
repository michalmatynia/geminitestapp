import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  email: string | null;
  password: string | null;
  help: boolean;
};

type MongoUserDoc = {
  _id: { toString(): string };
  email?: string | null;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    email: null,
    password: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg.startsWith('--email=')) {
      const value = arg.slice('--email='.length).trim().toLowerCase();
      options.email = value.length > 0 ? value : null;
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
  console.log(
    'Usage: npm run auth:user:set-password -- --email=<email> --password=<password>'
  );
};

const closeResources = async (): Promise<void> => {
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

  if (!options.email) {
    throw new Error('Email is required.');
  }
  if (!options.password || options.password.length < 8) {
    throw new Error('A password with at least 8 characters is required.');
  }
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required.');
  }

  const passwordHash = await bcrypt.hash(options.password, 12);
  const db = await getMongoDb();
  const existing = await db.collection<MongoUserDoc>('users').findOne({ email: options.email });

  if (!existing) {
    throw new Error('Auth user not found in MongoDB.');
  }

  const user = existing as MongoUserDoc;

  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: 'mongodb',
        userId: user._id.toString(),
        email: options.email,
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
      'Failed to set auth user password:',
      error instanceof Error ? error.message : String(error)
    );
    await closeResources();
    process.exit(1);
  });
