#!/usr/bin/env node

import { randomUUID } from 'crypto';
import { MongoClient } from 'mongodb';

const ROOT_APP = {
  id: 'geminitestapp',
  name: 'GeminiTestApp',
  uri: env('MONGODB_LOCAL_URI', 'MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/app',
  dbName: env('MONGODB_LOCAL_DB', 'MONGODB_DB') ?? 'app',
};

const LOCAL_APPS = [
  {
    id: 'studiq',
    name: 'StudiQ',
    uri:
      env('STUDIQ_MONGODB_LOCAL_URI', 'MONGODB_STUDIQ_LOCAL_URI') ??
      'mongodb://127.0.0.1:27018/studiq_local',
    dbName: env('STUDIQ_MONGODB_LOCAL_DB', 'MONGODB_STUDIQ_LOCAL_DB') ?? 'studiq_local',
  },
  {
    id: 'cms-builder',
    name: 'CMS Builder',
    uri:
      env('CMS_BUILDER_MONGODB_LOCAL_URI', 'MONGODB_CMS_BUILDER_LOCAL_URI') ??
      'mongodb://127.0.0.1:27019/cms_builder_local',
    dbName:
      env('CMS_BUILDER_MONGODB_LOCAL_DB', 'MONGODB_CMS_BUILDER_LOCAL_DB') ??
      'cms_builder_local',
  },
  {
    id: 'stargater',
    name: 'Stargater',
    uri:
      env('ECOM_MONGODB_LOCAL_URI', 'MONGODB_ECOM_LOCAL_URI') ??
      'mongodb://127.0.0.1:27021/ecom_local',
    dbName: env('ECOM_MONGODB_LOCAL_DB', 'MONGODB_ECOM_LOCAL_DB') ?? 'ecom_local',
  },
  {
    id: 'arch',
    name: 'Milkbar Designers',
    uri:
      env('ARCH_MONGODB_LOCAL_URI', 'MONGODB_ARCH_LOCAL_URI') ??
      'mongodb://127.0.0.1:27022/arch_web_local',
    dbName: env('ARCH_MONGODB_LOCAL_DB', 'MONGODB_ARCH_LOCAL_DB') ?? 'arch_web_local',
  },
];

const args = new Set(process.argv.slice(2));
const shouldBackfillErrors = args.has('--backfill-errors');
const dryRun = args.has('--dry-run');
const targetApplication = getArgValue('--application');

function env(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : null;
}

function normalizeDate(value) {
  if (value instanceof Date) return value;
  const parsed = new Date(value ?? Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeLogId(doc) {
  const raw = doc.originLogId ?? doc.id ?? doc._id;
  return String(raw ?? randomUUID());
}

function buildOriginDoc(doc, app, collection) {
  const originLogId = normalizeLogId(doc);
  const next = {
    ...doc,
    id: doc.id ?? originLogId,
    applicationId: app.id,
    applicationName: doc.applicationName ?? app.name,
    environment: doc.environment ?? process.env.NODE_ENV ?? null,
    originDatabase: doc.originDatabase ?? app.dbName,
    originCollection: doc.originCollection ?? collection,
    originLogId,
    createdAt: normalizeDate(doc.createdAt),
    updatedAt: doc.updatedAt == null ? null : normalizeDate(doc.updatedAt),
  };
  delete next._id;
  return next;
}

async function connect(app) {
  const client = new MongoClient(app.uri, {
    serverSelectionTimeoutMS: 5000,
    directConnection: app.uri.includes('127.0.0.1') || app.uri.includes('localhost'),
  });
  await client.connect();
  return { client, db: client.db(app.dbName) };
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection('system_logs').createIndex({ createdAt: -1 }),
    db.collection('system_logs').createIndex({ applicationId: 1, createdAt: -1 }),
    db.collection('system_logs').createIndex({ applicationId: 1, originLogId: 1 }),
    db.collection('error_logs').createIndex({ createdAt: -1 }),
    db.collection('error_logs').createIndex({ applicationId: 1, createdAt: -1 }),
    db.collection('error_logs').createIndex({ applicationId: 1, originLogId: 1 }),
    db.collection('activity_logs').createIndex({ createdAt: -1 }),
    db.collection('activity_logs').createIndex({ applicationId: 1, createdAt: -1 }),
    db.collection('activity_logs').createIndex({ applicationId: 1, originLogId: 1 }),
  ]);
}

async function backfillLocalErrorLogs(db, app) {
  const errors = await db.collection('system_logs').find({ level: 'error' }).toArray();
  let mirrored = 0;
  for (const doc of errors) {
    const next = buildOriginDoc(doc, app, 'system_logs');
    if (!dryRun) {
      await db.collection('error_logs').updateOne(
        { applicationId: app.id, originLogId: next.originLogId },
        { $setOnInsert: next },
        { upsert: true }
      );
    }
    mirrored += 1;
  }
  return mirrored;
}

async function main() {
  const central = await connect(ROOT_APP);
  const appConnections = [];
  const apps = targetApplication
    ? LOCAL_APPS.filter((app) => app.id === targetApplication)
    : LOCAL_APPS;

  if (targetApplication && apps.length === 0) {
    throw new Error(`Unknown application "${targetApplication}".`);
  }

  try {
    await ensureIndexes(central.db);

    for (const app of apps) {
      const connection = await connect(app);
      appConnections.push(connection);
      await ensureIndexes(connection.db);

      const result = {
        application: app.id,
        localDatabase: connection.db.databaseName,
        centralizedRead: true,
        ensured: true,
        backfilledErrors: 0,
      };
      if (shouldBackfillErrors) {
        result.backfilledErrors = await backfillLocalErrorLogs(connection.db, app);
      }
      console.log(JSON.stringify(result));
    }
  } finally {
    await Promise.allSettled([
      central.client.close(),
      ...appConnections.map((connection) => connection.client.close()),
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
