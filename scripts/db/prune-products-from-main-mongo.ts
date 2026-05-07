import './load-app-env';

import { MongoClient, type Db, type Document } from 'mongodb';

type PruneTarget = {
  collection: string;
  mode: 'drop' | 'deleteMany' | 'productIntegrations' | 'productIntegrationConnections';
  filter?: Document;
};

type CliOptions = {
  apply: boolean;
  confirmed: boolean;
  sourceUri: string;
  sourceDb: string;
};

const PRUNE_CONFIRMATION = 'products-main-prune';
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

const PRODUCT_PRUNE_TARGETS: PruneTarget[] = [
  { collection: 'products', mode: 'drop' },
  { collection: 'product_drafts', mode: 'drop' },
  { collection: 'product_categories', mode: 'drop' },
  { collection: 'product_parameters', mode: 'drop' },
  { collection: 'product_listings', mode: 'drop' },
  { collection: 'product_imported_orders', mode: 'drop' },
  { collection: 'product_orders', mode: 'drop' },
  { collection: 'orders', mode: 'drop' },
  { collection: 'ecom_orders', mode: 'drop' },
  { collection: 'product_ai_jobs', mode: 'drop' },
  { collection: 'product_scans', mode: 'drop' },
  { collection: 'product_shipping_groups', mode: 'drop' },
  { collection: 'product_custom_fields', mode: 'drop' },
  { collection: 'product_tags', mode: 'drop' },
  { collection: 'product_producers', mode: 'drop' },
  { collection: 'product_title_terms', mode: 'drop' },
  { collection: 'product_validation_patterns', mode: 'drop' },
  { collection: 'product_studio_run_audit', mode: 'drop' },
  { collection: 'catalogs', mode: 'drop' },
  { collection: 'price_groups', mode: 'drop' },
  { collection: 'currencies', mode: 'drop' },
  { collection: 'languages', mode: 'drop' },
  { collection: 'integrations', mode: 'productIntegrations' },
  { collection: 'integration_connections', mode: 'productIntegrationConnections' },
  { collection: 'external_categories', mode: 'drop' },
  { collection: 'external_producers', mode: 'drop' },
  { collection: 'external_tags', mode: 'drop' },
  { collection: 'category_mappings', mode: 'drop' },
  { collection: 'producer_mappings', mode: 'drop' },
  { collection: 'tag_mappings', mode: 'drop' },
  { collection: 'integration_amazon_selector_registry', mode: 'drop' },
  { collection: 'integration_custom_selector_registry', mode: 'drop' },
  { collection: 'integration_custom_selector_registry_profiles', mode: 'drop' },
  { collection: 'integration_selector_registry_probe_sessions', mode: 'drop' },
  { collection: 'integration_supplier_1688_selector_registry', mode: 'drop' },
  { collection: 'integration_tradera_selector_registry', mode: 'drop' },
  { collection: 'tags', mode: 'drop' },
  { collection: 'ecom_wishlists', mode: 'drop' },
  {
    collection: 'settings',
    mode: 'deleteMany',
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

const pruneTarget = async (
  db: Db,
  target: PruneTarget,
  options: CliOptions
): Promise<{ collection: string; mode: string; matchedCount: number; pruned: boolean }> => {
  if (!(await collectionExists(db, target.collection))) {
    return { collection: target.collection, mode: target.mode, matchedCount: 0, pruned: false };
  }

  const collection = db.collection(target.collection);
  const filter =
    target.mode === 'productIntegrations'
      ? { slug: { $in: [...PRODUCT_COMMERCE_INTEGRATION_SLUGS] } }
      : target.mode === 'productIntegrationConnections'
        ? { integrationId: { $in: await getProductCommerceIntegrationIds(db) } }
        : target.filter ?? {};
  const matchedCount = await collection.countDocuments(filter);

  if (options.apply) {
    if (!options.confirmed) {
      throw new Error(`Refusing to prune without --confirm=${PRUNE_CONFIRMATION}.`);
    }
    if (target.mode === 'drop') {
      await collection.drop();
    } else {
      await collection.deleteMany(filter);
    }
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
