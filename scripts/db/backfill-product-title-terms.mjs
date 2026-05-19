import { randomUUID } from 'node:crypto';
import { config as loadDotenv } from 'dotenv';
import { MongoClient } from 'mongodb';

loadDotenv({ path: '.env', override: false, quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const PRODUCT_COLLECTION = 'products';
const TITLE_TERMS_COLLECTION = 'product_title_terms';
const TITLE_TERM_TYPES = ['size', 'material', 'theme'];
const DEFAULT_PRODUCTS_URI = 'mongodb://127.0.0.1:27020/products_local';
const GLOBAL_TITLE_TERM_CATALOG_ID = 'global';
const SHARED_DISPLAY_INDEX = 'product_title_terms_type_display_name';
const SHARED_NORMALIZED_INDEX = 'product_title_terms_type_normalized_name';

const normalizeName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const normalizeTitleTermName = (value) => normalizeName(value).toLowerCase();

const parseArgs = (argv) => {
  const options = {
    dryRun: true,
    catalogId: null,
    type: null,
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg.startsWith('--catalog=')) {
      const catalogId = normalizeName(arg.slice('--catalog='.length));
      options.catalogId = catalogId || null;
      return;
    }
    if (arg.startsWith('--type=')) {
      const type = normalizeName(arg.slice('--type='.length)).toLowerCase();
      if (!TITLE_TERM_TYPES.includes(type)) {
        throw new Error(`Unsupported title term type "${type}". Use size, material, or theme.`);
      }
      options.type = type;
    }
  });

  return options;
};

const resolveProductsUri = () =>
  process.env.PRODUCTS_MONGODB_LOCAL_URI?.trim() ||
  process.env.PRODUCTS_MONGODB_URI?.trim() ||
  process.env.MONGODB_LOCAL_URI?.trim() ||
  DEFAULT_PRODUCTS_URI;

const resolveDbName = (client, uri) => {
  const parsed = new URL(uri);
  const dbName = parsed.pathname.replace(/^\//, '').trim();
  return dbName || client.db().databaseName || 'products_local';
};

const createProductMatch = (type, catalogId) => {
  const match = {
    [`structuredTitle.${type}`]: { $type: 'string', $ne: '' },
  };
  if (catalogId !== null) {
    match.$or = [{ catalogId }, { catalogIds: catalogId }, { 'catalogs.catalogId': catalogId }];
  }
  return match;
};

const buildStructuredTitleAggregation = (type, catalogId) => [
  { $match: createProductMatch(type, catalogId) },
  {
    $project: {
      name_en: `$structuredTitle.${type}`,
    },
  },
  {
    $match: {
      name_en: { $type: 'string', $ne: '' },
    },
  },
  {
    $group: {
      _id: {
        normalizedNameEn: { $toLower: '$name_en' },
      },
      name_en: { $first: '$name_en' },
      productCount: { $sum: 1 },
    },
  },
  { $sort: { name_en: 1 } },
];

const toTitleTermDoc = (type, item, now) => {
  const nameEn = normalizeName(item.name_en);
  return {
    id: randomUUID(),
    type,
    name: nameEn,
    name_en: nameEn,
    name_pl: null,
    normalizedNameEn: normalizeTitleTermName(nameEn),
    createdAt: now,
    updatedAt: now,
  };
};

const buildBulkOps = (type, items, now) =>
  items
    .map((item) => toTitleTermDoc(type, item, now))
    .filter((doc) => doc.name_en.length > 0)
    .map((doc) => ({
      updateOne: {
        filter: {
          catalogId: GLOBAL_TITLE_TERM_CATALOG_ID,
          type: doc.type,
          normalizedNameEn: doc.normalizedNameEn,
        },
        update: {
          $set: {
            catalogId: GLOBAL_TITLE_TERM_CATALOG_ID,
            updatedAt: now,
          },
          $setOnInsert: {
            id: doc.id,
            type: doc.type,
            name: doc.name,
            name_en: doc.name_en,
            name_pl: doc.name_pl,
            normalizedNameEn: doc.normalizedNameEn,
            createdAt: doc.createdAt,
          },
        },
        upsert: true,
      },
    }));

const backfillType = async ({ db, type, catalogId, dryRun }) => {
  const products = db.collection(PRODUCT_COLLECTION);
  const titleTerms = db.collection(TITLE_TERMS_COLLECTION);
  const candidates = await products
    .aggregate(buildStructuredTitleAggregation(type, catalogId), { allowDiskUse: true })
    .toArray();
  const now = new Date();
  const ops = buildBulkOps(type, candidates, now);

  if (dryRun || ops.length === 0) {
    return {
      type,
      candidates: candidates.length,
      attemptedUpserts: ops.length,
      inserted: 0,
      dryRun,
    };
  }

  const result = await titleTerms.bulkWrite(ops, { ordered: false });
  return {
    type,
    candidates: candidates.length,
    attemptedUpserts: ops.length,
    inserted: result.upsertedCount,
    modified: result.modifiedCount,
    dryRun,
  };
};

const createIndexIfMissing = async (collection, key, options) => {
  const indexes = await collection.indexes();
  if (indexes.some((index) => index.name === options.name)) return;
  await collection.createIndex(key, options);
};

const ensureTitleTermIndexes = async (db) => {
  const titleTerms = db.collection(TITLE_TERMS_COLLECTION);
  await Promise.all([
    createIndexIfMissing(titleTerms, { type: 1, name_en: 1 }, { name: SHARED_DISPLAY_INDEX }),
    createIndexIfMissing(
      titleTerms,
      { type: 1, normalizedNameEn: 1 },
      { name: SHARED_NORMALIZED_INDEX }
    ),
  ]);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const uri = resolveProductsUri();
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(resolveDbName(client, uri));
    await ensureTitleTermIndexes(db);
    const types = options.type === null ? TITLE_TERM_TYPES : [options.type];
    const results = [];
    for (const type of types) {
      results.push(
        await backfillType({
          db,
          type,
          catalogId: options.catalogId,
          dryRun: options.dryRun,
        })
      );
    }
    const summary = {
      mode: options.dryRun ? 'dry-run' : 'write',
      db: db.databaseName,
      catalogId: options.catalogId,
      results,
      insertedTotal: results.reduce((total, result) => total + result.inserted, 0),
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.close();
  }
};

void main().catch((error) => {
  console.error('Failed to backfill product title terms:', error);
  process.exit(1);
});
