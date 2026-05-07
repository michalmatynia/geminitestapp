import { MongoClient } from 'mongodb';

import {
  buildMongoOptions,
  collectCmsBuilderMongoSelections,
  parseDbNameFromUri,
} from './cms-builder-mongo-selection.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const allowEmptySource = args.has('--allow-empty-source');
const allowEmptyCollectionReplace = args.has('--allow-empty-collection-replace');

const getArgValue = (name, fallback) => {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
};

const sourceUri = getArgValue(
  '--source-uri',
  process.env.ROOT_MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/app'
);
const sourceDbName = getArgValue(
  '--source-db',
  process.env.ROOT_MONGODB_DB?.trim() || parseDbNameFromUri(sourceUri, 'app')
);
const targetUri = getArgValue(
  '--target-uri',
  process.env.CMS_BUILDER_MONGODB_URI?.trim() ||
    process.env.MONGODB_CMS_BUILDER_URI?.trim() ||
    process.env.CMS_BUILDER_MONGODB_LOCAL_URI?.trim() ||
    process.env.MONGODB_CMS_BUILDER_LOCAL_URI?.trim() ||
    'mongodb://127.0.0.1:27019/cms_builder_local'
);
const targetDbName = getArgValue(
  '--target-db',
  process.env.CMS_BUILDER_MONGODB_DB?.trim() ||
    process.env.MONGODB_CMS_BUILDER_DB?.trim() ||
    process.env.CMS_BUILDER_MONGODB_LOCAL_DB?.trim() ||
    process.env.MONGODB_CMS_BUILDER_LOCAL_DB?.trim() ||
    parseDbNameFromUri(targetUri, 'cms_builder_local')
);

const fail = (message, extra = {}) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message,
        ...extra,
      },
      null,
      2
    )
  );
  process.exit(1);
};

const planCollectionCopy = async ({ sourceDb, targetDb, targetInitialized, name, filter = {} }) => {
  const docs = await sourceDb.collection(name).find(filter).toArray();
  let targetCount = null;

  if (apply && targetInitialized && docs.length === 0) {
    targetCount = await targetDb.collection(name).countDocuments(filter);
    if (targetCount > 0 && !allowEmptyCollectionReplace) {
      fail('Refusing to replace existing CMS Builder target data with an empty source collection.', {
        collection: name,
        targetCount,
        requiredFlag: '--allow-empty-collection-replace',
      });
    }
  }

  return { name, filter, docs, targetCount };
};

const sourceClient = new MongoClient(sourceUri, buildMongoOptions(sourceUri));
const targetClient = new MongoClient(targetUri, buildMongoOptions(targetUri));

try {
  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = targetClient.db(targetDbName);
  const { selections } = await collectCmsBuilderMongoSelections(sourceDb);
  const targetMetadata = apply
    ? await targetDb
        .collection('cms_builder_database_metadata')
        .findOne({ _id: 'local-cms-builder-db' })
    : null;
  const targetInitialized = Boolean(targetMetadata);

  const copyPlans = [];
  for (const { name, filter } of selections) {
    copyPlans.push(
      await planCollectionCopy({
        sourceDb,
        targetDb,
        targetInitialized,
        name,
        filter,
      })
    );
  }

  const sourceTotal = copyPlans.reduce((total, plan) => total + plan.docs.length, 0);
  if (apply && targetInitialized && sourceTotal === 0 && !allowEmptySource) {
    fail('Refusing to copy from an empty CMS Builder root source into an initialized target database.', {
      targetMetadata: 'cms_builder_database_metadata/local-cms-builder-db',
      requiredFlag: '--allow-empty-source',
      remedy:
        'This usually means root data was already detached. Use the existing CMS Builder target database instead.',
    });
  }

  const copied = {};
  if (apply) {
    for (const { name, filter, docs } of copyPlans) {
      await targetDb.collection(name).deleteMany(filter);
      if (docs.length > 0) {
        await targetDb.collection(name).insertMany(docs, { ordered: false });
      }
      copied[name] = docs.length;
    }
  } else {
    for (const { name, docs } of copyPlans) {
      copied[name] = docs.length;
    }
  }

  if (apply) {
    await targetDb.collection('cms_builder_database_metadata').updateOne(
      { _id: 'local-cms-builder-db' },
      {
        $set: {
          app: 'cms-builder-web',
          database: targetDbName,
          sourceDatabase: sourceDbName,
          copiedCollections: copied,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? 'apply' : 'plan',
        source: { uri: sourceUri, database: sourceDbName },
        target: { uri: targetUri, database: targetDbName },
        collections: copied,
      },
      null,
      2
    )
  );
} finally {
  await Promise.allSettled([sourceClient.close(), targetClient.close()]);
}
