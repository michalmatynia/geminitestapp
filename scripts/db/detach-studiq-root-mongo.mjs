import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BSON, MongoClient } from 'mongodb';

import {
  buildMongoOptions,
  collectStudiqMongoSelections,
  parseDbNameFromUri,
} from './studiq-mongo-selection.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const skipTargetCheck = args.has('--skip-target-check');
const expectedConfirm = 'detach-studiq-from-root';
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
const backupRootDir = getArgValue(
  '--backup-dir',
  path.join(repoRoot, 'apps', 'studiq-web', 'mongo', 'runtime', 'root-detach-backups')
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

  for (const { name, filter } of selections) {
    const docs = await sourceDb.collection(name).find(filter).toArray();
    backupCounts[name] = docs.length;
    backedUpIdsByCollection[name] = docs.map((doc) => doc._id);
    await writeJson(path.join(backupDir, `${name}.json`), docs);
  }

  await writeJson(path.join(backupDir, 'metadata.json'), {
    app: 'studiq-web',
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

const validateTargetCopy = async ({ targetDb, selections, sourceCounts }) => {
  const metadata = await targetDb
    .collection('studiq_database_metadata')
    .findOne({ _id: 'local-studiq-db' });

  if (!metadata) {
    fail('Refusing to detach root data before the StudiQ target database has copy metadata.', {
      expectedMetadata: 'studiq_database_metadata/local-studiq-db',
      remedy: 'Run npm run mongo:copy-from-root -w @app/studiq-web first.',
    });
  }

  const targetCounts = await countSelections(targetDb, selections);
  const shortCollections = Object.fromEntries(
    Object.entries(sourceCounts).filter(([name, count]) => (targetCounts[name] ?? 0) < count)
  );

  if (Object.keys(shortCollections).length > 0) {
    fail('Refusing to detach root data because the StudiQ target has fewer matching documents.', {
      shortCollections,
      remedy: 'Re-run npm run mongo:copy-from-root -w @app/studiq-web, then run this detach plan again.',
    });
  }

  return { metadata, targetCounts };
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
  const { selections } = await collectStudiqMongoSelections(sourceDb);
  const sourceCounts = await countSelections(sourceDb, selections);
  const targetValidation = targetClient
    ? await targetClient.connect().then(() =>
        validateTargetCopy({
          targetDb: targetClient.db(targetDbName),
          selections,
          sourceCounts,
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
