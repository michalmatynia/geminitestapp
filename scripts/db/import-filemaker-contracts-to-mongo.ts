import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  CONTRACT_DISPLAY_REQUIRED_FIELDS,
  CONTRACT_EVENT_LINK_REQUIRED_FIELDS,
  CONTRACT_PERSON_LINK_REQUIRED_FIELDS,
  parseContractDisplayFromRow,
  parseContractEventLinkFromRow,
  parseContractPersonLinkFromRow,
  parseFilemakerLegacyContractRows,
  parseFilemakerLegacyContractWorkbookRows,
  type LegacyContractRow,
  type ParsedLegacyContractDisplay,
  type ParsedLegacyContractEventLink,
  type ParsedLegacyContractPersonLink,
} from '@/features/filemaker/filemaker-contracts-import.parser';
import type { FilemakerContractPartyKind } from '@/features/filemaker/filemaker-contract.types';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const CONTRACTS_COLLECTION = 'filemaker_contracts';
const CONTRACT_EVENT_LINKS_COLLECTION = 'filemaker_contract_event_links';
const CONTRACT_PERSON_LINKS_COLLECTION = 'filemaker_contract_person_links';
const EVENTS_COLLECTION = 'filemaker_events';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const VALUES_COLLECTION = 'filemaker_values';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 5_000;
const DEFAULT_CONTRACT_LIST_INPUT = 'csv/b/contractList.xlsx';
const DEFAULT_EVENT_LINK_INPUT = 'csv/b/ContractBookToNameEvent.xlsx';
const DEFAULT_PERSON_LINK_INPUT = 'csv/b/ContractBookPerson.xlsx';
const IMPORT_SOURCE_KIND = 'filemaker.contract';

