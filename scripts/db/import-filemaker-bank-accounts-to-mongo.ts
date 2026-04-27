import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseBankAccountFromRow,
  parseFilemakerLegacyBankAccountRows,
  parseFilemakerLegacyBankAccountWorkbookRows,
  type LegacyBankAccountRow,
  type ParsedLegacyBankAccount,
} from '@/features/filemaker/filemaker-bank-accounts-import.parser';
import type { FilemakerBankAccountOwnerKind } from '@/features/filemaker/filemaker-bank-account.types';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const BANK_ACCOUNTS_COLLECTION = 'filemaker_bank_accounts';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const VALUES_COLLECTION = 'filemaker_values';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 5_000;
const IMPORT_SOURCE_KIND = 'filemaker.bank_account';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type OwnerLookupRecord = {
  displayBankAccountLegacyUuid?: string;
  id: string;
  kind: FilemakerBankAccountOwnerKind;
  legacyUuid: string;
  name?: string;
  primaryBankAccountLegacyUuid?: string;
};

type ValueLookupRecord = {
  id: string;
  label: string;
  legacyUuid: string;
};

type ValueCatalogDocument = Document & {
  id?: unknown;
  label?: unknown;
  legacyUuid?: unknown;
};

type FilemakerBankAccountMongoDocument = Document & {
  _id: string;
  accountNumber: string;
  bankAddress?: string;
  bankName?: string;
  category?: string;
  createdAt?: string;
  currencyLabel?: string;
  currencyValueId?: string;
  displayName?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  isDefaultForOwner: boolean;
  isDisplayForOwner: boolean;
  legacyCurrencyUuid?: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerBankAccountOwnerKind;
  ownerName?: string;
  schemaVersion: 1;
  swift?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type WriteResultSummary = {
  insertedCount?: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-bank-accounts-to-mongo.ts --input="csv/b/bank Accounts.xlsx" --write',
      '',
      'Imports FileMaker bank account CSV/TSV/XLSX exports into filemaker_bank_accounts.',
      'Parent_UUID_FK is resolved against imported organizations, persons, and events.',
      'Currency_UUID_FK is retained and linked to a modern FileMaker value ID when present.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the bank account collection.',
    ].join('\n')
  );
};

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    batchSize: DEFAULT_BATCH_SIZE,
    dryRun: true,
    inputPath: null,
    replaceCollection: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollection = true;
    if (arg.startsWith('--input=')) options.inputPath = arg.slice('--input='.length).trim() || null;
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--') && options.inputPath === null) options.inputPath = arg.trim() || null;
  });

  return options;
};

const createModernId = (legacyUuid: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.bank_account:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-bank-account-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyBankAccountRows = async (inputPath: string): Promise<LegacyBankAccountRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyBankAccountWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyBankAccountRows(await readFile(inputPath, 'utf8'));
};

const collectBankAccounts = (rows: LegacyBankAccountRow[]): {
  bankAccounts: Map<string, ParsedLegacyBankAccount>;
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
} => {
  const bankAccounts = new Map<string, ParsedLegacyBankAccount>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyBankAccountRow): void => {
    const bankAccount = parseBankAccountFromRow(row);
    if (bankAccount === null) {
      skippedRowCount += 1;
      return;
    }
    if (bankAccounts.has(bankAccount.legacyUuid)) duplicateLegacyUuidCount += 1;
    bankAccounts.set(bankAccount.legacyUuid, bankAccount);
  });

  return { bankAccounts, duplicateLegacyUuidCount, skippedRowCount };
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const buildOwnerName = (
  document: Document,
  kind: FilemakerBankAccountOwnerKind
): string | undefined => {
  if (kind === 'organization') return optionalString(document['name']);
  if (kind === 'event') return optionalString(document['eventName']);
  const fullName = optionalString(document['fullName']);
  if (fullName !== undefined) return fullName;
  const name = [document['firstName'], document['lastName']]
    .map(optionalString)
    .filter((part): part is string => part !== undefined)
    .join(' ');
  return name.length > 0 ? name : undefined;
};

