import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { toPersistedFilemakerDatabase } from '@/features/filemaker/filemaker-settings.database';
import { repairFilemakerJobBoardLexicon } from '@/features/filemaker/server/job-board-scrape/lexicon-cleanup';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

type CliOptions = {
  dryRun: boolean;
};

type SettingDocument = {
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

let mongoTouched = false;

const writeBackupFile = async (value: string): Promise<string> => {
  const backupDir = path.join(process.cwd(), 'tmp', 'filemaker-job-board-lexicon-backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${FILEMAKER_DATABASE_KEY}-${timestamp}.json`);
  await mkdir(backupDir, { recursive: true });
  await writeFile(backupPath, value, 'utf8');
  return backupPath;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/repair-filemaker-job-board-lexicon.ts [--write]',
      '',
      'Dry-run by default. Promotes known job-board technologies out of Other and removes conservative Pracuj noise/location lexicon terms.',
      'Pass --write to update the filemaker_database_v1 setting.',
    ].join('\n')
  );
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { dryRun: true };

  argv.forEach((arg) => {
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
    }
  });

  return options;
};

const readCurrentDatabaseSetting = async (): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  mongoTouched = true;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingDocument>('settings')
    .findOne({ key: FILEMAKER_DATABASE_KEY }, { projection: { value: 1 } });
  if (typeof doc?.value !== 'string') return null;
  return decodeSettingValue(FILEMAKER_DATABASE_KEY, doc.value);
};

const writeDatabaseSetting = async (value: string): Promise<void> => {
  mongoTouched = true;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDocument>('settings').updateOne(
    { key: FILEMAKER_DATABASE_KEY },
    {
      $set: {
        key: FILEMAKER_DATABASE_KEY,
        value: encodeSettingValue(FILEMAKER_DATABASE_KEY, value),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const currentSettingValue = await readCurrentDatabaseSetting();
  if (currentSettingValue === null) {
    console.error(`Missing ${FILEMAKER_DATABASE_KEY} setting or MONGODB_URI.`);
    process.exitCode = 1;
    return;
  }

  const currentDatabase = parseFilemakerDatabase(currentSettingValue);
  const result = repairFilemakerJobBoardLexicon(currentDatabase);
  const persistedDatabase = JSON.stringify(toPersistedFilemakerDatabase(result.database));

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        settingKey: FILEMAKER_DATABASE_KEY,
        changed: result.changed,
        ...result.summary,
      },
      null,
      2
    )
  );

  if (options.dryRun || !result.changed) return;
  const backupPath = await writeBackupFile(currentSettingValue);
  console.log(JSON.stringify({ backupPath }, null, 2));
  await writeDatabaseSetting(persistedDatabase);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoTouched && process.env['MONGODB_URI']) {
        const client = await getMongoClient().catch(() => null);
        await client?.close();
      }
    });
}
