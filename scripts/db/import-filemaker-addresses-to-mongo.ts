import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document, WithId } from 'mongodb';

import {
  parseAddressFromRow,
  parseFilemakerLegacyAddressRows,
  parseFilemakerLegacyAddressWorkbookRows,
  type LegacyAddressRow,
  type ParsedLegacyAddress,
} from '@/features/filemaker/filemaker-addresses-import.parser';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import { countryCodeOptions } from '@/shared/constants/countries';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const ADDRESSES_COLLECTION = 'filemaker_addresses';
const ADDRESS_LINKS_COLLECTION = 'filemaker_address_links';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const COUNTRIES_COLLECTION = 'countries';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 1_000;
const IMPORT_SOURCE_KIND = 'filemaker.addressbook';

type CliOptions = {
  batchSize: number;
  countryMap: Map<string, string>;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type AddressOwnerKind = 'organization' | 'person' | 'event';

type OwnerLookupRecord = {
  id: string;
  kind: AddressOwnerKind;
  legacyDefaultAddressUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyUuid: string;
};

type CountryRecord = {
  code?: string;
  id: string;
  name: string;
};

type CountryValueRecord = {
  id: string;
  label: string;
  legacyUuid: string;
};

type CountryResolutionRecord = {
  country?: CountryRecord;
  value?: CountryValueRecord;
};

type WriteResultSummary = {
  insertedCount?: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

type FilemakerAddressMongoDocument = Document & {
  _id: string;
  category?: string;
  city: string;
  country?: string;
  countryId?: string;
  countryValueId?: string;
  countryValueLabel?: string;
  createdAt?: string;
  id: string;
  importBatchId: string;
  importSourceKind: string;
  importedAt: Date;
  legacyCountryUuid?: string;
  legacyParentUuid: string;
  legacyUuid: string;
  postalCode: string;
  region?: string;
  schemaVersion: 1;
  street: string;
  streetNumber: string;
  updatedAt?: string;
  updatedBy?: string;
};

type FilemakerAddressLinkMongoDocument = Document & {
  _id: string;
  addressId: string;
  category?: string;
  id: string;
  importBatchId: string;
  importSourceKind: string;
  importedAt: Date;
  isDefault: boolean;
  isDisplay: boolean;
  legacyAddressUuid: string;
  legacyOwnerUuid: string;
  ownerId: string;
  ownerKind: AddressOwnerKind;
  schemaVersion: 1;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-addresses-to-mongo.ts --input=csv/addressBook.xlsx --write',
      '',
      'Imports FileMaker AddressBook XLSX exports and headerless 12-column TAB/CSV exports into filemaker_addresses and filemaker_address_links.',
      'Parent_UUID_FK is resolved against imported organizations, persons, and events.',
      'Country_UUID_FK is retained as legacyCountryUuid and linked to filemaker_database_v1 values when present.',
      'Pass --country-map=LEGACY_UUID:COUNTRY_ID to force internationalization country resolution.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the address collections.',
    ].join('\n')
  );
};

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const addCountryMapEntries = (target: Map<string, string>, raw: string): void => {
  raw.split(',').forEach((entry: string): void => {
    const [legacyUuid, countryId] = entry.split(/[:=]/).map((part: string): string => part.trim());
    if (legacyUuid && countryId) target.set(legacyUuid.toUpperCase(), countryId);
  });
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    batchSize: DEFAULT_BATCH_SIZE,
    countryMap: new Map(),
    dryRun: true,
    inputPath: null,
    replaceCollections: false,
    source: undefined,
  };
  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollections = true;
    if (arg.startsWith('--input=')) options.inputPath = arg.slice('--input='.length).trim() || null;
    if (arg.startsWith('--country-map=')) addCountryMapEntries(options.countryMap, arg.slice(14));
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--') && options.inputPath === null) options.inputPath = arg;
  });
  return options;
};

const createModernId = (kind: 'address' | 'address-link', key: string): string => {
  const digest = createHash('sha256').update(`filemaker.${kind}:${key}`).digest('hex').slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyAddressRows = async (inputPath: string): Promise<LegacyAddressRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyAddressWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyAddressRows(await readFile(inputPath, 'utf8'));
};