const buildOwnerMapForCollection = async (
  db: Db,
  input: { collectionName: string; kind: FilemakerBankAccountOwnerKind }
): Promise<Map<string, OwnerLookupRecord[]>> => {
  const documents = await db
    .collection(input.collectionName)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          eventName: 1,
          firstName: 1,
          fullName: 1,
          id: 1,
          lastName: 1,
          legacyDefaultBankAccountUuid: 1,
          legacyDisplayBankAccountUuid: 1,
          legacyUuid: 1,
          name: 1,
        },
      }
    )
    .toArray();
  const ownerByLegacyUuid = new Map<string, OwnerLookupRecord[]>();
  documents.forEach((document: Document): void => {
    const id = optionalString(document['id']);
    const legacyUuid = optionalString(document['legacyUuid'])?.toUpperCase();
    if (id === undefined || legacyUuid === undefined) return;
    ownerByLegacyUuid.set(legacyUuid, [
      ...(ownerByLegacyUuid.get(legacyUuid) ?? []),
      {
        displayBankAccountLegacyUuid: optionalString(
          document['legacyDisplayBankAccountUuid']
        )?.toUpperCase(),
        id,
        kind: input.kind,
        legacyUuid,
        name: buildOwnerName(document, input.kind),
        primaryBankAccountLegacyUuid: optionalString(
          document['legacyDefaultBankAccountUuid']
        )?.toUpperCase(),
      },
    ]);
  });
  return ownerByLegacyUuid;
};

const combineOwnerMaps = (
  maps: Array<Map<string, OwnerLookupRecord[]>>
): Map<string, OwnerLookupRecord[]> => {
  const combined = new Map<string, OwnerLookupRecord[]>();
  maps.forEach((map: Map<string, OwnerLookupRecord[]>): void => {
    map.forEach((owners: OwnerLookupRecord[], legacyUuid: string): void => {
      combined.set(legacyUuid, [...(combined.get(legacyUuid) ?? []), ...owners]);
    });
  });
  return combined;
};

const buildOwnerMap = async (db: Db): Promise<Map<string, OwnerLookupRecord[]>> =>
  combineOwnerMaps([
    await buildOwnerMapForCollection(db, {
      collectionName: ORGANIZATIONS_COLLECTION,
      kind: 'organization',
    }),
    await buildOwnerMapForCollection(db, { collectionName: PERSONS_COLLECTION, kind: 'person' }),
    await buildOwnerMapForCollection(db, { collectionName: EVENTS_COLLECTION, kind: 'event' }),
  ]);

const buildValueMapFromMongo = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const valueDocuments = await db
    .collection<ValueCatalogDocument>(VALUES_COLLECTION)
    .find({ legacyUuid: { $type: 'string' } }, { projection: { id: 1, label: 1, legacyUuid: 1 } })
    .toArray();
  return new Map(
    valueDocuments
      .map((document: ValueCatalogDocument): [string, ValueLookupRecord] | null => {
        const id = typeof document.id === 'string' ? document.id : '';
        const label = typeof document.label === 'string' ? document.label : '';
        const legacyUuid =
          typeof document.legacyUuid === 'string' ? document.legacyUuid.toUpperCase() : '';
        if (!id || !legacyUuid) return null;
        return [legacyUuid, { id, label, legacyUuid }];
      })
      .filter((entry): entry is [string, ValueLookupRecord] => entry !== null)
  );
};

const buildValueMapFromSettings = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const document = await db
    .collection(SETTINGS_COLLECTION)
    .findOne({ key: FILEMAKER_DATABASE_KEY }, { projection: { value: 1 } });
  const rawValue = typeof document?.['value'] === 'string' ? document['value'] : '';
  if (rawValue.length === 0) return new Map();
  const database = parseFilemakerDatabase(decodeSettingValue(FILEMAKER_DATABASE_KEY, rawValue));
  return new Map(
    database.values
      .map((value: FilemakerValue): [string, ValueLookupRecord] | null => {
        const legacyUuid = typeof value.legacyUuid === 'string' ? value.legacyUuid.toUpperCase() : '';
        if (legacyUuid.length === 0) return null;
        return [legacyUuid, { id: value.id, label: value.label, legacyUuid }];
      })
      .filter((entry): entry is [string, ValueLookupRecord] => entry !== null)
  );
};

const buildValueMap = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const mongoValueMap = await buildValueMapFromMongo(db);
  return mongoValueMap.size > 0 ? mongoValueMap : buildValueMapFromSettings(db);
};

