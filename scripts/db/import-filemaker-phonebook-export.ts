import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { Document, Db } from 'mongodb';

import {
  parseFilemakerLegacyPhonebookRows,
  parseFilemakerLegacyPhonebookWorkbookRows,
  parsePhonebookFromRow,
  type ParsedLegacyPhonebook,
} from '@/features/filemaker/filemaker-phonebook-import.parser';
import {
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
} from '@/features/filemaker/filemaker-settings.entities';
import { normalizeFilemakerDatabase, toPersistedFilemakerDatabase } from '@/features/filemaker/filemaker-settings.database';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import { validateFilemakerPhoneNumber } from '@/features/filemaker/filemaker-settings.validation';
import { ensureUniqueId, normalizeString, toIdToken } from '@/features/filemaker/filemaker-settings.helpers';
import type { FilemakerDatabase } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { normalizeLegacyUuid } from '@/features/filemaker/filemaker-values-import.parser';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const SETTINGS_COLLECTION = 'settings';
const PERSONS_COLLECTION = 'filemaker_persons';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';

const SINGLE_SETTING_WRITE_MAX_BYTES = 12 * 1024 * 1024;

let mongoTouched = false;

const getByteLength = (value: string): number => Buffer.byteLength(value, 'utf8');
const formatMegabytes = (bytes: number): string => (bytes / 1024 / 1024).toFixed(2);

type CliOptions = {
  dryRun: boolean;
  inputPath: string | null;
  source: MongoSource | undefined;
};

type PhonebookPartyKind = 'organization' | 'person';

type PhonebookPartyRecord = {
  id: string;
  kind: PhonebookPartyKind;
  legacyUuid: string;
  name?: string;
};

type PhonebookImportSummary = {
  ambiguousParentCount: number;
  createdPhoneNumberCount: number;
  existingPhoneNumberCount: number;
  invalidPhoneNumberCount: number;
  linkedPhoneNumberCount: number;
  linkedToUnknownPartyKindCount: number;
  parsedRowCount: number;
  processedRowCount: number;
  skippedRowCount: number;
  unresolvedParentCount: number;
};

type SettingDocument = {
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    inputPath: null,
    source: undefined,
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
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') {
        options.source = source;
      }
      return;
    }
    if (!arg.startsWith('--') && options.inputPath === null) {
      options.inputPath = arg.trim() || null;
    }
  });

  return options;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-phonebook-export.ts --input=csv/b/phonebook.xlsx --write',
      '',
      'Imports FileMaker phonebook CSV/TSV/XLSX exports into the filemaker_database_v1 setting.',
      'PhoneNo is normalized/validated and added as PhoneNumbers.',
      'Parent_UUID_FK is resolved against imported persons and organizations in filemaker_database_v1 first, then filemaker_persons and filemaker_organizations collections.',
      'Links are created as idempotent party/phone relations.',
      'By default the script performs a dry run. Pass --write to update the setting.',
      'Pass --source=local or --source=cloud to override the active Mongo source.',
    ].join('\n')
  );
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readCurrentDatabaseSetting = async (source: MongoSource | undefined): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  mongoTouched = true;
  const { getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const mongo = await getMongoDb(source);
  const document = await mongo
    .collection<SettingDocument>(SETTINGS_COLLECTION)
    .findOne({ key: FILEMAKER_DATABASE_KEY }, { projection: { value: 1 } });
  return typeof document?.value === 'string' ? decodeSettingValue(FILEMAKER_DATABASE_KEY, document.value) : null;
};

