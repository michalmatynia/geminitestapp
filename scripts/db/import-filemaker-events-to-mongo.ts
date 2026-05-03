import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document, WithId } from 'mongodb';

import {
  parseEventFromRow,
  parseEventOrganizationJoinFromRow,
  parseFilemakerLegacyEventOrganizationJoinRows,
  parseFilemakerLegacyEventOrganizationJoinWorkbookRows,
  parseFilemakerLegacyEventRows,
  parseFilemakerLegacyEventWorkbookRows,
  type LegacyEventOrganizationJoinRow,
  type LegacyEventRow,
  type ParsedLegacyEvent,
  type ParsedLegacyEventOrganizationJoin,
} from '@/features/filemaker/filemaker-events-import.parser';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const EVENTS_COLLECTION = 'filemaker_events';
const EVENT_ORGANIZATION_LINKS_COLLECTION = 'filemaker_event_organization_links';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const ADDRESSES_COLLECTION = 'filemaker_addresses';
const DEFAULT_BATCH_SIZE = 1_000;
const DEFAULT_JOIN_INPUT_PATH = 'csv/nameEventHeadingJOIN.xlsx';
const IMPORT_SOURCE_KIND = 'filemaker.event';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  joinInputPath: string | null;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type ExistingEventRecord = {
  createdAt?: string;
  eventName?: string;
  id: string;
};

type AddressLookupRecord = {
  city?: string;
  country?: string;
  countryId?: string;
  id: string;
  legacyUuid: string;
  postalCode?: string;
  street?: string;
  streetNumber?: string;
};

type OrganizationLookupRecord = {
  id: string;
  legacyUuid: string;
  name?: string;
};

type FilemakerEventMongoDocument = Document & {
  _id: string;
  addressId: string;
  checked1?: boolean;
  checked2?: boolean;
  city: string;
  cooperationStatus?: string;
  country: string;
  countryId: string;
  createdAt?: string;
  currentDay?: string;
  currentWeekNumber?: number;
  discontinued?: boolean;
  displayAddressId?: string | null;
  eventName: string;
  eventStartDate?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  lastEventInstanceDate?: string;
  legacyDefaultAddressUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyHowOftenUuid?: string;
  legacyLastEventInstanceUuid?: string;
  legacyParentUuid?: string;
  legacyUuid: string;
  lengthDay?: number;
  moveDay?: number;
  organizationFilter?: string;
  organizationFilterCount?: number;
  postalCode: string;
  registrationMonth?: string;
  schemaVersion: 1;
  street: string;
  streetNumber: string;
  updatedAt?: string;
  updatedBy?: string;
  websiteFilter?: string;
  websiteFilterCount?: number;
};

type FilemakerEventOrganizationLinkMongoDocument = Document & {
  _id: string;
  eventId: string;
  eventName?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyEventUuid: string;
  legacyOrganizationUuid: string;
  legacyUuid?: string;
  organizationId?: string;
  organizationName?: string;
  schemaVersion: 1;
};

type CollectedEvents = {
  duplicateLegacyUuidCount: number;
  events: Map<string, ParsedLegacyEvent>;
  skippedRowCount: number;
};

type CollectedJoins = {
  duplicateJoinKeyCount: number;
  joins: Map<string, ParsedLegacyEventOrganizationJoin>;
  skippedRowCount: number;
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-events-to-mongo.ts --input=csv/Event.tab --join-input=csv/nameEventHeadingJOIN.xlsx --write',
      '',
      'Imports FileMaker event TAB/CSV/XLSX exports into filemaker_events.',
      'Imports NameEvent-to-NameOrganisation join rows into filemaker_event_organization_links.',
      'Event UUIDs and join UUIDs are retained as legacy UUIDs; each imported record receives a deterministic modern id.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild the event collections.',
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
    joinInputPath: null,
    replaceCollections: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollections = true;
    if (arg.startsWith('--input=')) options.inputPath = arg.slice('--input='.length).trim() || null;
    if (arg.startsWith('--join-input=')) {
      options.joinInputPath = arg.slice('--join-input='.length).trim() || null;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--') && options.inputPath === null) options.inputPath = arg.trim() || null;
  });

  return {
    ...options,
    joinInputPath:
      options.joinInputPath === null && existsSync(DEFAULT_JOIN_INPUT_PATH)
        ? DEFAULT_JOIN_INPUT_PATH
        : options.joinInputPath,
  };
};