const resolveOwner = (
  bankAccount: ParsedLegacyBankAccount,
  ownerByLegacyUuid: Map<string, OwnerLookupRecord[]>
): OwnerLookupRecord | undefined => ownerByLegacyUuid.get(bankAccount.legacyOwnerUuid)?.[0];

const isDefaultForOwner = (
  bankAccount: ParsedLegacyBankAccount,
  owner: OwnerLookupRecord | undefined
): boolean => owner?.primaryBankAccountLegacyUuid === bankAccount.legacyUuid;

const isDisplayForOwner = (
  bankAccount: ParsedLegacyBankAccount,
  owner: OwnerLookupRecord | undefined
): boolean => owner?.displayBankAccountLegacyUuid === bankAccount.legacyUuid;

const toBankAccountDocument = (input: {
  bankAccount: ParsedLegacyBankAccount;
  currency: ValueLookupRecord | undefined;
  importBatchId: string;
  importedAt: Date;
  owner: OwnerLookupRecord | undefined;
}): FilemakerBankAccountMongoDocument => {
  const id = createModernId(input.bankAccount.legacyUuid);
  return {
    _id: id,
    accountNumber: input.bankAccount.accountNumber,
    ...(input.bankAccount.bankAddress ? { bankAddress: input.bankAccount.bankAddress } : {}),
    ...(input.bankAccount.bankName ? { bankName: input.bankAccount.bankName } : {}),
    ...(input.bankAccount.category ? { category: input.bankAccount.category } : {}),
    ...(input.bankAccount.createdAt ? { createdAt: input.bankAccount.createdAt } : {}),
    ...(input.currency ? { currencyLabel: input.currency.label, currencyValueId: input.currency.id } : {}),
    ...(input.bankAccount.displayName ? { displayName: input.bankAccount.displayName } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    isDefaultForOwner: isDefaultForOwner(input.bankAccount, input.owner),
    isDisplayForOwner: isDisplayForOwner(input.bankAccount, input.owner),
    ...(input.bankAccount.legacyCurrencyUuid
      ? { legacyCurrencyUuid: input.bankAccount.legacyCurrencyUuid }
      : {}),
    legacyOwnerUuid: input.bankAccount.legacyOwnerUuid,
    legacyUuid: input.bankAccount.legacyUuid,
    ...(input.owner ? { ownerId: input.owner.id, ownerKind: input.owner.kind } : {}),
    ...(input.owner?.name ? { ownerName: input.owner.name } : {}),
    schemaVersion: 1,
    ...(input.bankAccount.swift ? { swift: input.bankAccount.swift } : {}),
    ...(input.bankAccount.updatedAt ? { updatedAt: input.bankAccount.updatedAt } : {}),
    ...(input.bankAccount.updatedBy ? { updatedBy: input.bankAccount.updatedBy } : {}),
  };
};

const isNamespaceNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { code?: unknown; codeName?: unknown };
  return maybeError.code === 26 || maybeError.codeName === 'NamespaceNotFound';
};

const dropCollectionIfExists = async (collection: Collection<Document>): Promise<boolean> => {
  try {
    await collection.drop();
    return true;
  } catch (error: unknown) {
    if (isNamespaceNotFoundError(error)) return false;
    throw error;
  }
};

const ensureIndexes = async (db: Db): Promise<void> => {
  await Promise.all([
    db.collection(BANK_ACCOUNTS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_bank_accounts_legacy_uuid_unique', unique: true }
    ),
    db.collection(BANK_ACCOUNTS_COLLECTION).createIndex(
      { ownerKind: 1, ownerId: 1 },
      {
        name: 'filemaker_bank_accounts_owner',
        partialFilterExpression: { ownerId: { $type: 'string' } },
      }
    ),
    db.collection(BANK_ACCOUNTS_COLLECTION).createIndex(
      { legacyOwnerUuid: 1 },
      { name: 'filemaker_bank_accounts_legacy_owner_uuid' }
    ),
    db.collection(BANK_ACCOUNTS_COLLECTION).createIndex(
      { currencyValueId: 1 },
      {
        name: 'filemaker_bank_accounts_currency_value_id',
        partialFilterExpression: { currencyValueId: { $type: 'string' } },
      }
    ),
  ]);
};

