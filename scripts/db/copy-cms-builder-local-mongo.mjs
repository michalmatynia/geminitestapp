import { MongoClient } from 'mongodb';

import {
  buildMongoOptions,
  collectCmsBuilderMongoSelections,
  parseDbNameFromUri,
} from './cms-builder-mongo-selection.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

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

const getIdKey = (id) => {
  if (id && typeof id === 'object' && typeof id.toHexString === 'function') {
    return id.toHexString();
  }
  return JSON.stringify(id);
};

const planCollectionCopy = async ({ sourceDb, targetDb, name, filter = {} }) => {
  const docs = await sourceDb.collection(name).find(filter).toArray();
  const sourceIds = docs.map((doc) => doc._id).filter((id) => id !== undefined);
  const targetIds =
    sourceIds.length > 0
      ? await targetDb
          .collection(name)
          .find({ _id: { $in: sourceIds } }, { projection: { _id: 1 } })
          .toArray()
      : [];
  const existingTargetIdKeys = new Set(targetIds.map((doc) => getIdKey(doc._id)));
  const missingDocs = docs.filter((doc) => !existingTargetIdKeys.has(getIdKey(doc._id)));
  const targetMatchingCount = await targetDb.collection(name).countDocuments(filter);

  return { name, filter, docs, missingDocs, targetMatchingCount };
};

const sourceClient = new MongoClient(sourceUri, buildMongoOptions(sourceUri));
const targetClient = new MongoClient(targetUri, buildMongoOptions(targetUri));

try {
  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = targetClient.db(targetDbName);
  const { selections } = await collectCmsBuilderMongoSelections(sourceDb);
  const copyPlans = [];
  for (const { name, filter } of selections) {
    copyPlans.push(
      await planCollectionCopy({
        sourceDb,
        targetDb,
        name,
        filter,
      })
    );
  }

  const sourceTotal = copyPlans.reduce((total, plan) => total + plan.docs.length, 0);
  const copied = {};
  const targetExisting = {};
  if (apply) {
    for (const { name, missingDocs, targetMatchingCount } of copyPlans) {
      if (missingDocs.length > 0) {
        await targetDb.collection(name).insertMany(missingDocs, { ordered: false });
      }
      copied[name] = missingDocs.length;
      targetExisting[name] = targetMatchingCount;
    }
  } else {
    for (const { name, missingDocs, targetMatchingCount } of copyPlans) {
      copied[name] = missingDocs.length;
      targetExisting[name] = targetMatchingCount;
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
          sourceTotal,
          targetExistingCollections: targetExisting,
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
        sourceTotal,
        insertedMissingCollections: copied,
        targetExistingCollections: targetExisting,
      },
      null,
      2
    )
  );
} finally {
  await Promise.allSettled([sourceClient.close(), targetClient.close()]);
}