const collectAddresses = (rows: LegacyAddressRow[]): {
  addresses: Map<string, ParsedLegacyAddress>;
  duplicateLegacyUuidCount: number;
  skippedRowCount: number;
} => {
  const addresses = new Map<string, ParsedLegacyAddress>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;
  rows.forEach((row: LegacyAddressRow): void => {
    const address = parseAddressFromRow(row);
    if (address === null) {
      skippedRowCount += 1;
      return;
    }
    if (addresses.has(address.legacyUuid)) duplicateLegacyUuidCount += 1;
    addresses.set(address.legacyUuid, address);
  });
  return { addresses, duplicateLegacyUuidCount, skippedRowCount };
};

const buildOwnerMap = async (
  db: Db,
  input: { collectionName: string; kind: AddressOwnerKind }
): Promise<Map<string, OwnerLookupRecord>> => {
  const documents = await db
    .collection(input.collectionName)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          id: 1,
          legacyDefaultAddressUuid: 1,
          legacyDisplayAddressUuid: 1,
          legacyUuid: 1,
        },
      }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, OwnerLookupRecord] | null => {
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'] : '';
        if (!id || !legacyUuid) return null;
        return [
          legacyUuid,
          {
            id,
            kind: input.kind,
            legacyDefaultAddressUuid: document['legacyDefaultAddressUuid'] as string | undefined,
            legacyDisplayAddressUuid: document['legacyDisplayAddressUuid'] as string | undefined,
            legacyUuid,
          },
        ];
      })
      .filter((entry): entry is [string, OwnerLookupRecord] => entry !== null)
  );
};

const combineOwnerMaps = (
  maps: Array<Map<string, OwnerLookupRecord>>
): { duplicateLegacyOwnerUuidCount: number; ownerByLegacyUuid: Map<string, OwnerLookupRecord> } => {
  const ownerByLegacyUuid = new Map<string, OwnerLookupRecord>();
  let duplicateLegacyOwnerUuidCount = 0;
  maps.forEach((map: Map<string, OwnerLookupRecord>): void => {
    map.forEach((owner: OwnerLookupRecord, legacyUuid: string): void => {
      if (ownerByLegacyUuid.has(legacyUuid)) {
        duplicateLegacyOwnerUuidCount += 1;
        return;
      }
      ownerByLegacyUuid.set(legacyUuid, owner);
    });
  });
  return { duplicateLegacyOwnerUuidCount, ownerByLegacyUuid };
};

const normalizeLookupToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const optionalDocumentString = (document: Document, key: string): string | undefined => {
  const value = document[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const collectCountryAliases = (document: WithId<Document>, country: CountryRecord): string[] => [
  country.id,
  country.name,
  country.code ?? '',
  optionalDocumentString(document, 'alpha2') ?? '',
  optionalDocumentString(document, 'iso2') ?? '',
  optionalDocumentString(document, 'countryCode') ?? '',
  optionalDocumentString(document, 'cca2') ?? '',
];

const buildFilemakerCountryValueMap = async (db: Db): Promise<Map<string, CountryValueRecord>> => {
  const document = await db
    .collection(SETTINGS_COLLECTION)
    .findOne({ key: FILEMAKER_DATABASE_KEY }, { projection: { value: 1 } });
  const rawValue = typeof document?.['value'] === 'string' ? document['value'] : '';
  if (rawValue.length === 0) return new Map();
  const database = parseFilemakerDatabase(decodeSettingValue(FILEMAKER_DATABASE_KEY, rawValue));
  return new Map(
    database.values
      .map((value: FilemakerValue): [string, CountryValueRecord] | null => {
        const legacyUuid = typeof value.legacyUuid === 'string' ? value.legacyUuid.toUpperCase() : '';
        const label = value.label || value.value;
        if (!legacyUuid || !label) return null;
        return [legacyUuid, { id: value.id, label, legacyUuid }];
      })
      .filter((entry): entry is [string, CountryValueRecord] => entry !== null)
  );
};

const buildCountryResolutionMap = async (
  db: Db,
  explicitMap: Map<string, string>
): Promise<Map<string, CountryResolutionRecord>> => {
  const countries = await db.collection(COUNTRIES_COLLECTION).find({}).toArray();
  const countryById = new Map<string, CountryRecord>(
    countryCodeOptions.map((country): [string, CountryRecord] => [
      country.code,
      { code: country.code, id: country.code, name: country.name },
    ])
  );
  const countryByLookupToken = new Map<string, CountryRecord>();
  countryById.forEach((country: CountryRecord): void => {
    [country.id, country.name, country.code ?? ''].forEach((alias: string): void => {
      const token = normalizeLookupToken(alias);
      if (token.length > 0) countryByLookupToken.set(token, country);
    });
  });
  countries.forEach((document: WithId<Document>): void => {
    const id = typeof document['id'] === 'string' ? document['id'] : String(document['_id']);
    const name = typeof document['name'] === 'string' ? document['name'] : id;
    const code = typeof document['code'] === 'string' ? document['code'] : undefined;
    const country = { code, id, name };
    countryById.set(id, country);
    collectCountryAliases(document, country).forEach((alias: string): void => {
      const token = normalizeLookupToken(alias);
      if (token.length > 0) countryByLookupToken.set(token, country);
    });
  });
  const countryValueByLegacyUuid = await buildFilemakerCountryValueMap(db);
  const resolutionByLegacyUuid = new Map<string, CountryResolutionRecord>();
  explicitMap.forEach((countryId: string, legacyUuid: string): void => {
    const country = countryById.get(countryId);
    if (country) resolutionByLegacyUuid.set(legacyUuid.toUpperCase(), { country });
  });
  countries.forEach((document: WithId<Document>): void => {
    const country = countryById.get(String(document['id'] ?? document['_id']));
    const legacyUuid =
      typeof document['legacyCountryUuid'] === 'string'
        ? document['legacyCountryUuid']
        : typeof document['legacyValueUuid'] === 'string'
          ? document['legacyValueUuid']
          : undefined;
    if (country && legacyUuid) resolutionByLegacyUuid.set(legacyUuid.toUpperCase(), { country });
  });
  countryValueByLegacyUuid.forEach((value: CountryValueRecord, legacyUuid: string): void => {
    const existing = resolutionByLegacyUuid.get(legacyUuid) ?? {};
    const matchedCountry = countryByLookupToken.get(normalizeLookupToken(value.label));
    resolutionByLegacyUuid.set(legacyUuid, {
      ...existing,
      ...(matchedCountry && !existing.country ? { country: matchedCountry } : {}),
      value,
    });
  });
  return resolutionByLegacyUuid;
};

const isDefaultCategory = (category: string | undefined): boolean =>
  (category ?? '').trim().toLowerCase() === 'default';

const toAddressDocument = (input: {
  address: ParsedLegacyAddress;
  countryResolution: CountryResolutionRecord | undefined;
  importBatchId: string;
  importedAt: Date;
}): FilemakerAddressMongoDocument => ({
  _id: createModernId('address', input.address.legacyUuid),
  ...(input.address.category ? { category: input.address.category } : {}),
  city: input.address.city,
  ...(input.countryResolution?.country
    ? {
        country: input.countryResolution.country.name,
        countryId: input.countryResolution.country.id,
      }
    : {}),
  ...(input.countryResolution?.value
    ? {
        countryValueId: input.countryResolution.value.id,
        countryValueLabel: input.countryResolution.value.label,
      }
    : {}),
  ...(input.address.createdAt ? { createdAt: input.address.createdAt } : {}),
  id: createModernId('address', input.address.legacyUuid),
  importBatchId: input.importBatchId,
  importSourceKind: IMPORT_SOURCE_KIND,
  importedAt: input.importedAt,
  ...(input.address.legacyCountryUuid ? { legacyCountryUuid: input.address.legacyCountryUuid } : {}),
  legacyParentUuid: input.address.legacyParentUuid,
  legacyUuid: input.address.legacyUuid,
  postalCode: input.address.postalCode,
  ...(input.address.region ? { region: input.address.region } : {}),
  schemaVersion: 1,
  street: input.address.street,
  streetNumber: input.address.streetNumber,
  ...(input.address.updatedAt ? { updatedAt: input.address.updatedAt } : {}),
  ...(input.address.updatedBy ? { updatedBy: input.address.updatedBy } : {}),
});

const toAddressLinkDocument = (
  address: ParsedLegacyAddress,
  owner: OwnerLookupRecord,
  importBatchId: string,
  importedAt: Date
): FilemakerAddressLinkMongoDocument => {
  const addressId = createModernId('address', address.legacyUuid);
  const isDefault = owner.legacyDefaultAddressUuid
    ? owner.legacyDefaultAddressUuid === address.legacyUuid
    : isDefaultCategory(address.category);
  const isDisplay = owner.legacyDisplayAddressUuid === address.legacyUuid;
  const id = createModernId('address-link', `${owner.id}:${addressId}`);
  return {
    _id: id,
    addressId,
    ...(address.category ? { category: address.category } : {}),
    id,
    importBatchId,
    importSourceKind: IMPORT_SOURCE_KIND,
    importedAt,
    isDefault,
    isDisplay,
    legacyAddressUuid: address.legacyUuid,
    legacyOwnerUuid: owner.legacyUuid,
    ownerId: owner.id,
    ownerKind: owner.kind,
    schemaVersion: 1,
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
    db.collection(ADDRESSES_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_addresses_legacy_uuid_unique', unique: true }
    ),
    db.collection(ADDRESSES_COLLECTION).createIndex(
      { legacyParentUuid: 1 },
      { name: 'filemaker_addresses_legacy_parent_uuid' }
    ),
    db.collection(ADDRESSES_COLLECTION).createIndex(
      { legacyCountryUuid: 1 },
      {
        name: 'filemaker_addresses_legacy_country_uuid',
        partialFilterExpression: { legacyCountryUuid: { $type: 'string' } },
      }
    ),
    db.collection(ADDRESSES_COLLECTION).createIndex(
      { countryValueId: 1 },
      {
        name: 'filemaker_addresses_country_value_id',
        partialFilterExpression: { countryValueId: { $type: 'string' } },
      }
    ),
    db.collection(ADDRESS_LINKS_COLLECTION).createIndex(
      { ownerKind: 1, ownerId: 1, addressId: 1 },
      { name: 'filemaker_address_links_owner_address_unique', unique: true }
    ),
    db.collection(ADDRESS_LINKS_COLLECTION).createIndex(
      { legacyOwnerUuid: 1 },
      { name: 'filemaker_address_links_legacy_owner_uuid' }
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

const buildOwnerAddressUpdates = (input: {
  addressById: Map<string, FilemakerAddressMongoDocument>;
  links: FilemakerAddressLinkMongoDocument[];
  ownerKind: AddressOwnerKind;
}): Array<AnyBulkWriteOperation<Document>> => {
  const updatesByOwnerId = new Map<string, Record<string, string>>();
  input.links.forEach((link: FilemakerAddressLinkMongoDocument): void => {
    if (link.ownerKind !== input.ownerKind) return;
    const address = input.addressById.get(link.addressId);
    if (!address) return;
    const update = updatesByOwnerId.get(link.ownerId) ?? {};
    if (link.isDefault) {
      update['addressId'] = address.id;
      update['street'] = address.street;
      update['streetNumber'] = address.streetNumber;
      update['city'] = address.city;
      update['postalCode'] = address.postalCode;
      update['country'] = address.country ?? '';
      update['countryId'] = address.countryId ?? '';
    }
    if (link.isDisplay) update['displayAddressId'] = address.id;
    updatesByOwnerId.set(link.ownerId, update);
  });
  return Array.from(updatesByOwnerId.entries())
    .filter(([, update]: [string, Record<string, string>]): boolean => Object.keys(update).length > 0)
    .map(([ownerId, update]: [string, Record<string, string>]) => ({
      updateOne: {
        filter: { _id: ownerId },
        update: { $set: update },
      },
    }));
};

const runOwnerUpdates = async (
  db: Db,
  collectionName: string,
  operations: Array<AnyBulkWriteOperation<Document>>,
  batchSize: number
): Promise<{ matchedCount: number; modifiedCount: number }> => {
  if (operations.length === 0) return { matchedCount: 0, modifiedCount: 0 };
  let matchedCount = 0;
  let modifiedCount = 0;
  for (let index = 0; index < operations.length; index += batchSize) {
    const batch = operations.slice(index, index + batchSize);
    const result = await db.collection(collectionName).bulkWrite(batch, {
      ordered: false,
    });
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
  }
  return { matchedCount, modifiedCount };
};

const countLinksByOwnerKind = (
  links: FilemakerAddressLinkMongoDocument[]
): Record<AddressOwnerKind, number> =>
  links.reduce(
    (
      counts: Record<AddressOwnerKind, number>,
      link: FilemakerAddressLinkMongoDocument
    ): Record<AddressOwnerKind, number> => {
      counts[link.ownerKind] += 1;
      return counts;
    },
    { event: 0, organization: 0, person: 0 }
  );

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await readLegacyAddressRows(options.inputPath);
  const collected = collectAddresses(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const replacedCollections = !options.dryRun && options.replaceCollections
      ? {
          addresses: await dropCollectionIfExists(db.collection(ADDRESSES_COLLECTION)),
          links: await dropCollectionIfExists(db.collection(ADDRESS_LINKS_COLLECTION)),
        }
      : { addresses: false, links: false };
    const [organizationByLegacyUuid, personByLegacyUuid, eventByLegacyUuid] = await Promise.all([
      buildOwnerMap(db, { collectionName: ORGANIZATIONS_COLLECTION, kind: 'organization' }),
      buildOwnerMap(db, { collectionName: PERSONS_COLLECTION, kind: 'person' }),
      buildOwnerMap(db, { collectionName: EVENTS_COLLECTION, kind: 'event' }),
    ]);
    const { duplicateLegacyOwnerUuidCount, ownerByLegacyUuid } = combineOwnerMaps([
      organizationByLegacyUuid,
      personByLegacyUuid,
      eventByLegacyUuid,
    ]);
    const countryResolutionByLegacyUuid = await buildCountryResolutionMap(db, options.countryMap);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const addressDocuments = Array.from(collected.addresses.values()).map(
      (address: ParsedLegacyAddress): FilemakerAddressMongoDocument =>
        toAddressDocument({
          address,
          countryResolution: address.legacyCountryUuid
            ? countryResolutionByLegacyUuid.get(address.legacyCountryUuid)
            : undefined,
          importBatchId,
          importedAt,
        })
    );
    const linkDocuments = Array.from(collected.addresses.values()).flatMap(
      (address: ParsedLegacyAddress): FilemakerAddressLinkMongoDocument[] => {
        const owner = ownerByLegacyUuid.get(address.legacyParentUuid);
        return owner
          ? [toAddressLinkDocument(address, owner, importBatchId, importedAt)]
          : [];
      }
    );
    const addressById = new Map(addressDocuments.map((address) => [address.id, address]));
    const organizationUpdates = buildOwnerAddressUpdates({
      addressById,
      links: linkDocuments,
      ownerKind: 'organization',
    });
    const personUpdates = buildOwnerAddressUpdates({
      addressById,
      links: linkDocuments,
      ownerKind: 'person',
    });
    const eventUpdates = buildOwnerAddressUpdates({
      addressById,
      links: linkDocuments,
      ownerKind: 'event',
    });
    const addressCollection = db.collection<FilemakerAddressMongoDocument>(ADDRESSES_COLLECTION);
    const addressLinkCollection =
      db.collection<FilemakerAddressLinkMongoDocument>(ADDRESS_LINKS_COLLECTION);
    const addressWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollections
        ? await runInsertWrites(addressCollection, addressDocuments, options.batchSize)
        : await runBulkWrites(addressCollection, addressDocuments, options.batchSize);
    const linkWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollections
        ? await runInsertWrites(addressLinkCollection, linkDocuments, options.batchSize)
        : await runBulkWrites(addressLinkCollection, linkDocuments, options.batchSize);
    const organizationWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0 }
      : await runOwnerUpdates(db, ORGANIZATIONS_COLLECTION, organizationUpdates, options.batchSize);
    const personWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0 }
      : await runOwnerUpdates(db, PERSONS_COLLECTION, personUpdates, options.batchSize);
    const eventWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0 }
      : await runOwnerUpdates(db, EVENTS_COLLECTION, eventUpdates, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);
    const resolvedLinkCountByOwnerKind = countLinksByOwnerKind(linkDocuments);

    console.log(
      JSON.stringify(
        {
          addressWrite,
          countryResolutionLookupCount: countryResolutionByLegacyUuid.size,
          duplicateLegacyOwnerUuidCount,
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          eventLookupCount: eventByLegacyUuid.size,
          eventWrite,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          linkWrite,
          mode: options.dryRun ? 'dry-run' : 'write',
          organizationLookupCount: organizationByLegacyUuid.size,
          organizationWrite,
          personLookupCount: personByLegacyUuid.size,
          personWrite,
          parsedRowCount: parsedRows.length,
          replacedCollections,
          resolvedCountryCount: addressDocuments.filter((address) => address.countryId).length,
          resolvedCountryValueCount: addressDocuments.filter((address) => address.countryValueId)
            .length,
          resolvedLinkCount: linkDocuments.length,
          resolvedLinkCountByOwnerKind,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniqueAddressCount: collected.addresses.size,
          unresolvedCountryUuidCount: addressDocuments.filter(
            (address) => address.legacyCountryUuid && !address.countryId
          ).length,
          unresolvedCountryValueUuidCount: addressDocuments.filter(
            (address) => address.legacyCountryUuid && !address.countryValueId
          ).length,
          unresolvedParentLinkCount: collected.addresses.size - linkDocuments.length,
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
