import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { toPersistedFilemakerDatabase } from '@/features/filemaker/filemaker-settings.database';
import { importFilemakerLegacyOrganisersExport } from '@/features/filemaker/filemaker-organisers-import';
import { importFilemakerLegacyOrganisersWorkbook } from '@/features/filemaker/filemaker-organisers-import.workbook';
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
const SINGLE_SETTING_WRITE_MAX_BYTES = 12 * 1024 * 1024;

const getByteLength = (value: string): number => Buffer.byteLength(value, 'utf8');

const formatMegabytes = (bytes: number): string => (bytes / 1024 / 1024).toFixed(2);

const printUsage = (): void => {
  console.log(
    [
      'Usage: node --import tsx scripts/db/import-filemaker-organisers-export.ts --input=/path/organisers.csv [--write]',
      '       NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-organisers-export.ts --input=/path/organisers.xlsx --write',
      '',
      'Imports .csv, .tsv, .xlsx, and .xls organiser exports.',
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

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const currentSettingValue = await readCurrentDatabaseSetting();
  const currentDatabase = parseFilemakerDatabase(currentSettingValue);
  const result = isWorkbookInputPath(options.inputPath)
    ? await importFilemakerLegacyOrganisersWorkbook(
        currentDatabase,
        await readFile(options.inputPath)
      )
    : importFilemakerLegacyOrganisersExport(
        currentDatabase,
        await readFile(options.inputPath, 'utf8')
      );
  const persistedDatabase = JSON.stringify(toPersistedFilemakerDatabase(result.database));
  const persistedDatabaseSizeBytes = getByteLength(persistedDatabase);

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        settingKey: FILEMAKER_DATABASE_KEY,
        ignoredColumnNames: result.ignoredColumnNames,
        importedOrganizationCount: result.importedOrganizationCount,
        persistedDatabaseSizeBytes,
        persistedDatabaseSizeMegabytes: formatMegabytes(persistedDatabaseSizeBytes),
        skippedRowCount: result.skippedRowCount,
        singleSettingWriteLimitMegabytes: formatMegabytes(SINGLE_SETTING_WRITE_MAX_BYTES),
        singleSettingWriteSafe: persistedDatabaseSizeBytes <= SINGLE_SETTING_WRITE_MAX_BYTES,
      },
      null,
      2
    )
  );

  if (options.dryRun) return;
  if (persistedDatabaseSizeBytes > SINGLE_SETTING_WRITE_MAX_BYTES) {
    throw new Error(
      `Imported FileMaker database is ${formatMegabytes(persistedDatabaseSizeBytes)} MB, which is too large for the current single settings-record storage path. Move this import to chunked or collection-backed FileMaker storage before writing.`
    );
  }
  await writeDatabaseSetting(persistedDatabase);
}

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
