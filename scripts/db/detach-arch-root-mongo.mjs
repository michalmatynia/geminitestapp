import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BSON, MongoClient } from 'mongodb';

import {
  buildMongoOptions,
  collectArchMongoSelections,
  parseDbNameFromUri,
} from './arch-mongo-selection.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const skipTargetCheck = args.has('--skip-target-check');
const expectedConfirm = 'detach-arch-from-root';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const getArgValue = (name, fallback = '') => {
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
const backupRootDir = getArgValue(
  '--backup-dir',
  path.join(repoRoot, 'apps', 'arch-web', 'mongo', 'runtime', 'root-detach-backups')
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

const sameMongoDatabase = () => {
  if (sourceDbName !== targetDbName) return false;
  try {
    const source = new URL(sourceUri);
    const target = new URL(targetUri);
    return source.host === target.host && source.protocol === target.protocol;
  } catch {
    return sourceUri === targetUri;
  }
};

const getNaturalKeyFilter = (doc, naturalKeys = []) => {
  for (const key of naturalKeys) {
    const value = doc?.[key];
    if (value !== null && value !== undefined && String(value).trim().length > 0) {
      return { [key]: value };
    }
  }
  return null;
};

const getTargetMatchFilter = (doc, selection) => {
  const naturalKeyFilter = getNaturalKeyFilter(doc, selection.naturalKeys);
  if (naturalKeyFilter === null) {
    return { _id: doc._id };
  }
  return { $or: [{ _id: doc._id }, naturalKeyFilter] };
};

const countSelections = async (db, selections) => {
  const counts = {};
  for (const { name, filter } of selections) {
    counts[name] = await db.collection(name).countDocuments(filter);
  }
  return counts;
};

const buildBackupPath = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(backupRootDir, stamp);
};

const writeJson = async (filePath, value) => {
  await fs.writeFile(filePath, `${BSON.EJSON.stringify(value, null, 2, { relaxed: false })}\n`);
};

const backupSelections = async ({ sourceDb, selections, sourceCounts }) => {
  const backupDir = buildBackupPath();
  const backupCounts = {};
  const backedUpIdsByCollection = {};

  await fs.mkdir(backupDir, { recursive: true });

  for (const selection of selections) {
    const docs = await sourceDb.collection(selection.name).find(selection.filter).toArray();
    backupCounts[selection.name] = docs.length;
    backedUpIdsByCollection[selection.name] = docs.map((doc) => doc._id);
    await writeJson(path.join(backupDir, `${selection.name}.json`), docs);
  }

  await writeJson(path.join(backupDir, 'metadata.json'), {
    app: 'arch-web',
    createdAt: new Date(),
    source: { uri: sourceUri, database: sourceDbName },
    target: skipTargetCheck ? null : { uri: targetUri, database: targetDbName },
    sourceCounts,
    backupCounts,
  });

  return {
    dir: backupDir,
    collections: backupCounts,
    backedUpIdsByCollection,
  };
};

const validateTargetCopy = async ({ sourceDb, targetDb, selections }) => {
  const metadata = await targetDb
    .collection('arch_database_metadata')
    .findOne({ _id: 'local-arch-db' });

  if (!metadata) {
    fail('Refusing to detach root data before the Arch target database has copy metadata.', {
      expectedMetadata: 'arch_database_metadata/local-arch-db',
      remedy: 'Run npm run mongo:copy-from-root -w @app/arch-web first.',
    });
  }

  const targetCounts = await countSelections(targetDb, selections);
  const targetMatchedSourceDocs = {};
  const shortCollections = {};

  for (const selection of selections) {
    const docs = await sourceDb.collection(selection.name).find(selection.filter).toArray();
    let matched = 0;
    for (const doc of docs) {
      const targetDoc = await targetDb.collection(selection.name).findOne(
        getTargetMatchFilter(doc, selection),
        { projection: { _id: 1 } }
      );
      if (targetDoc !== null) matched += 1;
    }
    targetMatchedSourceDocs[selection.name] = matched;
    if (matched < docs.length) {
      shortCollections[selection.name] = {
        sourceCount: docs.length,
        targetMatchedSourceDocs: matched,
      };
    }
  }

  if (Object.keys(shortCollections).length > 0) {
    fail('Refusing to detach root data because the Arch target is missing source documents.', {
      shortCollections,
      remedy: 'Re-run npm run mongo:copy-from-root -w @app/arch-web, then run this detach plan again.',
    });
  }

  return { metadata, targetCounts, targetMatchedSourceDocs };
};

if (apply && getArgValue('--confirm') !== expectedConfirm) {
  fail('Refusing destructive detach without the exact confirmation flag.', {
    requiredFlag: `--confirm=${expectedConfirm}`,
  });
}

if (sameMongoDatabase()) {
  fail('Refusing to detach because source and target resolve to the same MongoDB database.', {
    source: { uri: sourceUri, database: sourceDbName },
    target: { uri: targetUri, database: targetDbName },
  });
}

const sourceClient = new MongoClient(sourceUri, buildMongoOptions(sourceUri));
const targetClient = skipTargetCheck ? null : new MongoClient(targetUri, buildMongoOptions(targetUri));

try {
  await sourceClient.connect();
  const sourceDb = sourceClient.db(sourceDbName);
  const { selections } = await collectArchMongoSelections(sourceDb);
  const sourceCounts = await countSelections(sourceDb, selections);
  const targetValidation = targetClient
    ? await targetClient.connect().then(() =>
        validateTargetCopy({
          sourceDb,
          targetDb: targetClient.db(targetDbName),
          selections,
        })
      )
    : null;

  const deleted = {};
  let backup = null;
  if (apply) {
    backup = await backupSelections({ sourceDb, selections, sourceCounts });

    for (const { name } of selections) {
      const backedUpIds = backup.backedUpIdsByCollection[name] ?? [];
      if (backedUpIds.length === 0) {
        deleted[name] = 0;
        continue;
      }

      const result = await sourceDb.collection(name).deleteMany({ _id: { $in: backedUpIds } });
      deleted[name] = result.deletedCount;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? 'apply' : 'plan',
        source: { uri: sourceUri, database: sourceDbName },
        target: skipTargetCheck ? null : { uri: targetUri, database: targetDbName },
        targetCopyChecked: !skipTargetCheck,
        requiredApplyFlag: `--confirm=${expectedConfirm}`,
        backup: backup ? { dir: backup.dir, collections: backup.collections } : null,
        collections: apply ? deleted : sourceCounts,
        targetCollections: targetValidation?.targetCounts,
        targetMatchedSourceDocs: targetValidation?.targetMatchedSourceDocs,
      },
      null,
      2
    )
  );
} finally {
  await Promise.allSettled([
    sourceClient.close(),
    ...(targetClient ? [targetClient.close()] : []),
  ]);
}
