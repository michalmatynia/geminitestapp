import './load-app-env';

import { MongoClient, type Db } from 'mongodb';

type PruneTarget = {
  collection: string;
  mode: 'drop';
};

type CliOptions = {
  apply: boolean;
  confirmed: boolean;
  sourceUri: string;
  sourceDb: string;
};

const PRUNE_CONFIRMATION = 'products-main-prune';
const RETIRED_PRUNE_OVERRIDE_ENV = 'ALLOW_RETIRED_PRODUCTS_MAIN_PRUNE';

const PRODUCT_PRUNE_TARGETS: PruneTarget[] = [
  { collection: 'products', mode: 'drop' },
  { collection: 'product_categories', mode: 'drop' },
  { collection: 'product_parameters', mode: 'drop' },
  { collection: 'product_shipping_groups', mode: 'drop' },
  { collection: 'product_custom_fields', mode: 'drop' },
  { collection: 'product_tags', mode: 'drop' },
  { collection: 'product_producers', mode: 'drop' },
  { collection: 'catalogs', mode: 'drop' },
  { collection: 'price_groups', mode: 'drop' },
  { collection: 'currencies', mode: 'drop' },
  { collection: 'languages', mode: 'drop' },
];

const readEnv = (key: string): string => process.env[key]?.trim() ?? '';

const resolveMainUri = (): string =>
  readEnv('MONGODB_URI') || readEnv('MONGODB_LOCAL_URI') || 'mongodb://127.0.0.1:27017/app';

const resolveMainDb = (): string =>
  readEnv('MONGODB_DB') || readEnv('MONGODB_LOCAL_DB') || 'app';

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    apply: false,
    confirmed: false,
    sourceUri: resolveMainUri(),
    sourceDb: resolveMainDb(),
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === `--confirm=${PRUNE_CONFIRMATION}`) {
      options.confirmed = true;
      continue;
    }
    if (arg.startsWith('--source-uri=')) {
      options.sourceUri = arg.slice('--source-uri='.length);
      continue;
    }
    if (arg.startsWith('--source-db=')) {
      options.sourceDb = arg.slice('--source-db='.length);
    }
  }

  return options;
};

const collectionExists = async (db: Db, collection: string): Promise<boolean> => {
  const matches = await db.listCollections({ name: collection }, { nameOnly: true }).toArray();
  return matches.length > 0;
};

const pruneTarget = async (
  db: Db,
  target: PruneTarget,
  options: CliOptions
): Promise<{ collection: string; mode: string; matchedCount: number; pruned: boolean }> => {
  if (!(await collectionExists(db, target.collection))) {
    return { collection: target.collection, mode: target.mode, matchedCount: 0, pruned: false };
  }

  const collection = db.collection(target.collection);
  const matchedCount = await collection.countDocuments();

  if (options.apply) {
    if (!options.confirmed) {
      throw new Error(`Refusing to prune without --confirm=${PRUNE_CONFIRMATION}.`);
    }
    await collection.drop();
  }

  return {
    collection: target.collection,
    mode: target.mode,
    matchedCount,
    pruned: options.apply,
  };
};

const run = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  if (process.env[RETIRED_PRUNE_OVERRIDE_ENV]?.trim().toLowerCase() !== 'true') {
    throw new Error(
      'Product pruning from the main MongoDB database is retired. ' +
        `Product List detach cleanup is complete; set ${RETIRED_PRUNE_OVERRIDE_ENV}=true ` +
        'only for a deliberate one-off legacy cleanup.'
    );
  }

  const client = new MongoClient(options.sourceUri, {
    directConnection: options.sourceUri.includes('127.0.0.1') || options.sourceUri.includes('localhost'),
  });

  await client.connect();

  try {
    const db = client.db(options.sourceDb);
    const results = [];
    for (const target of PRODUCT_PRUNE_TARGETS) {
      results.push(await pruneTarget(db, target, options));
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          mode: options.apply ? 'apply' : 'plan',
          source: { uri: options.sourceUri.replace(/\/\/([^@/]+)@/, '//***@'), db: options.sourceDb },
          confirmationRequired: PRUNE_CONFIRMATION,
          note: 'The shared users collection is intentionally not pruned because geminitestapp still uses it.',
          targets: results,
        },
        null,
        2
      )}\n`
    );
  } finally {
    await client.close().catch(() => undefined);
  }
};

await run();
