import './load-app-env';

import { MongoClient, type Collection, type Db, type Document } from 'mongodb';

type MigrationCollection = {
  source: string;
  target: string;
  mode?: 'productIntegrations' | 'productIntegrationConnections';
  filter?: Document;
};

type CliOptions = {
  apply: boolean;
  replaceTarget: boolean;
  sourceUri: string;
  sourceDb: string;
  targetUri: string;
  targetDb: string;
};

const PRODUCT_COMMERCE_INTEGRATION_SLUGS = [
  '1688',
  'allegro',
  'base',
  'base-com',
  'baselinker',
  'scraped-source',
  'tradera',
  'tradera-api',
  'vinted',
] as const;

const PRODUCT_COLLECTIONS: MigrationCollection[] = [
  { source: 'products', target: 'products' },
  { source: 'product_drafts', target: 'product_drafts' },
  { source: 'product_categories', target: 'product_categories' },
  { source: 'product_parameters', target: 'product_parameters' },
  { source: 'product_listings', target: 'product_listings' },
  { source: 'product_imported_orders', target: 'product_imported_orders' },
  { source: 'product_orders', target: 'product_orders' },
  { source: 'orders', target: 'orders' },
  { source: 'ecom_orders', target: 'ecom_orders' },
  { source: 'product_ai_jobs', target: 'product_ai_jobs' },
  { source: 'product_scans', target: 'product_scans' },
  { source: 'product_shipping_groups', target: 'product_shipping_groups' },
  { source: 'product_custom_fields', target: 'product_custom_fields' },
  { source: 'product_tags', target: 'product_tags' },
  { source: 'product_producers', target: 'product_producers' },
  { source: 'product_title_terms', target: 'product_title_terms' },
  { source: 'product_validation_patterns', target: 'product_validation_patterns' },
  { source: 'product_studio_run_audit', target: 'product_studio_run_audit' },
  { source: 'catalogs', target: 'catalogs' },
  { source: 'price_groups', target: 'price_groups' },
  { source: 'currencies', target: 'currencies' },
  { source: 'languages', target: 'languages' },
  { source: 'integrations', target: 'integrations', mode: 'productIntegrations' },
  {
    source: 'integration_connections',
    target: 'integration_connections',
    mode: 'productIntegrationConnections',
  },
  { source: 'external_categories', target: 'external_categories' },
  { source: 'external_producers', target: 'external_producers' },
  { source: 'external_tags', target: 'external_tags' },
  { source: 'category_mappings', target: 'category_mappings' },
  { source: 'producer_mappings', target: 'producer_mappings' },
  { source: 'tag_mappings', target: 'tag_mappings' },
  {
    source: 'integration_amazon_selector_registry',
    target: 'integration_amazon_selector_registry',
  },
  {
    source: 'integration_custom_selector_registry',
    target: 'integration_custom_selector_registry',
  },
  {
    source: 'integration_custom_selector_registry_profiles',
    target: 'integration_custom_selector_registry_profiles',
  },
  {
    source: 'integration_selector_registry_probe_sessions',
    target: 'integration_selector_registry_probe_sessions',
  },
  {
    source: 'integration_supplier_1688_selector_registry',
    target: 'integration_supplier_1688_selector_registry',
  },
  {
    source: 'integration_tradera_selector_registry',
    target: 'integration_tradera_selector_registry',
  },
  { source: 'tags', target: 'tags' },
  { source: 'ecom_wishlists', target: 'ecom_wishlists' },
  { source: 'users', target: 'ecom_users' },
  {
    source: 'settings',
    target: 'settings',
    filter: {
      $or: [
        { key: /^product/i },
        { _id: /^product/i },
        { key: /^scanner_config$/i },
        { _id: /^scanner_config$/i },
        { key: /^scanner_1688/i },
        { _id: /^scanner_1688/i },
        { key: /^base_import/i },
        { _id: /^base_import/i },
        { key: /^base_export/i },
        { _id: /^base_export/i },
        { key: /^tradera_export/i },
        { _id: /^tradera_export/i },
        { key: /^vinted_export/i },
        { _id: /^vinted_export/i },
      ],
    },
  },
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

const collectionExists = async (db: Db, collection: string): Promise<boolean> => {
  const matches = await db.listCollections({ name: collection }, { nameOnly: true }).toArray();
  return matches.length > 0;
};

const getProductCommerceIntegrationIds = async (db: Db): Promise<unknown[]> => {
  if (!(await collectionExists(db, 'integrations'))) return [];
  const docs = await db
    .collection('integrations')
    .find(
      { slug: { $in: [...PRODUCT_COMMERCE_INTEGRATION_SLUGS] } },
      { projection: { _id: 1 } }
    )
    .toArray();

  const ids = new Map<string, unknown>();
  for (const doc of docs) {
    const id = doc['_id'];
    ids.set(`raw:${String(id)}`, id);
    ids.set(`string:${String(id)}`, String(id));
  }
  return [...ids.values()];
};

const resolveCollectionFilter = async (
  sourceDb: Db,
  collection: MigrationCollection
): Promise<Document> => {
  if (collection.mode === 'productIntegrations') {
    return { slug: { $in: [...PRODUCT_COMMERCE_INTEGRATION_SLUGS] } };
  }
  if (collection.mode === 'productIntegrationConnections') {
    return { integrationId: { $in: await getProductCommerceIntegrationIds(sourceDb) } };
  }
  return collection.filter ?? {};
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

  const filter = await resolveCollectionFilter(sourceDb, collection);
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
        'Product List now uses the main app database. ' +
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