const createModernId = (kind: 'event' | 'event-organization-link', key: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyEventRows = async (inputPath: string): Promise<LegacyEventRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyEventWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyEventRows(await readFile(inputPath, 'utf8'));
};

const readLegacyEventOrganizationJoinRows = async (
  inputPath: string
): Promise<LegacyEventOrganizationJoinRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyEventOrganizationJoinWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyEventOrganizationJoinRows(await readFile(inputPath, 'utf8'));
};

const collectEvents = (rows: LegacyEventRow[]): CollectedEvents => {
  const events = new Map<string, ParsedLegacyEvent>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyEventRow): void => {
    const event = parseEventFromRow(row);
    if (event === null) {
      skippedRowCount += 1;
      return;
    }
    if (events.has(event.legacyUuid)) duplicateLegacyUuidCount += 1;
    events.set(event.legacyUuid, event);
  });

  return { duplicateLegacyUuidCount, events, skippedRowCount };
};

const joinIdentityKey = (join: ParsedLegacyEventOrganizationJoin): string =>
  join.legacyUuid ?? `${join.legacyEventUuid}:${join.legacyOrganizationUuid}`;

const collectJoins = (rows: LegacyEventOrganizationJoinRow[]): CollectedJoins => {
  const joins = new Map<string, ParsedLegacyEventOrganizationJoin>();
  let duplicateJoinKeyCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyEventOrganizationJoinRow): void => {
    const join = parseEventOrganizationJoinFromRow(row);
    if (join === null) {
      skippedRowCount += 1;
      return;
    }
    const key = joinIdentityKey(join);
    if (joins.has(key)) duplicateJoinKeyCount += 1;
    joins.set(key, join);
  });

  return { duplicateJoinKeyCount, joins, skippedRowCount };
};

const buildExistingEventMap = async (
  collection: Collection<FilemakerEventMongoDocument>
): Promise<Map<string, ExistingEventRecord>> => {
  const documents = await collection
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { _id: 0, id: 1, legacyUuid: 1, createdAt: 1, eventName: 1 } }
    )
    .toArray();
  return new Map(
    documents
      .map((document: WithId<FilemakerEventMongoDocument>): [string, ExistingEventRecord] | null => {
        if (!document.legacyUuid || !document.id) return null;
        return [
          document.legacyUuid,
          {
            createdAt: document.createdAt,
            eventName: document.eventName,
            id: document.id,
          },
        ];
      })
      .filter((entry): entry is [string, ExistingEventRecord] => entry !== null)
  );
};

const buildAddressMap = async (db: Db): Promise<Map<string, AddressLookupRecord>> => {
  const documents = await db
    .collection(ADDRESSES_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          _id: 0,
          city: 1,
          country: 1,
          countryId: 1,
          id: 1,
          legacyUuid: 1,
          postalCode: 1,
          street: 1,
          streetNumber: 1,
        },
      }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, AddressLookupRecord] | null => {
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'] : '';
        if (!id || !legacyUuid) return null;
        return [
          legacyUuid,
          {
            city: typeof document['city'] === 'string' ? document['city'] : undefined,
            country: typeof document['country'] === 'string' ? document['country'] : undefined,
            countryId: typeof document['countryId'] === 'string' ? document['countryId'] : undefined,
            id,
            legacyUuid,
            postalCode:
              typeof document['postalCode'] === 'string' ? document['postalCode'] : undefined,
            street: typeof document['street'] === 'string' ? document['street'] : undefined,
            streetNumber:
              typeof document['streetNumber'] === 'string' ? document['streetNumber'] : undefined,
          },
        ];
      })
      .filter((entry): entry is [string, AddressLookupRecord] => entry !== null)
  );
};

const buildOrganizationMap = async (db: Db): Promise<Map<string, OrganizationLookupRecord>> => {
  const documents = await db
    .collection(ORGANIZATIONS_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { _id: 0, id: 1, legacyUuid: 1, name: 1 } }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, OrganizationLookupRecord] | null => {
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'] : '';
        if (!id || !legacyUuid) return null;
        const name = typeof document['name'] === 'string' ? document['name'] : undefined;
        return [legacyUuid, { id, legacyUuid, ...(name ? { name } : {}) }];
      })
      .filter((entry): entry is [string, OrganizationLookupRecord] => entry !== null)
  );
};