const writeDatabaseSetting = async (
  value: string,
  source: MongoSource | undefined
): Promise<void> => {
  const { getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const mongo = await getMongoDb(source);
  mongoTouched = true;
  const now = new Date();
  await mongo.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
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

const getPartyDisplayName = (document: Document, kind: PhonebookPartyKind): string | undefined => {
  if (kind === 'person') {
    const fullName =
      typeof document['fullName'] === 'string'
        ? document['fullName'].trim()
        : `${normalizeString(document['firstName'])} ${normalizeString(document['lastName'])}`.trim();
    return fullName.length > 0 ? fullName : undefined;
  }
  if (typeof document['name'] === 'string') {
    const name = document['name'].trim();
    return name.length > 0 ? name : undefined;
  }
  return undefined;
};

const buildPartyMapFromDatabase = (database: FilemakerDatabase): Map<string, PhonebookPartyRecord[]> => {
  const map = new Map<string, PhonebookPartyRecord[]>();

  database.persons.forEach((person) => {
    const legacyUuid = normalizeLegacyUuid(person.legacyUuid);
    if (legacyUuid.length === 0) return;
    map.set(legacyUuid, [
      ...(map.get(legacyUuid) ?? []),
      { id: person.id, kind: 'person', legacyUuid, ...(person.fullName ? { name: person.fullName } : {}) },
    ]);
  });

  database.organizations.forEach((organization) => {
    const legacyUuid = normalizeLegacyUuid(organization.legacyUuid);
    if (legacyUuid.length === 0) return;
    map.set(legacyUuid, [
      ...(map.get(legacyUuid) ?? []),
      { id: organization.id, kind: 'organization', legacyUuid, ...(organization.name ? { name: organization.name } : {}) },
    ]);
  });

  return map;
};

const buildPartyMapFromCollection = async (
  db: Db,
  input: {
    collectionName: string;
    kind: PhonebookPartyKind;
    projection: Record<string, number>;
  }
): Promise<Map<string, PhonebookPartyRecord[]>> => {
  const map = new Map<string, PhonebookPartyRecord[]>();
  const documents = await db
    .collection(input.collectionName)
    .find({ legacyUuid: { $type: 'string' } }, { projection: input.projection })
    .toArray();

  documents.forEach((document: Document): void => {
    const id = typeof document['id'] === 'string' ? document['id'].trim() : '';
    const legacyUuid = normalizeLegacyUuid(document['legacyUuid']);
    if (!id || legacyUuid.length === 0) return;
    const partyKind: PhonebookPartyKind = input.kind;
    const name = getPartyDisplayName(document, partyKind);

    const existing = map.get(legacyUuid) ?? [];
    if (existing.some((record: PhonebookPartyRecord): boolean => record.kind === partyKind && record.id === id)) {
      return;
    }
    map.set(legacyUuid, [...existing, { id, kind: partyKind, legacyUuid, ...(name ? { name } : {}) }]);
  });

  return map;
};

const buildPartyLookup = async (db: Db, database: FilemakerDatabase): Promise<Map<string, PhonebookPartyRecord[]>> => {
  const fromSettings = buildPartyMapFromDatabase(database);

  const fromCollections = await Promise.all([
    buildPartyMapFromCollection(db, {
      collectionName: PERSONS_COLLECTION,
      kind: 'person',
      projection: { fullName: 1, firstName: 1, id: 1, lastName: 1, legacyUuid: 1 },
    }),
    buildPartyMapFromCollection(db, {
      collectionName: ORGANIZATIONS_COLLECTION,
      kind: 'organization',
      projection: { id: 1, legacyUuid: 1, name: 1 },
    }),
  ]);

  const merged = new Map<string, PhonebookPartyRecord[]>(fromSettings);
  fromCollections.forEach((partyMap: Map<string, PhonebookPartyRecord[]>) => {
    partyMap.forEach((entries: PhonebookPartyRecord[], legacyUuid: string): void => {
      merged.set(legacyUuid, [...(merged.get(legacyUuid) ?? []), ...entries]);
    });
  });

  return merged;
};

const createPhoneNumberId = (input: { phoneNumber: string; usedIds: Set<string> }): string => {
  const base = `filemaker-phone-number-${toIdToken(input.phoneNumber) || 'entry'}`;
  return ensureUniqueId(base, input.usedIds, base);
};

const createPhoneNumberLinkId = (input: {
  phoneNumberId: string;
  partyKind: PhonebookPartyKind;
  partyId: string;
  usedIds: Set<string>;
}): string => {
  const base = `filemaker-phone-number-link-${toIdToken(`${input.phoneNumberId}-${input.partyKind}-${input.partyId}`) || 'entry'}`;
  return ensureUniqueId(base, input.usedIds, base);
};

const ensurePartyLookup = (
  partyMap: Map<string, PhonebookPartyRecord[]>,
  legacyUuid: string
): PhonebookPartyRecord | null => {
  const records = (partyMap.get(legacyUuid) ?? []).filter(
    (record: PhonebookPartyRecord, index: number, all: PhonebookPartyRecord[]): boolean =>
      index === all.findIndex((current: PhonebookPartyRecord): boolean =>
        current.kind === record.kind && current.id === record.id
      )
  );

  if (records.length !== 1) return null;
  const record = records[0];
  if (!record) return null;

  return record;
};

const collectLegacyPhonebookRows = (rows: ReturnType<typeof parseFilemakerLegacyPhonebookRows>): {
  parsedRows: ParsedLegacyPhonebook[];
  skippedRowCount: number;
} => {
  const parsedRows: ParsedLegacyPhonebook[] = [];
  let skippedRowCount = 0;

  rows.forEach((row: { [key: string]: string }): void => {
    const parsed = parsePhonebookFromRow(row);
    if (parsed === null) {
      skippedRowCount += 1;
      return;
    }
    parsedRows.push(parsed);
  });

  return { parsedRows, skippedRowCount };
};

const importPhonebookRows = async (
  database: FilemakerDatabase,
  input: {
    partyMap: Map<string, PhonebookPartyRecord[]>;
    rows: ParsedLegacyPhonebook[];
  }
): { database: FilemakerDatabase; summary: PhonebookImportSummary } => {
  const summary: PhonebookImportSummary = {
    ambiguousParentCount: 0,
    createdPhoneNumberCount: 0,
    existingPhoneNumberCount: 0,
    invalidPhoneNumberCount: 0,
    linkedPhoneNumberCount: 0,
    linkedToUnknownPartyKindCount: 0,
    parsedRowCount: 0,
    processedRowCount: 0,
    skippedRowCount: 0,
    unresolvedParentCount: 0,
  };

  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const nextDatabase: FilemakerDatabase = {
    ...normalizedDatabase,
    phoneNumbers: [...normalizedDatabase.phoneNumbers],
    phoneNumberLinks: [...normalizedDatabase.phoneNumberLinks],
  };

  const phoneNumberIdByValue = new Map<string, string>(
    normalizedDatabase.phoneNumbers.map((entry) => [entry.phoneNumber, entry.id])
  );
  const usedPhoneIds = new Set<string>(normalizedDatabase.phoneNumbers.map((entry) => entry.id));
  const usedLinkIds = new Set<string>(normalizedDatabase.phoneNumberLinks.map((entry) => entry.id));
  const phoneNumberRelationKeys = new Set<string>(
    normalizedDatabase.phoneNumberLinks.map(
      (entry) => `${entry.phoneNumberId}:${entry.partyKind}:${entry.partyId}`
    )
  );

  input.rows.forEach((entry: ParsedLegacyPhonebook): void => {
    summary.processedRowCount += 1;
    const normalizedPhoneNumber = validateFilemakerPhoneNumber(entry.phoneNumber).normalizedPhoneNumber;
    const validation = validateFilemakerPhoneNumber(normalizedPhoneNumber);
    if (!validation.isValid) {
      summary.invalidPhoneNumberCount += 1;
      return;
    }
    if (entry.legacyParentUuid.length === 0) {
      summary.unresolvedParentCount += 1;
      return;
    }

    const matchedParty = ensurePartyLookup(input.partyMap, entry.legacyParentUuid);
    if (!matchedParty) {
      const countForParent = input.partyMap.get(entry.legacyParentUuid)?.length ?? 0;
      if (countForParent > 1) {
        summary.ambiguousParentCount += 1;
      } else {
        summary.unresolvedParentCount += 1;
      }
      return;
    }

    if (matchedParty.kind !== 'person' && matchedParty.kind !== 'organization') {
      summary.linkedToUnknownPartyKindCount += 1;
      return;
    }

    summary.parsedRowCount += 1;

    const normalized = validation.normalizedPhoneNumber;
    let phoneNumberId = phoneNumberIdByValue.get(normalized);
    if (phoneNumberId === undefined) {
      phoneNumberId = createPhoneNumberId({ phoneNumber: normalized, usedIds: usedPhoneIds });
      usedPhoneIds.add(phoneNumberId);
      phoneNumberIdByValue.set(normalized, phoneNumberId);
      summary.createdPhoneNumberCount += 1;
      nextDatabase.phoneNumbers.push(
        createFilemakerPhoneNumber({
          id: phoneNumberId,
          phoneNumber: normalized,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        })
      );
    } else {
      summary.existingPhoneNumberCount += 1;
    }

    const relationKey = `${phoneNumberId}:${matchedParty.kind}:${matchedParty.id}`;
    if (phoneNumberRelationKeys.has(relationKey)) return;

    phoneNumberRelationKeys.add(relationKey);
    const linkId = createPhoneNumberLinkId({
      phoneNumberId,
      partyKind: matchedParty.kind,
      partyId: matchedParty.id,
      usedIds: usedLinkIds,
    });
    usedLinkIds.add(linkId);
    summary.linkedPhoneNumberCount += 1;

    nextDatabase.phoneNumberLinks.push(
      createFilemakerPhoneNumberLink({
        id: linkId,
        phoneNumberId,
        partyKind: matchedParty.kind,
        partyId: matchedParty.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })
    );
  });

  return {
    database: normalizeFilemakerDatabase(nextDatabase),
    summary,
  };
};

const readPhonebookRows = async (
  inputPath: string
): Promise<{ rows: ReturnType<typeof parseFilemakerLegacyPhonebookRows> }> => {
  if (isWorkbookInputPath(inputPath)) {
    const rows = await parseFilemakerLegacyPhonebookWorkbookRows(await readFile(inputPath));
    return { rows };
  }

  const text = await readFile(inputPath, 'utf8');
  const rows = parseFilemakerLegacyPhonebookRows(text);
  return { rows };
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const mongo = await getMongoDb(options.source);
    const [rawRowsResult, rawSetting] = await Promise.all([
      readPhonebookRows(options.inputPath),
      readCurrentDatabaseSetting(options.source).catch(() => null),
    ]);

    const currentDatabase = parseFilemakerDatabase(rawSetting);
    const partyMap = await buildPartyLookup(mongo, currentDatabase);
    const collected = collectLegacyPhonebookRows(rawRowsResult.rows);

    const imported = await importPhonebookRows(currentDatabase, {
      partyMap,
      rows: collected.parsedRows,
    });

    const persisted = JSON.stringify(toPersistedFilemakerDatabase(imported.database));
    const persistedDatabaseSizeBytes = getByteLength(persisted);

    console.log(
      JSON.stringify(
        {
          mode: options.dryRun ? 'dry-run' : 'write',
          parsedRowCount: imported.summary.parsedRowCount,
          processedRowCount: imported.summary.processedRowCount,
          skippedRowCount: imported.summary.skippedRowCount + collected.skippedRowCount,
          ambiguousParentCount: imported.summary.ambiguousParentCount,
          createdPhoneNumberCount: imported.summary.createdPhoneNumberCount,
          existingPhoneNumberCount: imported.summary.existingPhoneNumberCount,
          invalidPhoneNumberCount: imported.summary.invalidPhoneNumberCount,
          linkedPhoneNumberCount: imported.summary.linkedPhoneNumberCount,
          linkedToUnknownPartyKindCount: imported.summary.linkedToUnknownPartyKindCount,
          unresolvedParentCount: imported.summary.unresolvedParentCount,
          persistedDatabaseSizeBytes,
          persistedDatabaseSizeMegabytes: formatMegabytes(persistedDatabaseSizeBytes),
          singleSettingWriteLimitMegabytes: formatMegabytes(SINGLE_SETTING_WRITE_MAX_BYTES),
          singleSettingWriteSafe: persistedDatabaseSizeBytes <= SINGLE_SETTING_WRITE_MAX_BYTES,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
        },
        null,
        2
      )
    );

    if (options.dryRun) return;

    if (persistedDatabaseSizeBytes > SINGLE_SETTING_WRITE_MAX_BYTES) {
      throw new Error(
        `Imported FileMaker phonebook database is ${formatMegabytes(persistedDatabaseSizeBytes)} MB, which is too large for the current single settings-record storage path.`
      );
    }

    await writeDatabaseSetting(persisted, options.source);
  } finally {
    await client.close();
  }
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