const toUpsertOperation = <TDocument extends Document>(
  document: TDocument & { _id: string; id: string }
): AnyBulkWriteOperation<TDocument> => {
  const { _id, ...set } = document;
  return {
    updateOne: {
      filter: { id: document.id } as Document,
      update: { $set: set, $setOnInsert: { _id } },
      upsert: true,
    },
  };
};

const runBulkWrites = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: Array<TDocument & { _id: string; id: string }>,
  batchSize: number
): Promise<WriteResultSummary> => {
  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    const result = await collection.bulkWrite(batch.map(toUpsertOperation), { ordered: false });
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
    upsertedCount += result.upsertedCount;
  }
  return { matchedCount, modifiedCount, upsertedCount };
};

const runInsertWrites = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: TDocument[],
  batchSize: number
): Promise<WriteResultSummary> => {
  let insertedCount = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    if (batch.length === 0) continue;
    const result = await collection.insertMany(batch, { ordered: false });
    insertedCount += result.insertedCount;
  }
  return { insertedCount, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await readLegacyBankAccountRows(options.inputPath);
  const collected = collectBankAccounts(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerBankAccountMongoDocument>(BANK_ACCOUNTS_COLLECTION);
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(db.collection(BANK_ACCOUNTS_COLLECTION))
        : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const ownerByLegacyUuid = await buildOwnerMap(db);
    const valueByLegacyUuid = await buildValueMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const bankAccountDocuments = Array.from(collected.bankAccounts.values()).map(
      (bankAccount: ParsedLegacyBankAccount): FilemakerBankAccountMongoDocument => {
        const owner = resolveOwner(bankAccount, ownerByLegacyUuid);
        const currency =
          bankAccount.legacyCurrencyUuid === undefined
            ? undefined
            : valueByLegacyUuid.get(bankAccount.legacyCurrencyUuid);
        return toBankAccountDocument({
          bankAccount,
          currency,
          importBatchId,
          importedAt,
          owner,
        });
      }
    );
    const bankAccountWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, bankAccountDocuments, options.batchSize)
        : await runBulkWrites(collection, bankAccountDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const totalCurrencyUuidCount = bankAccountDocuments.filter(
      (bankAccount: FilemakerBankAccountMongoDocument): boolean =>
        typeof bankAccount.legacyCurrencyUuid === 'string'
    ).length;
    const resolvedCurrencyUuidCount = bankAccountDocuments.filter(
      (bankAccount: FilemakerBankAccountMongoDocument): boolean =>
        typeof bankAccount.currencyValueId === 'string'
    ).length;
    const ambiguousOwnerLinkCount = bankAccountDocuments.filter((bankAccount): boolean => {
      const owners = ownerByLegacyUuid.get(bankAccount.legacyOwnerUuid) ?? [];
      return owners.length > 1;
    }).length;
    const resolvedOwnerLinkCount = bankAccountDocuments.filter(
      (bankAccount: FilemakerBankAccountMongoDocument): boolean =>
        typeof bankAccount.ownerId === 'string'
    ).length;

    console.log(
      JSON.stringify(
        {
          ambiguousOwnerLinkCount,
          bankAccountWrite,
          defaultBankAccountCount: bankAccountDocuments.filter(
            (bankAccount: FilemakerBankAccountMongoDocument): boolean =>
              bankAccount.isDefaultForOwner
          ).length,
          displayBankAccountCount: bankAccountDocuments.filter(
            (bankAccount: FilemakerBankAccountMongoDocument): boolean =>
              bankAccount.isDisplayForOwner
          ).length,
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          ownerLookupCount: ownerByLegacyUuid.size,
          parsedRowCount: parsedRows.length,
          replacedCollection,
          resolvedCurrencyUuidCount,
          resolvedOwnerLinkCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          totalCurrencyUuidCount,
          uniqueBankAccountCount: collected.bankAccounts.size,
          unresolvedCurrencyUuidCount: totalCurrencyUuidCount - resolvedCurrencyUuidCount,
          unresolvedOwnerLinkCount: bankAccountDocuments.length - resolvedOwnerLinkCount,
          valueLookupCount: valueByLegacyUuid.size,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