const buildModernEventIdMap = (
  events: Map<string, ParsedLegacyEvent>,
  existingByLegacyUuid: Map<string, ExistingEventRecord>
): Map<string, string> => {
  const idByLegacyUuid = new Map<string, string>();
  existingByLegacyUuid.forEach((existing: ExistingEventRecord, legacyUuid: string): void => {
    idByLegacyUuid.set(legacyUuid, existing.id);
  });
  events.forEach((event: ParsedLegacyEvent): void => {
    idByLegacyUuid.set(
      event.legacyUuid,
      existingByLegacyUuid.get(event.legacyUuid)?.id ?? createModernId('event', event.legacyUuid)
    );
  });
  return idByLegacyUuid;
};

const eventNameForLegacyUuid = (
  legacyUuid: string,
  events: Map<string, ParsedLegacyEvent>,
  existingByLegacyUuid: Map<string, ExistingEventRecord>
): string | undefined => events.get(legacyUuid)?.eventName ?? existingByLegacyUuid.get(legacyUuid)?.eventName;

const toEventDocument = (input: {
  addressByLegacyUuid: Map<string, AddressLookupRecord>;
  event: ParsedLegacyEvent;
  existing: ExistingEventRecord | undefined;
  id: string;
  importBatchId: string;
  importedAt: Date;
}): FilemakerEventMongoDocument => {
  const defaultAddress = input.event.legacyDefaultAddressUuid
    ? input.addressByLegacyUuid.get(input.event.legacyDefaultAddressUuid)
    : undefined;
  const displayAddress = input.event.legacyDisplayAddressUuid
    ? input.addressByLegacyUuid.get(input.event.legacyDisplayAddressUuid)
    : undefined;
  return {
    _id: input.id,
    addressId: defaultAddress?.id ?? '',
    ...(input.event.checked1 !== undefined ? { checked1: input.event.checked1 } : {}),
    ...(input.event.checked2 !== undefined ? { checked2: input.event.checked2 } : {}),
    city: defaultAddress?.city ?? '',
    ...(input.event.cooperationStatus ? { cooperationStatus: input.event.cooperationStatus } : {}),
    country: defaultAddress?.country ?? '',
    countryId: defaultAddress?.countryId ?? '',
    ...(input.event.createdAt || input.existing?.createdAt
      ? { createdAt: input.event.createdAt ?? input.existing?.createdAt }
      : {}),
    ...(input.event.currentDay ? { currentDay: input.event.currentDay } : {}),
    ...(input.event.currentWeekNumber !== undefined
      ? { currentWeekNumber: input.event.currentWeekNumber }
      : {}),
    ...(input.event.discontinued !== undefined ? { discontinued: input.event.discontinued } : {}),
    ...(displayAddress?.id ? { displayAddressId: displayAddress.id } : {}),
    eventName: input.event.eventName,
    ...(input.event.eventStartDate ? { eventStartDate: input.event.eventStartDate } : {}),
    id: input.id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    ...(input.event.lastEventInstanceDate
      ? { lastEventInstanceDate: input.event.lastEventInstanceDate }
      : {}),
    ...(input.event.legacyDefaultAddressUuid
      ? { legacyDefaultAddressUuid: input.event.legacyDefaultAddressUuid }
      : {}),
    ...(input.event.legacyDisplayAddressUuid
      ? { legacyDisplayAddressUuid: input.event.legacyDisplayAddressUuid }
      : {}),
    ...(input.event.legacyHowOftenUuid ? { legacyHowOftenUuid: input.event.legacyHowOftenUuid } : {}),
    ...(input.event.legacyLastEventInstanceUuid
      ? { legacyLastEventInstanceUuid: input.event.legacyLastEventInstanceUuid }
      : {}),
    ...(input.event.legacyParentUuid ? { legacyParentUuid: input.event.legacyParentUuid } : {}),
    legacyUuid: input.event.legacyUuid,
    ...(input.event.lengthDay !== undefined ? { lengthDay: input.event.lengthDay } : {}),
    ...(input.event.moveDay !== undefined ? { moveDay: input.event.moveDay } : {}),
    ...(input.event.organizationFilter ? { organizationFilter: input.event.organizationFilter } : {}),
    ...(input.event.organizationFilterCount !== undefined
      ? { organizationFilterCount: input.event.organizationFilterCount }
      : {}),
    postalCode: defaultAddress?.postalCode ?? '',
    ...(input.event.registrationMonth ? { registrationMonth: input.event.registrationMonth } : {}),
    schemaVersion: 1,
    street: defaultAddress?.street ?? '',
    streetNumber: defaultAddress?.streetNumber ?? '',
    ...(input.event.updatedAt ? { updatedAt: input.event.updatedAt } : {}),
    ...(input.event.updatedBy ? { updatedBy: input.event.updatedBy } : {}),
    ...(input.event.websiteFilter ? { websiteFilter: input.event.websiteFilter } : {}),
    ...(input.event.websiteFilterCount !== undefined
      ? { websiteFilterCount: input.event.websiteFilterCount }
      : {}),
  };
};