type CliOptions = {
  batchSize: number;
  contractListInputPath: string;
  dryRun: boolean;
  eventLinkInputPath: string;
  personLinkInputPath: string;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type PartyLookupRecord = {
  id: string;
  kind: FilemakerContractPartyKind;
  legacyUuid: string;
  name?: string;
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

type FilemakerContractMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  firstEventEndDate?: string;
  firstEventName?: string;
  firstEventStartDate?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyOnBehalfUuid?: string;
  legacyUuid: string;
  onBehalfId?: string;
  onBehalfKind?: FilemakerContractPartyKind;
  onBehalfName?: string;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
};

type FilemakerContractEventLinkMongoDocument = Document & {
  _id: string;
  city?: string;
  contractId: string;
  createdAt?: string;
  createdBy?: string;
  endDate?: string;
  eventId?: string;
  eventName?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyContractUuid: string;
  legacyCountryUuid?: string;
  legacyEventInstanceUuid?: string;
  legacyEventUuid: string;
  legacyOnBehalfUuid?: string;
  legacyUuid?: string;
  schemaVersion: 1;
  startDate?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type FilemakerContractPersonLinkMongoDocument = Document & {
  _id: string;
  contractId: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyContractUuid: string;
  legacyPersonUuid: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
  personId?: string;
  personName?: string;
  schemaVersion: 1;
  statusLabel?: string;
  statusValueId?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type CollectedDisplays = {
  displays: ParsedLegacyContractDisplay[];
  skippedRowCount: number;
};

type CollectedEventLinks = {
  duplicateKeyCount: number;
  eventLinks: ParsedLegacyContractEventLink[];
  skippedRowCount: number;
};

type CollectedPersonLinks = {
  duplicateKeyCount: number;
  personLinks: ParsedLegacyContractPersonLink[];
  skippedRowCount: number;
};

type WriteResultSummary = {
  insertedCount?: number;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    batchSize: DEFAULT_BATCH_SIZE,
    contractListInputPath: DEFAULT_CONTRACT_LIST_INPUT,
    dryRun: true,
    eventLinkInputPath: DEFAULT_EVENT_LINK_INPUT,
    personLinkInputPath: DEFAULT_PERSON_LINK_INPUT,
    replaceCollections: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollections = true;
    if (arg.startsWith('--contract-list-input=')) {
      options.contractListInputPath = arg.slice('--contract-list-input='.length).trim();
    }
    if (arg.startsWith('--event-link-input=')) {
      options.eventLinkInputPath = arg.slice('--event-link-input='.length).trim();
    }
    if (arg.startsWith('--person-link-input=')) {
      options.personLinkInputPath = arg.slice('--person-link-input='.length).trim();
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--')) options.contractListInputPath = arg.trim();
  });

  return options;
};

const createModernId = (
  kind: 'contract' | 'contract-event-link' | 'contract-person-link',
  key: string
): string => {
  const digest = createHash('sha256')
    .update(`filemaker.${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyContractRows = async (
  inputPath: string,
  options: { requiredFields: readonly string[]; tableName: string }
): Promise<LegacyContractRow[]> => {
  const requiredFields = [...options.requiredFields];
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyContractWorkbookRows(await readFile(inputPath), {
      requiredFields,
      tableName: options.tableName,
    });
  }
  return parseFilemakerLegacyContractRows(await readFile(inputPath, 'utf8'), {
    requiredFields,
    tableName: options.tableName,
  });
};

const collectDisplays = (rows: LegacyContractRow[]): CollectedDisplays => {
  const displays: ParsedLegacyContractDisplay[] = [];
  let skippedRowCount = 0;
  rows.forEach((row: LegacyContractRow): void => {
    const display = parseContractDisplayFromRow(row);
    if (display === null) {
      skippedRowCount += 1;
      return;
    }
    displays.push(display);
  });
  return { displays, skippedRowCount };
};

const eventLinkIdentityKey = (link: ParsedLegacyContractEventLink): string =>
  link.legacyUuid ?? `${link.legacyContractUuid}:${link.legacyEventUuid}`;

const personLinkIdentityKey = (link: ParsedLegacyContractPersonLink): string =>
  link.legacyUuid ?? `${link.legacyContractUuid}:${link.legacyPersonUuid}`;

const collectEventLinks = (rows: LegacyContractRow[]): CollectedEventLinks => {
  const eventLinksByKey = new Map<string, ParsedLegacyContractEventLink>();
  let duplicateKeyCount = 0;
  let skippedRowCount = 0;
  rows.forEach((row: LegacyContractRow): void => {
    const eventLink = parseContractEventLinkFromRow(row);
    if (eventLink === null) {
      skippedRowCount += 1;
      return;
    }
    const key = eventLinkIdentityKey(eventLink);
    if (eventLinksByKey.has(key)) duplicateKeyCount += 1;
    eventLinksByKey.set(key, eventLink);
  });
  return { duplicateKeyCount, eventLinks: [...eventLinksByKey.values()], skippedRowCount };
};

const collectPersonLinks = (rows: LegacyContractRow[]): CollectedPersonLinks => {
  const personLinksByKey = new Map<string, ParsedLegacyContractPersonLink>();
  let duplicateKeyCount = 0;
  let skippedRowCount = 0;
  rows.forEach((row: LegacyContractRow): void => {
    const personLink = parseContractPersonLinkFromRow(row);
    if (personLink === null) {
      skippedRowCount += 1;
      return;
    }
    const key = personLinkIdentityKey(personLink);
    if (personLinksByKey.has(key)) duplicateKeyCount += 1;
    personLinksByKey.set(key, personLink);
  });
  return { duplicateKeyCount, personLinks: [...personLinksByKey.values()], skippedRowCount };
};

const groupDisplaysByEvent = (
  displays: ParsedLegacyContractDisplay[]
): Map<string, ParsedLegacyContractDisplay[]> => {
  const grouped = new Map<string, ParsedLegacyContractDisplay[]>();
  displays.forEach((display: ParsedLegacyContractDisplay): void => {
    grouped.set(display.legacyEventUuid, [...(grouped.get(display.legacyEventUuid) ?? []), display]);
  });
  return grouped;
};

const enrichEventLinksWithDisplays = (
  eventLinks: ParsedLegacyContractEventLink[],
  displays: ParsedLegacyContractDisplay[]
): ParsedLegacyContractEventLink[] => {
  const groupedDisplays = groupDisplaysByEvent(displays);
  return eventLinks.map((eventLink: ParsedLegacyContractEventLink): ParsedLegacyContractEventLink => {
    const display = groupedDisplays.get(eventLink.legacyEventUuid)?.shift();
    if (display === undefined) return eventLink;
    return {
      ...eventLink,
      city: display.city,
      endDate: display.endDate,
      eventName: eventLink.eventName ?? display.eventName,
      legacyCountryUuid: display.legacyCountryUuid,
      legacyOnBehalfUuid: display.legacyOnBehalfUuid,
      startDate: display.startDate,
    };
  });
};

const buildSupplementalPersonLinksFromDisplays = (
  eventLinks: ParsedLegacyContractEventLink[],
  displays: ParsedLegacyContractDisplay[]
): ParsedLegacyContractPersonLink[] => {
  const groupedDisplays = groupDisplaysByEvent(displays);
  return eventLinks.flatMap(
    (eventLink: ParsedLegacyContractEventLink): ParsedLegacyContractPersonLink[] => {
      const display = groupedDisplays.get(eventLink.legacyEventUuid)?.shift();
      if (display?.legacyParticipantUuid === undefined) return [];
      return [
        {
          legacyContractUuid: eventLink.legacyContractUuid,
          legacyPersonUuid: display.legacyParticipantUuid,
          legacyStatusUuid: display.legacyParticipantStatusUuid,
        },
      ];
    }
  );
};

const contractPersonPairKey = (link: ParsedLegacyContractPersonLink): string =>
  `${link.legacyContractUuid}:${link.legacyPersonUuid}`;

const mergePersonLinks = (
  importedLinks: ParsedLegacyContractPersonLink[],
  displayLinks: ParsedLegacyContractPersonLink[]
): ParsedLegacyContractPersonLink[] => {
  const byPair = new Map<string, ParsedLegacyContractPersonLink>();
  importedLinks.forEach((link: ParsedLegacyContractPersonLink): void => {
    byPair.set(contractPersonPairKey(link), link);
  });
  displayLinks.forEach((link: ParsedLegacyContractPersonLink): void => {
    const key = contractPersonPairKey(link);
    const existing = byPair.get(key);
    byPair.set(key, {
      ...link,
      ...existing,
      legacyStatusUuid: existing?.legacyStatusUuid ?? link.legacyStatusUuid,
    });
  });
  return [...byPair.values()];
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const buildPersonName = (document: Document): string | undefined => {
  const fullName = optionalString(document['fullName']);
  if (fullName !== undefined) return fullName;
  const name = [document['firstName'], document['lastName']]
    .map(optionalString)
    .filter((part): part is string => part !== undefined)
    .join(' ');
  return name.length > 0 ? name : undefined;
};

const buildPartyMapForCollection = async (
  db: Db,
  input: { collectionName: string; kind: FilemakerContractPartyKind }
): Promise<Map<string, PartyLookupRecord>> => {
  const documents = await db
    .collection(input.collectionName)
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { eventName: 1, firstName: 1, fullName: 1, id: 1, lastName: 1, legacyUuid: 1, name: 1 } }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, PartyLookupRecord] | null => {
        const id = optionalString(document['id']);
        const legacyUuid = optionalString(document['legacyUuid'])?.toUpperCase();
        if (id === undefined || legacyUuid === undefined) return null;
        const name =
          input.kind === 'person'
            ? buildPersonName(document)
            : optionalString(document[input.kind === 'event' ? 'eventName' : 'name']);
        return [legacyUuid, { id, kind: input.kind, legacyUuid, ...(name ? { name } : {}) }];
      })
      .filter((entry): entry is [string, PartyLookupRecord] => entry !== null)
  );
};

const combinePartyMaps = (
  maps: Array<Map<string, PartyLookupRecord>>
): Map<string, PartyLookupRecord> => {
  const combined = new Map<string, PartyLookupRecord>();
  maps.forEach((map: Map<string, PartyLookupRecord>): void => {
    map.forEach((record: PartyLookupRecord, legacyUuid: string): void => {
      if (!combined.has(legacyUuid)) combined.set(legacyUuid, record);
    });
  });
  return combined;
};

const buildPartyMap = async (db: Db): Promise<Map<string, PartyLookupRecord>> =>
  combinePartyMaps([
    await buildPartyMapForCollection(db, { collectionName: PERSONS_COLLECTION, kind: 'person' }),
    await buildPartyMapForCollection(db, {
      collectionName: ORGANIZATIONS_COLLECTION,
      kind: 'organization',
    }),
    await buildPartyMapForCollection(db, { collectionName: EVENTS_COLLECTION, kind: 'event' }),
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

const firstDefined = (...values: Array<string | undefined>): string | undefined =>
  values.find((value: string | undefined): boolean => value !== undefined);

const buildContractDocuments = (input: {
  eventLinks: ParsedLegacyContractEventLink[];
  importBatchId: string;
  importedAt: Date;
  partyByLegacyUuid: Map<string, PartyLookupRecord>;
  personLinks: ParsedLegacyContractPersonLink[];
}): FilemakerContractMongoDocument[] => {
  const contractUuids = new Set<string>([
    ...input.eventLinks.map((link: ParsedLegacyContractEventLink): string => link.legacyContractUuid),
    ...input.personLinks.map((link: ParsedLegacyContractPersonLink): string => link.legacyContractUuid),
  ]);
  return [...contractUuids].map((legacyContractUuid: string): FilemakerContractMongoDocument => {
    const eventLink = input.eventLinks.find(
      (link: ParsedLegacyContractEventLink): boolean => link.legacyContractUuid === legacyContractUuid
    );
    const onBehalf =
      eventLink?.legacyOnBehalfUuid === undefined
        ? undefined
        : input.partyByLegacyUuid.get(eventLink.legacyOnBehalfUuid);
    const id = createModernId('contract', legacyContractUuid);
    return {
      _id: id,
      ...(firstDefined(eventLink?.createdAt) ? { createdAt: firstDefined(eventLink?.createdAt) } : {}),
      ...(eventLink?.endDate ? { firstEventEndDate: eventLink.endDate } : {}),
      ...(eventLink?.eventName ? { firstEventName: eventLink.eventName } : {}),
      ...(eventLink?.startDate ? { firstEventStartDate: eventLink.startDate } : {}),
      id,
      importBatchId: input.importBatchId,
      importedAt: input.importedAt,
      importSourceKind: IMPORT_SOURCE_KIND,
      ...(eventLink?.legacyOnBehalfUuid ? { legacyOnBehalfUuid: eventLink.legacyOnBehalfUuid } : {}),
      legacyUuid: legacyContractUuid,
      ...(onBehalf ? { onBehalfId: onBehalf.id, onBehalfKind: onBehalf.kind } : {}),
      ...(onBehalf?.name ? { onBehalfName: onBehalf.name } : {}),
      schemaVersion: 1,
      ...(firstDefined(eventLink?.updatedAt) ? { updatedAt: firstDefined(eventLink?.updatedAt) } : {}),
      ...(eventLink?.updatedBy ? { updatedBy: eventLink.updatedBy } : {}),
    };
  });
};

const toContractEventLinkDocument = (input: {
  eventLink: ParsedLegacyContractEventLink;
  importBatchId: string;
  importedAt: Date;
  partyByLegacyUuid: Map<string, PartyLookupRecord>;
}): FilemakerContractEventLinkMongoDocument => {
  const event = input.partyByLegacyUuid.get(input.eventLink.legacyEventUuid);
  const key = eventLinkIdentityKey(input.eventLink);
  const id = createModernId('contract-event-link', key);
  return {
    _id: id,
    ...(input.eventLink.city ? { city: input.eventLink.city } : {}),
    contractId: createModernId('contract', input.eventLink.legacyContractUuid),
    ...(input.eventLink.createdAt ? { createdAt: input.eventLink.createdAt } : {}),
    ...(input.eventLink.createdBy ? { createdBy: input.eventLink.createdBy } : {}),
    ...(input.eventLink.endDate ? { endDate: input.eventLink.endDate } : {}),
    ...(event ? { eventId: event.id } : {}),
    ...(input.eventLink.eventName ?? event?.name
      ? { eventName: input.eventLink.eventName ?? event?.name }
      : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyContractUuid: input.eventLink.legacyContractUuid,
    ...(input.eventLink.legacyCountryUuid ? { legacyCountryUuid: input.eventLink.legacyCountryUuid } : {}),
    ...(input.eventLink.legacyEventInstanceUuid
      ? { legacyEventInstanceUuid: input.eventLink.legacyEventInstanceUuid }
      : {}),
    legacyEventUuid: input.eventLink.legacyEventUuid,
    ...(input.eventLink.legacyOnBehalfUuid
      ? { legacyOnBehalfUuid: input.eventLink.legacyOnBehalfUuid }
      : {}),
    ...(input.eventLink.legacyUuid ? { legacyUuid: input.eventLink.legacyUuid } : {}),
    schemaVersion: 1,
    ...(input.eventLink.startDate ? { startDate: input.eventLink.startDate } : {}),
    ...(input.eventLink.updatedAt ? { updatedAt: input.eventLink.updatedAt } : {}),
    ...(input.eventLink.updatedBy ? { updatedBy: input.eventLink.updatedBy } : {}),
  };
};

const toContractPersonLinkDocument = (input: {
  importBatchId: string;
  importedAt: Date;
  partyByLegacyUuid: Map<string, PartyLookupRecord>;
  personLink: ParsedLegacyContractPersonLink;
  valueByLegacyUuid: Map<string, ValueLookupRecord>;
}): FilemakerContractPersonLinkMongoDocument => {
  const person = input.partyByLegacyUuid.get(input.personLink.legacyPersonUuid);
  const status =
    input.personLink.legacyStatusUuid === undefined
      ? undefined
      : input.valueByLegacyUuid.get(input.personLink.legacyStatusUuid);
  const key = personLinkIdentityKey(input.personLink);
  const id = createModernId('contract-person-link', key);
  return {
    _id: id,
    contractId: createModernId('contract', input.personLink.legacyContractUuid),
    ...(input.personLink.createdAt ? { createdAt: input.personLink.createdAt } : {}),
    ...(input.personLink.createdBy ? { createdBy: input.personLink.createdBy } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyContractUuid: input.personLink.legacyContractUuid,
    legacyPersonUuid: input.personLink.legacyPersonUuid,
    ...(input.personLink.legacyStatusUuid ? { legacyStatusUuid: input.personLink.legacyStatusUuid } : {}),
    ...(input.personLink.legacyUuid ? { legacyUuid: input.personLink.legacyUuid } : {}),
    ...(person ? { personId: person.id } : {}),
    ...(person?.name ? { personName: person.name } : {}),
    schemaVersion: 1,
    ...(status ? { statusLabel: status.label, statusValueId: status.id } : {}),
    ...(input.personLink.updatedAt ? { updatedAt: input.personLink.updatedAt } : {}),
    ...(input.personLink.updatedBy ? { updatedBy: input.personLink.updatedBy } : {}),
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
    db.collection(CONTRACTS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_contracts_legacy_uuid_unique', unique: true }
    ),
    db.collection(CONTRACTS_COLLECTION).createIndex(
      { onBehalfKind: 1, onBehalfId: 1 },
      {
        name: 'filemaker_contracts_on_behalf',
        partialFilterExpression: { onBehalfId: { $type: 'string' } },
      }
    ),
    db.collection(CONTRACT_EVENT_LINKS_COLLECTION).createIndex(
      { legacyContractUuid: 1, legacyEventUuid: 1 },
      { name: 'filemaker_contract_event_links_legacy_contract_event' }
    ),
    db.collection(CONTRACT_EVENT_LINKS_COLLECTION).createIndex(
      { eventId: 1 },
      {
        name: 'filemaker_contract_event_links_event_id',
        partialFilterExpression: { eventId: { $type: 'string' } },
      }
    ),
    db.collection(CONTRACT_PERSON_LINKS_COLLECTION).createIndex(
      { legacyContractUuid: 1, legacyPersonUuid: 1 },
      { name: 'filemaker_contract_person_links_legacy_contract_person' }
    ),
    db.collection(CONTRACT_PERSON_LINKS_COLLECTION).createIndex(
      { personId: 1 },
      {
        name: 'filemaker_contract_person_links_person_id',
        partialFilterExpression: { personId: { $type: 'string' } },
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
    if (batch.length === 0) continue;
    const result = await collection.bulkWrite(batch.map(toUpsertOperation), { ordered: false });
    matchedCount += result.matchedCount;
    modifiedCount += result.modifiedCount;
    upsertedCount += result.upsertedCount;
  }
  return { matchedCount, modifiedCount, upsertedCount };
};

const writeCollection = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: Array<TDocument & { _id: string; id: string }>,
  options: { batchSize: number; dryRun: boolean }
): Promise<WriteResultSummary> =>
  options.dryRun
    ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
    : runBulkWrites(collection, documents, options.batchSize);

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const [displayRows, eventLinkRows, personLinkRows] = await Promise.all([
    readLegacyContractRows(options.contractListInputPath, {
      requiredFields: CONTRACT_DISPLAY_REQUIRED_FIELDS,
      tableName: 'contract display',
    }),
    readLegacyContractRows(options.eventLinkInputPath, {
      requiredFields: CONTRACT_EVENT_LINK_REQUIRED_FIELDS,
      tableName: 'contract-event join',
    }),
    readLegacyContractRows(options.personLinkInputPath, {
      requiredFields: CONTRACT_PERSON_LINK_REQUIRED_FIELDS,
      tableName: 'contract-person join',
    }),
  ]);
  const collectedDisplays = collectDisplays(displayRows);
  const collectedEventLinks = collectEventLinks(eventLinkRows);
  const collectedPersonLinks = collectPersonLinks(personLinkRows);
  const enrichedEventLinks = enrichEventLinksWithDisplays(
    collectedEventLinks.eventLinks,
    collectedDisplays.displays
  );
  const displayPersonLinks = buildSupplementalPersonLinksFromDisplays(
    collectedEventLinks.eventLinks,
    collectedDisplays.displays
  );
  const personLinks = mergePersonLinks(collectedPersonLinks.personLinks, displayPersonLinks);

  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    if (!options.dryRun && options.replaceCollections) {
      await Promise.all([
        dropCollectionIfExists(db.collection(CONTRACTS_COLLECTION)),
        dropCollectionIfExists(db.collection(CONTRACT_EVENT_LINKS_COLLECTION)),
        dropCollectionIfExists(db.collection(CONTRACT_PERSON_LINKS_COLLECTION)),
      ]);
    }
    if (!options.dryRun && !options.replaceCollections) await ensureIndexes(db);

    const partyByLegacyUuid = await buildPartyMap(db);
    const valueByLegacyUuid = await buildValueMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const contractDocuments = buildContractDocuments({
      eventLinks: enrichedEventLinks,
      importBatchId,
      importedAt,
      partyByLegacyUuid,
      personLinks,
    });
    const eventLinkDocuments = enrichedEventLinks.map(
      (eventLink: ParsedLegacyContractEventLink): FilemakerContractEventLinkMongoDocument =>
        toContractEventLinkDocument({
          eventLink,
          importBatchId,
          importedAt,
          partyByLegacyUuid,
        })
    );
    const personLinkDocuments = personLinks.map(
      (personLink: ParsedLegacyContractPersonLink): FilemakerContractPersonLinkMongoDocument =>
        toContractPersonLinkDocument({
          importBatchId,
          importedAt,
          partyByLegacyUuid,
          personLink,
          valueByLegacyUuid,
        })
    );

    const [contractWrite, eventLinkWrite, personLinkWrite] = await Promise.all([
      writeCollection(db.collection<FilemakerContractMongoDocument>(CONTRACTS_COLLECTION), contractDocuments, options),
      writeCollection(
        db.collection<FilemakerContractEventLinkMongoDocument>(CONTRACT_EVENT_LINKS_COLLECTION),
        eventLinkDocuments,
        options
      ),
      writeCollection(
        db.collection<FilemakerContractPersonLinkMongoDocument>(CONTRACT_PERSON_LINKS_COLLECTION),
        personLinkDocuments,
        options
      ),
    ]);
    if (!options.dryRun) await ensureIndexes(db);

    const resolvedEventLinkCount = eventLinkDocuments.filter(
      (link: FilemakerContractEventLinkMongoDocument): boolean => typeof link.eventId === 'string'
    ).length;
    const resolvedPersonLinkCount = personLinkDocuments.filter(
      (link: FilemakerContractPersonLinkMongoDocument): boolean => typeof link.personId === 'string'
    ).length;
    const statusCount = personLinkDocuments.filter(
      (link: FilemakerContractPersonLinkMongoDocument): boolean => typeof link.legacyStatusUuid === 'string'
    ).length;
    const resolvedStatusCount = personLinkDocuments.filter(
      (link: FilemakerContractPersonLinkMongoDocument): boolean => typeof link.statusValueId === 'string'
    ).length;

    console.log(
      JSON.stringify(
        {
          contractListInputPath: options.contractListInputPath,
          contractWrite,
          displayRowCount: collectedDisplays.displays.length,
          duplicateEventLinkKeyCount: collectedEventLinks.duplicateKeyCount,
          duplicatePersonLinkKeyCount: collectedPersonLinks.duplicateKeyCount,
          eventLinkInputPath: options.eventLinkInputPath,
          eventLinkWrite,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: extname(options.contractListInputPath).slice(1) || 'text',
          mode: options.dryRun ? 'dry-run' : 'write',
          partyLookupCount: partyByLegacyUuid.size,
          personLinkInputPath: options.personLinkInputPath,
          personLinkWrite,
          resolvedEventLinkCount,
          resolvedPersonLinkCount,
          resolvedStatusCount,
          skippedDisplayRowCount: collectedDisplays.skippedRowCount,
          skippedEventLinkRowCount: collectedEventLinks.skippedRowCount,
          skippedPersonLinkRowCount: collectedPersonLinks.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          statusCount,
          uniqueContractCount: contractDocuments.length,
          uniqueEventLinkCount: eventLinkDocuments.length,
          uniquePersonLinkCount: personLinkDocuments.length,
          unresolvedEventLinkCount: eventLinkDocuments.length - resolvedEventLinkCount,
          unresolvedPersonLinkCount: personLinkDocuments.length - resolvedPersonLinkCount,
          unresolvedStatusCount: statusCount - resolvedStatusCount,
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
