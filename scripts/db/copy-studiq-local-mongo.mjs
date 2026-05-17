import { MongoClient } from 'mongodb';

import {
  buildMongoOptions,
  collectStudiqMongoSelections,
  parseDbNameFromUri,
} from './studiq-mongo-selection.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const allowEmptySource = args.has('--allow-empty-source');

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
  process.env.STUDIQ_MONGODB_URI?.trim() ||
    process.env.MONGODB_STUDIQ_URI?.trim() ||
    'mongodb://127.0.0.1:27018/studiq_local'
);
const targetDbName = getArgValue(
  '--target-db',
  process.env.STUDIQ_MONGODB_DB?.trim() ||
    process.env.MONGODB_STUDIQ_DB?.trim() ||
    parseDbNameFromUri(targetUri, 'studiq_local')
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

const getUpdatedAtTime = (doc) => {
  const value = doc?.updatedAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const shouldReplaceTargetDoc = ({ sourceDoc, targetDoc }) => {
  if (!targetDoc) return true;
  const sourceUpdatedAt = getUpdatedAtTime(sourceDoc);
  const targetUpdatedAt = getUpdatedAtTime(targetDoc);
  return sourceUpdatedAt !== null && targetUpdatedAt !== null && sourceUpdatedAt > targetUpdatedAt;
};

const planCollectionCopy = async ({ sourceDb, targetDb, name, filter = {} }) => {
  const docs = await sourceDb.collection(name).find(filter).toArray();
  const targetCount = await targetDb.collection(name).countDocuments(filter);

  return { name, filter, docs, targetCount };
};

const mergeCollectionDocs = async ({ targetDb, name, docs }) => {
  const collection = targetDb.collection(name);
  let inserted = 0;
  let replaced = 0;
  let preserved = 0;

  for (const sourceDoc of docs) {
    const targetDoc = await collection.findOne({ _id: sourceDoc._id });
    if (!targetDoc) {
      await collection.insertOne(sourceDoc);
      inserted += 1;
      continue;
    }

    if (shouldReplaceTargetDoc({ sourceDoc, targetDoc })) {
      await collection.replaceOne({ _id: sourceDoc._id }, sourceDoc);
      replaced += 1;
      continue;
    }

    preserved += 1;
  }

  return {
    source: docs.length,
    inserted,
    replaced,
    preserved,
  };
};

const sourceClient = new MongoClient(sourceUri, buildMongoOptions(sourceUri));
const targetClient = new MongoClient(targetUri, buildMongoOptions(targetUri));

try {
  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = targetClient.db(targetDbName);
  const { selections } = await collectStudiqMongoSelections(sourceDb);
  const targetMetadata = await targetDb
    .collection('studiq_database_metadata')
    .findOne({ _id: 'local-studiq-db' });
  const targetInitialized = Boolean(targetMetadata);

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
  if (apply && targetInitialized && sourceTotal === 0 && !allowEmptySource) {
    fail('Refusing to copy from an empty StudiQ root source into an initialized target database.', {
      targetMetadata: 'studiq_database_metadata/local-studiq-db',
      requiredFlag: '--allow-empty-source',
      remedy: 'This usually means root data was already detached. Use the existing StudiQ target database instead.',
    });
  }

  const copied = {};
  if (apply) {
    for (const { name, docs } of copyPlans) {
      copied[name] = await mergeCollectionDocs({ targetDb, name, docs });
    }
  } else {
    for (const { name, docs, targetCount } of copyPlans) {
      copied[name] = { source: docs.length, target: targetCount };
    }
  }

  if (apply) {
    await targetDb.collection('studiq_database_metadata').updateOne(
      { _id: 'local-studiq-db' },
      {
        $set: {
          app: 'studiq-web',
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