const toEventOrganizationLinkDocuments = (input: {
  events: Map<string, ParsedLegacyEvent>;
  existingByLegacyUuid: Map<string, ExistingEventRecord>;
  idByLegacyEventUuid: Map<string, string>;
  importBatchId: string;
  importedAt: Date;
  joins: Map<string, ParsedLegacyEventOrganizationJoin>;
  organizationByLegacyUuid: Map<string, OrganizationLookupRecord>;
}): FilemakerEventOrganizationLinkMongoDocument[] => {
  const documents = new Map<string, FilemakerEventOrganizationLinkMongoDocument>();
  input.joins.forEach((join: ParsedLegacyEventOrganizationJoin): void => {
    const eventId = input.idByLegacyEventUuid.get(join.legacyEventUuid);
    if (eventId === undefined) return;
    const organization = input.organizationByLegacyUuid.get(join.legacyOrganizationUuid);
    const identityKey = joinIdentityKey(join);
    const id = createModernId('event-organization-link', identityKey);
    documents.set(id, {
      _id: id,
      eventId,
      eventName: eventNameForLegacyUuid(
        join.legacyEventUuid,
        input.events,
        input.existingByLegacyUuid
      ),
      id,
      importBatchId: input.importBatchId,
      importedAt: input.importedAt,
      importSourceKind: IMPORT_SOURCE_KIND,
      legacyEventUuid: join.legacyEventUuid,
      legacyOrganizationUuid: join.legacyOrganizationUuid,
      ...(join.legacyUuid ? { legacyUuid: join.legacyUuid } : {}),
      ...(organization
        ? { organizationId: organization.id, organizationName: organization.name }
        : {}),
      schemaVersion: 1,
    });
  });
  return Array.from(documents.values());
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
    db.collection(EVENTS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      {
        name: 'filemaker_events_legacy_uuid_unique',
        partialFilterExpression: { legacyUuid: { $type: 'string' } },
        unique: true,
      }
    ),
    db.collection(EVENTS_COLLECTION).createIndex({ eventName: 1 }, { name: 'filemaker_events_name' }),
    db.collection(EVENTS_COLLECTION).createIndex(
      { eventStartDate: 1 },
      {
        name: 'filemaker_events_start_date',
        partialFilterExpression: { eventStartDate: { $type: 'string' } },
      }
    ),
    db.collection(EVENT_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { eventId: 1 },
      { name: 'filemaker_event_organization_links_event_id' }
    ),
    db.collection(EVENT_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { organizationId: 1 },
      {
        name: 'filemaker_event_organization_links_organization_id',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    db.collection(EVENT_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { legacyEventUuid: 1, legacyOrganizationUuid: 1 },
      { name: 'filemaker_event_organization_links_legacy_pair' }
    ),
    db.collection(EVENT_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      {
        name: 'filemaker_event_organization_links_legacy_uuid',
        partialFilterExpression: { legacyUuid: { $type: 'string' } },
      }
    ),
  ]);
};

const toUpsertOperation = <TDocument extends Document>(
  document: TDocument & { _id: string }
): AnyBulkWriteOperation<TDocument> => {
  const { _id, ...set } = document;
  return {
    updateOne: {
      filter: { _id } as Document,
      update: { $set: set, $setOnInsert: { _id } },
      upsert: true,
    },
  };
};

