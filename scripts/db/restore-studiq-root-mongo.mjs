import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BSON, MongoClient } from 'mongodb';

import { buildMongoOptions, parseDbNameFromUri } from './studiq-mongo-selection.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const expectedConfirm = 'restore-studiq-root';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultBackupRoot = path.join(
  repoRoot,
  'apps',
  'studiq-web',
  'mongo',
  'runtime',
  'root-detach-backups'
);

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

const pathExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findLatestBackupDir = async () => {
  if (!(await pathExists(defaultBackupRoot))) {
    fail('No root detach backup directory exists.', {
      backupRoot: defaultBackupRoot,
      remedy: 'Pass --backup-dir=/path/to/root-detach-backup if the backup lives elsewhere.',
    });
  }

  const entries = await fs.readdir(defaultBackupRoot, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (directories.length === 0) {
    fail('No root detach backup snapshots were found.', { backupRoot: defaultBackupRoot });
  }

  return path.join(defaultBackupRoot, directories.at(-1));
};

const readBackupDir = async (backupDir) => {
  if (!(await pathExists(backupDir))) {
    fail('Backup directory does not exist.', { backupDir });
  }

  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const dataFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'metadata.json')
    .map((entry) => entry.name)
    .sort();
  const metadataPath = path.join(backupDir, 'metadata.json');
  const metadata = (await pathExists(metadataPath))
    ? BSON.EJSON.parse(await fs.readFile(metadataPath, 'utf8'))
    : null;
  const collections = [];

  for (const fileName of dataFiles) {
    const collectionName = fileName.replace(/\.json$/, '');
    const docs = BSON.EJSON.parse(await fs.readFile(path.join(backupDir, fileName), 'utf8'));
    if (!Array.isArray(docs)) {
      fail('Backup collection file did not contain an array.', {
        backupDir,
        file: fileName,
      });
    }
    collections.push({ name: collectionName, docs });
  }

  return { metadata, collections };
};

if (apply && getArgValue('--confirm') !== expectedConfirm) {
  fail('Refusing root restore without the exact confirmation flag.', {
    requiredFlag: `--confirm=${expectedConfirm}`,
  });
}

const backupDir = getArgValue('--backup-dir') || (await findLatestBackupDir());
const backup = await readBackupDir(backupDir);
const client = new MongoClient(sourceUri, buildMongoOptions(sourceUri));

try {
  await client.connect();
  const db = client.db(sourceDbName);
  const planned = {};
  const existing = {};
  const restored = {};

  for (const { name, docs } of backup.collections) {
    const ids = docs.map((doc) => doc._id).filter((id) => id !== undefined);
    planned[name] = docs.length;
    existing[name] = ids.length > 0 ? await db.collection(name).countDocuments({ _id: { $in: ids } }) : 0;
  }

  if (apply) {
    for (const { name, docs } of backup.collections) {
      const ids = docs.map((doc) => doc._id).filter((id) => id !== undefined);
      if (ids.length > 0) {
        await db.collection(name).deleteMany({ _id: { $in: ids } });
      }
      if (docs.length > 0) {
        await db.collection(name).insertMany(docs, { ordered: false });
      }
      restored[name] = docs.length;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? 'apply' : 'plan',
        source: { uri: sourceUri, database: sourceDbName },
        backupDir,
        backupMetadata: backup.metadata,
        requiredApplyFlag: `--confirm=${expectedConfirm}`,
        collections: apply ? restored : planned,
        existingRootDocuments: existing,
      },
      null,
      2
    )
  );
} finally {
  await client.close();
}
