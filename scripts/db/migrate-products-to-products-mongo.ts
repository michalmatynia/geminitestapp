import './load-app-env';

import { MongoClient, type Collection, type Db, type Document } from 'mongodb';

type MigrationCollection = {
  source: string;
  target: string;
};

type CliOptions = {
  apply: boolean;
  replaceTarget: boolean;
  sourceUri: string;
  sourceDb: string;
  targetUri: string;
  targetDb: string;
};

const PRODUCT_COLLECTIONS: MigrationCollection[] = [
  { source: 'products', target: 'products' },
  { source: 'product_categories', target: 'product_categories' },
  { source: 'product_parameters', target: 'product_parameters' },
  { source: 'product_shipping_groups', target: 'product_shipping_groups' },
  { source: 'product_custom_fields', target: 'product_custom_fields' },
  { source: 'product_tags', target: 'product_tags' },
  { source: 'product_producers', target: 'product_producers' },
  { source: 'catalogs', target: 'catalogs' },
  { source: 'price_groups', target: 'price_groups' },
  { source: 'currencies', target: 'currencies' },
  { source: 'languages', target: 'languages' },
];

const readEnv = (key: string): string => process.env[key]?.trim() ?? '';
const RETIRED_MIGRATION_OVERRIDE_ENV = 'ALLOW_RETIRED_PRODUCTS_DB_MIGRATION';

const resolveMainUri = (): string =>
  readEnv('MONGODB_URI') || readEnv('MONGODB_LOCAL_URI') || 'mongodb://127.0.0.1:27017/app';

const resolveMainDb = (): string =>
  readEnv('MONGODB_DB') || readEnv('MONGODB_LOCAL_DB') || 'app';

const resolveProductsUri = (): string =>
  readEnv('PRODUCTS_MONGODB_LOCAL_URI') ||
  readEnv('MONGODB_PRODUCTS_LOCAL_URI') ||
  readEnv('PRODUCTS_MONGODB_URI') ||
  readEnv('MONGODB_PRODUCTS_URI') ||
  'mongodb://127.0.0.1:27017/app';

const resolveProductsDb = (): string =>
  readEnv('PRODUCTS_MONGODB_LOCAL_DB') ||
  readEnv('MONGODB_PRODUCTS_LOCAL_DB') ||
  readEnv('PRODUCTS_MONGODB_DB') ||
  readEnv('MONGODB_PRODUCTS_DB') ||
  'app';

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    apply: false,
    replaceTarget: false,
    sourceUri: resolveMainUri(),
    sourceDb: resolveMainDb(),
    targetUri: resolveProductsUri(),
    targetDb: resolveProductsDb(),
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--replace-target') {
      options.replaceTarget = true;
      continue;
    }
    if (arg.startsWith('--source-uri=')) {
      options.sourceUri = arg.slice('--source-uri='.length);
      continue;
    }
    if (arg.startsWith('--source-db=')) {
      options.sourceDb = arg.slice('--source-db='.length);
      continue;
    }
    if (arg.startsWith('--target-uri=')) {
      options.targetUri = arg.slice('--target-uri='.length);
      continue;
    }
    if (arg.startsWith('--target-db=')) {
      options.targetDb = arg.slice('--target-db='.length);
    }
  }

  return options;
};

const copyIndexes = async (sourceCollection: Collection, targetCollection: Collection): Promise<void> => {
  const indexes = await sourceCollection.indexes().catch(() => []);
  for (const index of indexes) {
    if (index.name === '_id_') continue;
    const { key, name, ns, v, ...options } = index;
    void ns;
    void v;
    if (!key || typeof key !== 'object') continue;
    await targetCollection.createIndex(key as Document, { ...options, name }).catch(() => undefined);
  }
};

const copyCollection = async (
  sourceDb: Db,
  targetDb: Db,
  collection: MigrationCollection,
  options: CliOptions
): Promise<{ source: string; target: string; sourceCount: number; targetCount: number }> => {
  const sourceCollectionNames = new Set(
    (await sourceDb.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name)
  );
  const targetCollectionNames = new Set(
    (await targetDb.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name)
  );

  if (!sourceCollectionNames.has(collection.source)) {
    return {
      source: collection.source,
      target: collection.target,
      sourceCount: 0,
      targetCount: targetCollectionNames.has(collection.target)
        ? await targetDb.collection(collection.target).countDocuments()
        : 0,
    };
  }

  const filter: Document = {};
  const sourceCollection = sourceDb.collection(collection.source);
  const targetCollection = targetDb.collection(collection.target);
  const sourceCount = await sourceCollection.countDocuments(filter);

  if (options.apply) {
    if (options.replaceTarget && targetCollectionNames.has(collection.target)) {
      await targetCollection.drop();
    }

    const cursor = sourceCollection.find(filter, { noCursorTimeout: true });
    const batch: Document[] = [];
    for await (const document of cursor) {
      batch.push(document);
      if (batch.length >= 500) {
        await targetCollection.insertMany(batch, { ordered: false });
        batch.length = 0;
      }
    }
    if (batch.length > 0) {
      await targetCollection.insertMany(batch, { ordered: false });
    }

    await copyIndexes(sourceCollection, targetCollection);
  }

  return {
    source: collection.source,
    target: collection.target,
    sourceCount,
    targetCount: await targetCollection.countDocuments(filter),
  };
};

const run = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  const sourceMatchesTarget = options.sourceUri === options.targetUri && options.sourceDb === options.targetDb;
  if (sourceMatchesTarget && process.env[RETIRED_MIGRATION_OVERRIDE_ENV]?.trim().toLowerCase() !== 'true') {
    throw new Error(
      'Products migration to a separate local database is retired. ' +
        'The dedicated Products database is already in place. ' +
        `Set ${RETIRED_MIGRATION_OVERRIDE_ENV}=true only for a deliberate one-off legacy migration.`
    );
  }

  const sourceClient = new MongoClient(options.sourceUri, {
    directConnection: options.sourceUri.includes('127.0.0.1') || options.sourceUri.includes('localhost'),
  });
  const targetClient = new MongoClient(options.targetUri, {
    directConnection: options.targetUri.includes('127.0.0.1') || options.targetUri.includes('localhost'),
  });

  await sourceClient.connect();
  await targetClient.connect();

  try {
    const sourceDb = sourceClient.db(options.sourceDb);
    const targetDb = targetClient.db(options.targetDb);
    const results = [];
    for (const collection of PRODUCT_COLLECTIONS) {
      results.push(await copyCollection(sourceDb, targetDb, collection, options));
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          mode: options.apply ? 'apply' : 'plan',
          replaceTarget: options.replaceTarget,
          source: { uri: options.sourceUri.replace(/\/\/([^@/]+)@/, '//***@'), db: options.sourceDb },
          target: { uri: options.targetUri.replace(/\/\/([^@/]+)@/, '//***@'), db: options.targetDb },
          collections: results,
        },
        null,
        2
      )}\n`
    );
  } finally {
    await Promise.all([
      sourceClient.close().catch(() => undefined),
      targetClient.close().catch(() => undefined),
    ]);
  }
};

await run();