const runUpsertWrites = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: Array<TDocument & { _id: string }>,
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

  const parsedEventRows = await readLegacyEventRows(options.inputPath);
  const collectedEvents = collectEvents(parsedEventRows);
  const parsedJoinRows =
    options.joinInputPath === null ? [] : await readLegacyEventOrganizationJoinRows(options.joinInputPath);
  const collectedJoins = collectJoins(parsedJoinRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const eventsCollection = db.collection<FilemakerEventMongoDocument>(EVENTS_COLLECTION);
    const linksCollection = db.collection<FilemakerEventOrganizationLinkMongoDocument>(
      EVENT_ORGANIZATION_LINKS_COLLECTION
    );
    const replacedCollections =
      !options.dryRun && options.replaceCollections
        ? {
            eventOrganizationLinks: await dropCollectionIfExists(linksCollection),
            events: await dropCollectionIfExists(eventsCollection),
          }
        : { eventOrganizationLinks: false, events: false };
    if (!options.dryRun && !options.replaceCollections) await ensureIndexes(db);

    const existingByLegacyUuid = await buildExistingEventMap(eventsCollection);
    const idByLegacyEventUuid = buildModernEventIdMap(collectedEvents.events, existingByLegacyUuid);
    const [addressByLegacyUuid, organizationByLegacyUuid] = await Promise.all([
      buildAddressMap(db),
      buildOrganizationMap(db),
    ]);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const eventDocuments = Array.from(collectedEvents.events.values()).map(
      (event: ParsedLegacyEvent): FilemakerEventMongoDocument =>
        toEventDocument({
          addressByLegacyUuid,
          event,
          existing: existingByLegacyUuid.get(event.legacyUuid),
          id: idByLegacyEventUuid.get(event.legacyUuid) ?? createModernId('event', event.legacyUuid),
          importBatchId,
          importedAt,
        })
    );
    const linkDocuments = toEventOrganizationLinkDocuments({
      events: collectedEvents.events,
      existingByLegacyUuid,
      idByLegacyEventUuid,
      importBatchId,
      importedAt,
      joins: collectedJoins.joins,
      organizationByLegacyUuid,
    });
    const eventWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollections
        ? await runInsertWrites(eventsCollection, eventDocuments, options.batchSize)
        : await runUpsertWrites(eventsCollection, eventDocuments, options.batchSize);
    const linkWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollections
        ? await runInsertWrites(linksCollection, linkDocuments, options.batchSize)
        : await runUpsertWrites(linksCollection, linkDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const missingEventJoinCount = Array.from(collectedJoins.joins.values()).filter(
      (join: ParsedLegacyEventOrganizationJoin): boolean =>
        !idByLegacyEventUuid.has(join.legacyEventUuid)
    ).length;
    const resolvedOrganizationLinkCount = linkDocuments.filter(
      (link: FilemakerEventOrganizationLinkMongoDocument): boolean =>
        typeof link.organizationId === 'string'
    ).length;

    console.log(
      JSON.stringify(
        {
          addressLookupCount: addressByLegacyUuid.size,
          duplicateEventLegacyUuidCount: collectedEvents.duplicateLegacyUuidCount,
          duplicateJoinKeyCount: collectedJoins.duplicateJoinKeyCount,
          eventInputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          eventWrite,
          existingLegacyUuidCount: existingByLegacyUuid.size,
          importBatchId: options.dryRun ? null : importBatchId,
          inputPath: options.inputPath,
          joinInputPath: options.joinInputPath,
          joinWrite: linkWrite,
          mode: options.dryRun ? 'dry-run' : 'write',
          organizationLookupCount: organizationByLegacyUuid.size,
          parsedEventRowCount: parsedEventRows.length,
          parsedJoinRowCount: parsedJoinRows.length,
          replacedCollections,
          resolvedOrganizationLinkCount,
          skippedEventRowCount: collectedEvents.skippedRowCount,
          skippedJoinMissingEventCount: missingEventJoinCount,
          skippedJoinRowCount: collectedJoins.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniqueEventCount: collectedEvents.events.size,
          uniqueEventOrganizationLinkCount: linkDocuments.length,
          uniqueJoinCount: collectedJoins.joins.size,
          unresolvedOrganizationLinkCount: linkDocuments.length - resolvedOrganizationLinkCount,
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
