import { MongoClient } from 'mongodb';

import {
  buildMongoOptions,
  collectArchMongoSelections,
  parseDbNameFromUri,
} from './arch-mongo-selection.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

const getArgValue = (name, fallback) => {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
};

const sourceUri = getArgValue(
  '--source-uri',
  process.env.ROOT_MONGODB_URI?.trim() ||
    process.env.MONGODB_LOCAL_URI?.trim() ||
    'mongodb://127.0.0.1:27017/app'
);
const sourceDbName = getArgValue(
  '--source-db',
  process.env.ROOT_MONGODB_DB?.trim() ||
    process.env.MONGODB_LOCAL_DB?.trim() ||
    parseDbNameFromUri(sourceUri, 'app')
);
const targetUri = getArgValue(
  '--target-uri',
  process.env.ARCH_MONGODB_LOCAL_URI?.trim() ||
    process.env.MONGODB_ARCH_LOCAL_URI?.trim() ||
    process.env.ARCH_MONGODB_URI?.trim() ||
    process.env.MONGODB_ARCH_URI?.trim() ||
    'mongodb://127.0.0.1:27022/arch_web_local'
);
const targetDbName = getArgValue(
  '--target-db',
  process.env.ARCH_MONGODB_LOCAL_DB?.trim() ||
    process.env.MONGODB_ARCH_LOCAL_DB?.trim() ||
    process.env.ARCH_MONGODB_DB?.trim() ||
    process.env.MONGODB_ARCH_DB?.trim() ||
    parseDbNameFromUri(targetUri, 'arch_web_local')
);

const getNaturalKeyFilter = (doc, naturalKeys = []) => {
  for (const key of naturalKeys) {
    const value = doc?.[key];
    if (value !== null && value !== undefined && String(value).trim().length > 0) {
      return { [key]: value };
    }
  }
  return null;
};

const normalizeArchLogDoc = ({ doc, collectionName, targetDbName }) => {
  if (collectionName !== 'system_logs' && collectionName !== 'error_logs' && collectionName !== 'activity_logs') {
    return doc;
  }
  const id = doc.id ?? String(doc._id);
  return {
    ...doc,
    id,
    applicationId: 'arch',
    applicationName: 'Milkbar Designers',
    sourceService: doc.sourceService ?? doc.service ?? doc.source ?? 'milkbar-cms',
    originDatabase: targetDbName,
    originCollection: collectionName,
    originLogId: doc.originLogId ?? id,
  };
};

const planCollectionCopy = async ({ sourceDb, targetDb, selection }) => {
  const docs = await sourceDb.collection(selection.name).find(selection.filter).toArray();
  const targetCount = await targetDb.collection(selection.name).countDocuments(selection.filter);

  return { ...selection, docs, targetCount };
};

const copyCollectionDocs = async ({ targetDb, plan }) => {
  const collection = targetDb.collection(plan.name);
  let inserted = 0;
  let preservedById = 0;
  let preservedByNaturalKey = 0;

  for (const sourceDoc of plan.docs) {
    const targetById = await collection.findOne({ _id: sourceDoc._id });
    if (targetById !== null) {
      preservedById += 1;
      continue;
    }

    const naturalKeyFilter = getNaturalKeyFilter(sourceDoc, plan.naturalKeys);
    if (naturalKeyFilter !== null) {
      const targetByNaturalKey = await collection.findOne(naturalKeyFilter);
      if (targetByNaturalKey !== null) {
        preservedByNaturalKey += 1;
        continue;
      }
    }

    await collection.insertOne(
      normalizeArchLogDoc({
        doc: sourceDoc,
        collectionName: plan.name,
        targetDbName,
      })
    );
    inserted += 1;
  }

  return {
    source: plan.docs.length,
    inserted,
    preservedById,
    preservedByNaturalKey,
  };
};

const sourceClient = new MongoClient(sourceUri, buildMongoOptions(sourceUri));
const targetClient = new MongoClient(targetUri, buildMongoOptions(targetUri));

try {
  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = targetClient.db(targetDbName);
  const { selections } = await collectArchMongoSelections(sourceDb);
  const copyPlans = [];

  for (const selection of selections) {
    copyPlans.push(await planCollectionCopy({ sourceDb, targetDb, selection }));
  }

  const copied = {};
  if (apply) {
    for (const plan of copyPlans) {
      copied[plan.name] = await copyCollectionDocs({ targetDb, plan });
    }
    await targetDb.collection('arch_database_metadata').updateOne(
      { _id: 'local-arch-db' },
      {
        $set: {
          app: 'arch-web',
          database: targetDbName,
          sourceDatabase: sourceDbName,
          copiedCollections: copied,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } else {
    for (const plan of copyPlans) {
      copied[plan.name] = {
        source: plan.docs.length,
        target: plan.targetCount,
        scope: plan.scope,
      };
    }
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
