import { config as loadDotenv } from 'dotenv';
import { MongoClient } from 'mongodb';

loadDotenv({ path: '.env', override: false, quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const TITLE_TERMS_COLLECTION = 'product_title_terms';
const TITLE_TERM_TYPES = new Set(['size', 'material', 'theme']);
const DEFAULT_PRODUCTS_URI = 'mongodb://127.0.0.1:27020/products_local';
const GLOBAL_TITLE_TERM_CATALOG_ID = 'global';

const SHARED_NORMALIZED_INDEX = 'product_title_terms_type_normalized_name';
const SHARED_DISPLAY_INDEX = 'product_title_terms_type_display_name';
const LEGACY_INDEXES = [
  'product_title_terms_catalog_type_name',
  'product_title_terms_catalog_type_display_name',
];

const normalizeName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const normalizeTitleTermName = (value) => normalizeName(value).toLowerCase();

const parseArgs = (argv) => ({
  dryRun: !argv.includes('--write'),
});

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

const isValidTitleTermDoc = (doc) =>
  TITLE_TERM_TYPES.has(doc.type) &&
  normalizeName(doc.name_en).length > 0 &&
  normalizeTitleTermName(doc.normalizedNameEn || doc.name_en).length > 0;

const resolveIdentityKey = (doc) =>
  `${doc.type}:${normalizeTitleTermName(doc.normalizedNameEn || doc.name_en)}`;

const isGlobalDoc = (doc) => normalizeName(doc.catalogId) === GLOBAL_TITLE_TERM_CATALOG_ID;

const hasPolishTranslation = (doc) => normalizeName(doc.name_pl).length > 0;

const compareDates = (left, right) => {
  const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.createdAt instanceof Date ? right.createdAt.getTime() : Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime;
};

const compareTitleTermDocs = (left, right) => {
  if (isGlobalDoc(left) !== isGlobalDoc(right)) return isGlobalDoc(left) ? -1 : 1;
  if (hasPolishTranslation(left) !== hasPolishTranslation(right)) {
    return hasPolishTranslation(left) ? -1 : 1;
  }
  const createdAtOrder = compareDates(left, right);
  if (createdAtOrder !== 0) return createdAtOrder;
  return normalizeName(left.name_en).localeCompare(normalizeName(right.name_en), undefined, {
    sensitivity: 'base',
  });
};

const selectKeeper = (docs) => [...docs].sort(compareTitleTermDocs)[0];

const selectPolishTranslation = (docs, keeper) => {
  if (hasPolishTranslation(keeper)) return normalizeName(keeper.name_pl);
  const translatedDoc = docs.find(hasPolishTranslation);
  return translatedDoc ? normalizeName(translatedDoc.name_pl) : null;
};

const groupTitleTerms = (docs) => {
  const groups = new Map();
  docs.filter(isValidTitleTermDoc).forEach((doc) => {
    const key = resolveIdentityKey(doc);
    const existing = groups.get(key) ?? [];
    existing.push(doc);
    groups.set(key, existing);
  });
  return groups;
};

const createMigrationPlan = (docs) => {
  const groups = groupTitleTerms(docs);
  return Array.from(groups.values()).map((groupDocs) => {
    const keeper = selectKeeper(groupDocs);
    const normalizedNameEn = normalizeTitleTermName(keeper.normalizedNameEn || keeper.name_en);
    const nameEn = normalizeName(keeper.name_en);
    const namePl = selectPolishTranslation(groupDocs, keeper);
    const extras = groupDocs.filter((doc) => String(doc._id) !== String(keeper._id));
    return {
      keeper,
      extras,
      update: {
        catalogId: GLOBAL_TITLE_TERM_CATALOG_ID,
        type: keeper.type,
        name: nameEn,
        name_en: nameEn,
        name_pl: namePl,
        normalizedNameEn,
      },
    };
  });
};

const dropIndexIfExists = async (collection, name) => {
  const indexes = await collection.indexes();
  if (!indexes.some((index) => index.name === name)) return false;
  await collection.dropIndex(name);
  return true;
};

const ensureForwardIndexes = async (collection) => {
  const indexes = await collection.indexes();
  const sharedNormalizedIndex = indexes.find((index) => index.name === SHARED_NORMALIZED_INDEX);
  const droppedIndexes = [];

  if (sharedNormalizedIndex !== undefined && sharedNormalizedIndex.unique !== true) {
    await collection.dropIndex(SHARED_NORMALIZED_INDEX);
    droppedIndexes.push(SHARED_NORMALIZED_INDEX);
  }

  await collection.createIndex(
    { type: 1, normalizedNameEn: 1 },
    { unique: true, name: SHARED_NORMALIZED_INDEX }
  );
  await collection.createIndex({ type: 1, name_en: 1 }, { name: SHARED_DISPLAY_INDEX });

  for (const name of LEGACY_INDEXES) {
    if (await dropIndexIfExists(collection, name)) droppedIndexes.push(name);
  }

  return droppedIndexes;
};

const countRemainingLegacyRows = (collection) =>
  collection.countDocuments({
    catalogId: { $exists: true, $ne: GLOBAL_TITLE_TERM_CATALOG_ID },
    type: { $in: Array.from(TITLE_TERM_TYPES) },
  });

const findDuplicateGroups = (collection) =>
  collection
    .aggregate([
      {
        $group: {
          _id: { type: '$type', normalizedNameEn: '$normalizedNameEn' },
          count: { $sum: 1 },
          catalogIds: { $addToSet: '$catalogId' },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ])
    .toArray();

const applyMigrationPlan = async (collection, plan) => {
  const now = new Date();
  let deleted = 0;
  let updated = 0;

  for (const item of plan) {
    if (item.extras.length > 0) {
      const deleteResult = await collection.deleteMany({
        _id: { $in: item.extras.map((doc) => doc._id) },
      });
      deleted += deleteResult.deletedCount;
    }

    const updateResult = await collection.updateOne(
      { _id: item.keeper._id },
      {
        $set: {
          ...item.update,
          updatedAt: now,
        },
      }
    );
    updated += updateResult.modifiedCount;
  }

  return { deleted, updated };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const uri = resolveProductsUri();
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(resolveDbName(client, uri));
    const collection = db.collection(TITLE_TERMS_COLLECTION);
    const docs = await collection.find({}).toArray();
    const invalidDocs = docs.filter((doc) => !isValidTitleTermDoc(doc)).length;
    const plan = createMigrationPlan(docs);
    const plannedDeletes = plan.reduce((total, item) => total + item.extras.length, 0);
    const plannedGlobalizations = plan.filter((item) => !isGlobalDoc(item.keeper)).length;

    let migrationResult = { deleted: 0, updated: 0 };
    let droppedIndexes = [];
    if (!options.dryRun) {
      migrationResult = await applyMigrationPlan(collection, plan);
      droppedIndexes = await ensureForwardIndexes(collection);
    }

    const remainingLegacyRows = options.dryRun
      ? null
      : await countRemainingLegacyRows(collection);
    const duplicateGroups = options.dryRun ? [] : await findDuplicateGroups(collection);

    console.log(
      JSON.stringify(
        {
          mode: options.dryRun ? 'dry-run' : 'write',
          db: db.databaseName,
          totalRows: docs.length,
          validRows: docs.length - invalidDocs,
          invalidRows: invalidDocs,
          sharedGroups: plan.length,
          plannedDeletes,
          plannedGlobalizations,
          deleted: migrationResult.deleted,
          updated: migrationResult.updated,
          remainingLegacyRows,
          duplicateGroupsRemaining: duplicateGroups.length,
          droppedIndexes,
        },
        null,
        2
      )
    );

    if (!options.dryRun && (remainingLegacyRows !== 0 || duplicateGroups.length > 0)) {
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
};

void main().catch((error) => {
  console.error('Failed to prune product title term legacy catalogs:', error);
  process.exit(1);
});
