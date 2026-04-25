import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { toPersistedFilemakerDatabase } from '@/features/filemaker/filemaker-settings.database';
import { importFilemakerLegacyValuesExport } from '@/features/filemaker/filemaker-values-import';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

type CliOptions = {
  dryRun: boolean;
  inputPath: string | null;
};

type SettingDocument = {
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

let mongoTouched = false;

const printUsage = (): void => {
  console.log(
    [
      'Usage: node --import tsx scripts/db/import-filemaker-values-export.ts --input=/path/values.tsv [--write]',
      '       NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-values-export.ts --input=/path/values.tsv --write',
      '',
      'By default the script performs a dry run and prints import counts.',
      'Pass --write to update the filemaker_database_v1 setting.',
    ].join('\n')
  );
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    inputPath: null,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length).trim() || null;
      return;
    }
    if (!arg.startsWith('--') && options.inputPath === null) {
      options.inputPath = arg.trim() || null;
    }
  });

  return options;
};

const readCurrentDatabaseSetting = async (): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  mongoTouched = true;
  const { getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingDocument>('settings')
    .findOne({ key: FILEMAKER_DATABASE_KEY }, { projection: { value: 1 } });
  if (typeof doc?.value !== 'string') return null;
  return decodeSettingValue(FILEMAKER_DATABASE_KEY, doc.value);
};

const writeDatabaseSetting = async (value: string): Promise<void> => {
  mongoTouched = true;
  const { getMongoDb } = await import('@/shared/lib/db/mongo-client');
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
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const exportText = await readFile(options.inputPath, 'utf8');
  const currentSettingValue = await readCurrentDatabaseSetting();
  const currentDatabase = parseFilemakerDatabase(currentSettingValue);
  const result = importFilemakerLegacyValuesExport(currentDatabase, exportText);
  const persistedDatabase = JSON.stringify(toPersistedFilemakerDatabase(result.database));

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        settingKey: FILEMAKER_DATABASE_KEY,
        importedValueCount: result.importedValueCount,
        importedParameterCount: result.importedParameterCount,
        importedLinkCount: result.importedLinkCount,
        skippedRowCount: result.skippedRowCount,
      },
      null,
      2
    )
  );

  if (options.dryRun) return;
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
        const { getMongoClient } = await import('@/shared/lib/db/mongo-client');
        const client = await getMongoClient().catch(() => null);
        await client?.close();
      }
    });
}
