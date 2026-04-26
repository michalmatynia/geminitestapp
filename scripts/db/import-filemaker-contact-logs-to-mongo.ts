import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';

import {
  parseContactLogFromRow,
  parseFilemakerLegacyContactLogRows,
  streamFilemakerLegacyContactLogWorkbookRows,
  type LegacyContactLogRow,
  type ParsedLegacyContactLog,
  type ParsedLegacyContactLogValue,
} from '@/features/filemaker/filemaker-contact-logs-import.parser';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const CONTACT_LOGS_COLLECTION = 'filemaker_contact_logs';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const PERSONS_COLLECTION = 'filemaker_persons';
const EVENTS_COLLECTION = 'filemaker_events';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_BATCH_SIZE = 2_000;
const IMPORT_SOURCE_KIND = 'filemaker.contact_log';

type ContactLogPartyKind = 'event' | 'organization' | 'person';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type PartyLookupRecord = {
  id: string;
  kind: ContactLogPartyKind;
  legacyUuid: string;
  name?: string;
};

type ValueLookupRecord = {
  id: string;
  label: string;
  legacyUuid: string;
  parentId?: string | null;
};

type ContactLogPartyMongoDocument = {
  legacyOwnerUuid: string;
  ownerName?: string;
  partyId: string;
  partyKind: ContactLogPartyKind;
};

type ContactLogValueMongoDocument = {
  kind: ParsedLegacyContactLogValue['kind'];
  label?: string;
  legacyValueUuid: string;
  parentId?: string | null;
  valueId?: string;
};

type FilemakerContactLogMongoDocument = Document & {
  _id: string;
  comment?: string;
  contactTypeLabel?: string;
  contactTypeValueId?: string;
  createdAt?: string;
  dateEntered?: string;
  eventId?: string;
  eventName?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyContactTypeUuid?: string;
  legacyFilemakerId?: string;
  legacyMailCampaignUuid?: string;
  legacyMailServerUuid?: string;
  legacyOnBehalfUuid?: string;
  legacyOrganizationUuid?: string;
  legacyOwnerUuids: string[];
  legacyParentUuid?: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  legacyYearProspectUuid?: string;
  linkedParties: ContactLogPartyMongoDocument[];
  mailCampaignLabel?: string;
  mailCampaignValueId?: string;
  mailServerLabel?: string;
  mailServerValueId?: string;
  onBehalfLabel?: string;
  onBehalfValueId?: string;
  organizationId?: string;
  organizationName?: string;
  ownerName?: string;
  partyId?: string;
  partyKind?: ContactLogPartyKind;
  personId?: string;
  personName?: string;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: ContactLogValueMongoDocument[];
  yearProspectLabel?: string;
  yearProspectValueId?: string;
};

type WriteResultSummary = {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

type ImportCounters = {
  ambiguousOwnerCount: number;
  duplicateLegacyUuidCount: number;
  importedDocumentCount: number;
  parsedRowCount: number;
  partyKindCounts: Record<ContactLogPartyKind, number>;
  resolvedOwnerLinkCount: number;
  resolvedValueUuidCount: number;
  skippedRowCount: number;
  totalLegacyValueUuidCount: number;
  uniqueLegacyUuidCount: number;
  unresolvedOwnerCount: number;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-contact-logs-to-mongo.ts --input=csv/logcontact.xlsx --write',
      '',
      'Imports FileMaker contact log CSV/TSV/XLSX exports into filemaker_contact_logs.',
      'UUID is retained as legacyUuid, and each record receives a deterministic modern id.',
      'Parent_UUID_FK and NameOrganisation::UUID are resolved against imported organisations, persons, and events.',
      'Contact_Type_UUID_FK, MailCampaign_UUID_FK, MailServer_UUID_FK, On_Behalf_UUID_FK, and YearProspect_UUID_FK are resolved against imported FileMaker values.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the contact-log collection.',
      'Pass --source=local or --source=cloud to override the active Mongo source.',
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
    .update(`filemaker.contact_log:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-contact-log-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean =>
  ['.xlsx', '.xls'].includes(extname(inputPath).toLowerCase());

const buildPartyMapForCollection = async (
  db: Db,
  collectionName: string,
  kind: ContactLogPartyKind
): Promise<Map<string, PartyLookupRecord>> => {
  const documents = await db
    .collection(collectionName)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          eventName: 1,
          firstName: 1,
          fullName: 1,
          id: 1,
          lastName: 1,
          legacyUuid: 1,
          name: 1,
        },
      }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, PartyLookupRecord] | null => {
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'] : '';
        if (!id || !legacyUuid) return null;
        const eventName = typeof document['eventName'] === 'string' ? document['eventName'] : '';
        const fullName = typeof document['fullName'] === 'string' ? document['fullName'] : '';
        const name =
          typeof document['name'] === 'string'
            ? document['name']
            : eventName ||
              fullName ||
              [document['firstName'], document['lastName']]
                .filter((part: unknown): part is string => typeof part === 'string')
                .join(' ');
        return [legacyUuid.toUpperCase(), { id, kind, legacyUuid, ...(name ? { name } : {}) }];
      })
      .filter((entry): entry is [string, PartyLookupRecord] => entry !== null)
  );
};

const mergePartyMaps = (
  partyMaps: Array<Map<string, PartyLookupRecord>>
): Map<string, PartyLookupRecord[]> => {
  const result = new Map<string, PartyLookupRecord[]>();
  partyMaps.forEach((partyMap: Map<string, PartyLookupRecord>): void => {
    partyMap.forEach((record: PartyLookupRecord, legacyUuid: string): void => {
      result.set(legacyUuid, [...(result.get(legacyUuid) ?? []), record]);
    });
  });
  return result;
};

const buildPartyMap = async (db: Db): Promise<Map<string, PartyLookupRecord[]>> => {
  const [organizations, persons, events] = await Promise.all([
    buildPartyMapForCollection(db, ORGANIZATIONS_COLLECTION, 'organization'),
    buildPartyMapForCollection(db, PERSONS_COLLECTION, 'person'),
    buildPartyMapForCollection(db, EVENTS_COLLECTION, 'event'),
  ]);
  return mergePartyMaps([organizations, persons, events]);
};

const buildValueMap = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
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
        return [
          legacyUuid,
          {
            id: value.id,
            label: value.label,
            legacyUuid,
            parentId: value.parentId,
          },
        ];
      })
      .filter((entry): entry is [string, ValueLookupRecord] => entry !== null)
  );
};

const findParties = (input: {
  contactLog: ParsedLegacyContactLog;
  partyByLegacyUuid: Map<string, PartyLookupRecord[]>;
}): ContactLogPartyMongoDocument[] => {
  const candidates = [
    { legacyUuid: input.contactLog.legacyParentUuid, preferredKind: undefined },
    { legacyUuid: input.contactLog.legacyOrganizationUuid, preferredKind: 'organization' },
  ] as const;
  const partiesByKey = new Map<string, ContactLogPartyMongoDocument>();

  candidates.forEach((candidate): void => {
    if (!candidate.legacyUuid) return;
    const allParties = input.partyByLegacyUuid.get(candidate.legacyUuid) ?? [];
    const parties =
      candidate.preferredKind === undefined
        ? allParties
        : allParties.filter((party: PartyLookupRecord): boolean => party.kind === candidate.preferredKind);
    parties.forEach((party: PartyLookupRecord): void => {
      const key = `${party.kind}:${party.id}`;
      if (partiesByKey.has(key)) return;
      partiesByKey.set(key, {
        legacyOwnerUuid: candidate.legacyUuid,
        ...(party.name ? { ownerName: party.name } : {}),
        partyId: party.id,
        partyKind: party.kind,
      });
    });
  });

  return Array.from(partiesByKey.values());
};

const toValueDocument = (
  contactLogValue: ParsedLegacyContactLogValue,
  value: ValueLookupRecord | undefined
): ContactLogValueMongoDocument => ({
  kind: contactLogValue.kind,
  ...(value ? { label: value.label, parentId: value.parentId, valueId: value.id } : {}),
  legacyValueUuid: contactLogValue.legacyValueUuid,
});

const findValueByKind = (
  values: ContactLogValueMongoDocument[],
  kind: ParsedLegacyContactLogValue['kind']
): ContactLogValueMongoDocument | undefined =>
  values.find((value: ContactLogValueMongoDocument): boolean => value.kind === kind);

const findPartyByKind = (
  parties: ContactLogPartyMongoDocument[],
  kind: ContactLogPartyKind
): ContactLogPartyMongoDocument | undefined =>
  parties.find((party: ContactLogPartyMongoDocument): boolean => party.partyKind === kind);

const toContactLogDocument = (input: {
  contactLog: ParsedLegacyContactLog;
  importBatchId: string;
  importedAt: Date;
  partyByLegacyUuid: Map<string, PartyLookupRecord[]>;
  valueByLegacyUuid: Map<string, ValueLookupRecord>;
}): FilemakerContactLogMongoDocument => {
  const id = createModernId(input.contactLog.legacyUuid);
  const values = input.contactLog.values.map((contactLogValue: ParsedLegacyContactLogValue) =>
    toValueDocument(
      contactLogValue,
      input.valueByLegacyUuid.get(contactLogValue.legacyValueUuid)
    )
  );
  const valueIds = values
    .map((value: ContactLogValueMongoDocument): string => value.valueId ?? '')
    .filter((valueId: string): boolean => valueId.length > 0);
  const linkedParties = findParties({
    contactLog: input.contactLog,
    partyByLegacyUuid: input.partyByLegacyUuid,
  });
  const primaryParty = linkedParties[0];
  const organization = findPartyByKind(linkedParties, 'organization');
  const person = findPartyByKind(linkedParties, 'person');
  const event = findPartyByKind(linkedParties, 'event');
  const contactType = findValueByKind(values, 'contactType');
  const mailCampaign = findValueByKind(values, 'mailCampaign');
  const mailServer = findValueByKind(values, 'mailServer');
  const onBehalf = findValueByKind(values, 'onBehalf');
  const yearProspect = findValueByKind(values, 'yearProspect');

  return {
    _id: id,
    ...(input.contactLog.comment ? { comment: input.contactLog.comment } : {}),
    ...(contactType?.label ? { contactTypeLabel: contactType.label } : {}),
    ...(contactType?.valueId ? { contactTypeValueId: contactType.valueId } : {}),
    ...(input.contactLog.createdAt ? { createdAt: input.contactLog.createdAt } : {}),
    ...(input.contactLog.dateEntered ? { dateEntered: input.contactLog.dateEntered } : {}),
    ...(event ? { eventId: event.partyId } : {}),
    ...(event?.ownerName ? { eventName: event.ownerName } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    ...(input.contactLog.contactTypeUuid
      ? { legacyContactTypeUuid: input.contactLog.contactTypeUuid }
      : {}),
    ...(input.contactLog.legacyFilemakerId
      ? { legacyFilemakerId: input.contactLog.legacyFilemakerId }
      : {}),
    ...(input.contactLog.mailCampaignUuid
      ? { legacyMailCampaignUuid: input.contactLog.mailCampaignUuid }
      : {}),
    ...(input.contactLog.mailServerUuid
      ? { legacyMailServerUuid: input.contactLog.mailServerUuid }
      : {}),
    ...(input.contactLog.onBehalfUuid
      ? { legacyOnBehalfUuid: input.contactLog.onBehalfUuid }
      : {}),
    ...(input.contactLog.legacyOrganizationUuid
      ? { legacyOrganizationUuid: input.contactLog.legacyOrganizationUuid }
      : {}),
    legacyOwnerUuids: input.contactLog.legacyOwnerUuids,
    ...(input.contactLog.legacyParentUuid
      ? { legacyParentUuid: input.contactLog.legacyParentUuid }
      : {}),
    legacyUuid: input.contactLog.legacyUuid,
    legacyValueUuids: input.contactLog.values.map(
      (value: ParsedLegacyContactLogValue): string => value.legacyValueUuid
    ),
    ...(input.contactLog.yearProspectUuid
      ? { legacyYearProspectUuid: input.contactLog.yearProspectUuid }
      : {}),
    linkedParties,
    ...(mailCampaign?.label ? { mailCampaignLabel: mailCampaign.label } : {}),
    ...(mailCampaign?.valueId ? { mailCampaignValueId: mailCampaign.valueId } : {}),
    ...(mailServer?.label ? { mailServerLabel: mailServer.label } : {}),
    ...(mailServer?.valueId ? { mailServerValueId: mailServer.valueId } : {}),
    ...(onBehalf?.label ? { onBehalfLabel: onBehalf.label } : {}),
    ...(onBehalf?.valueId ? { onBehalfValueId: onBehalf.valueId } : {}),
    ...(organization ? { organizationId: organization.partyId } : {}),
    ...(organization?.ownerName ? { organizationName: organization.ownerName } : {}),
    ...(primaryParty?.ownerName ? { ownerName: primaryParty.ownerName } : {}),
    ...(primaryParty ? { partyId: primaryParty.partyId, partyKind: primaryParty.partyKind } : {}),
    ...(person ? { personId: person.partyId } : {}),
    ...(person?.ownerName ? { personName: person.ownerName } : {}),
    schemaVersion: 1,
    ...(input.contactLog.updatedAt ? { updatedAt: input.contactLog.updatedAt } : {}),
    ...(input.contactLog.updatedBy ? { updatedBy: input.contactLog.updatedBy } : {}),
    valueIds,
    values,
    ...(yearProspect?.label ? { yearProspectLabel: yearProspect.label } : {}),
    ...(yearProspect?.valueId ? { yearProspectValueId: yearProspect.valueId } : {}),
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

const ensureIndexes = async (collection: Collection<FilemakerContactLogMongoDocument>): Promise<void> => {
  await Promise.all([
    collection.createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_contact_logs_legacy_uuid_unique', unique: true }
    ),
    collection.createIndex({ legacyParentUuid: 1 }, { name: 'filemaker_contact_logs_parent_uuid' }),
    collection.createIndex(
      { legacyOwnerUuids: 1 },
      { name: 'filemaker_contact_logs_owner_uuids' }
    ),
    collection.createIndex(
      { partyKind: 1, partyId: 1 },
      {
        name: 'filemaker_contact_logs_party',
        partialFilterExpression: { partyId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { organizationId: 1 },
      {
        name: 'filemaker_contact_logs_organization_id',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { organizationId: 1, dateEntered: -1, _id: 1 },
      {
        name: 'filemaker_contact_logs_organization_date',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { personId: 1 },
      {
        name: 'filemaker_contact_logs_person_id',
        partialFilterExpression: { personId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { personId: 1, dateEntered: -1, _id: 1 },
      {
        name: 'filemaker_contact_logs_person_date',
        partialFilterExpression: { personId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { eventId: 1 },
      {
        name: 'filemaker_contact_logs_event_id',
        partialFilterExpression: { eventId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { eventId: 1, dateEntered: -1, _id: 1 },
      {
        name: 'filemaker_contact_logs_event_date',
        partialFilterExpression: { eventId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { partyKind: 1, partyId: 1, dateEntered: -1, _id: 1 },
      {
        name: 'filemaker_contact_logs_party_date',
        partialFilterExpression: { partyId: { $type: 'string' } },
      }
    ),
    collection.createIndex(
      { 'linkedParties.partyKind': 1, 'linkedParties.partyId': 1, dateEntered: -1 },
      { name: 'filemaker_contact_logs_linked_party_date' }
    ),
    collection.createIndex({ valueIds: 1 }, { name: 'filemaker_contact_logs_value_ids' }),
    collection.createIndex(
      { legacyValueUuids: 1 },
      { name: 'filemaker_contact_logs_legacy_value_uuids' }
    ),
    collection.createIndex({ dateEntered: -1 }, { name: 'filemaker_contact_logs_date_entered' }),
    collection.createIndex(
      {
        comment: 'text',
        contactTypeLabel: 'text',
        mailCampaignLabel: 'text',
        ownerName: 'text',
      },
      { name: 'filemaker_contact_logs_text' }
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

const runUpsertWriteBatch = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  documents: Array<TDocument & { _id: string }>
): Promise<WriteResultSummary> => {
  if (documents.length === 0) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  const result = await collection.bulkWrite(documents.map(toUpsertOperation), { ordered: false });
  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
};

const addWriteResult = (left: WriteResultSummary, right: WriteResultSummary): WriteResultSummary => ({
  matchedCount: left.matchedCount + right.matchedCount,
  modifiedCount: left.modifiedCount + right.modifiedCount,
  upsertedCount: left.upsertedCount + right.upsertedCount,
});

const createImportCounters = (): ImportCounters => ({
  ambiguousOwnerCount: 0,
  duplicateLegacyUuidCount: 0,
  importedDocumentCount: 0,
  parsedRowCount: 0,
  partyKindCounts: { event: 0, organization: 0, person: 0 },
  resolvedOwnerLinkCount: 0,
  resolvedValueUuidCount: 0,
  skippedRowCount: 0,
  totalLegacyValueUuidCount: 0,
  uniqueLegacyUuidCount: 0,
  unresolvedOwnerCount: 0,
});

const processRows = async (input: {
  batchSize: number;
  collection: Collection<FilemakerContactLogMongoDocument>;
  dryRun: boolean;
  importBatchId: string;
  importedAt: Date;
  inputPath: string;
  partyByLegacyUuid: Map<string, PartyLookupRecord[]>;
  valueByLegacyUuid: Map<string, ValueLookupRecord>;
}): Promise<{ counters: ImportCounters; header?: string[]; writeResult: WriteResultSummary }> => {
  const counters = createImportCounters();
  const seenLegacyUuids = new Set<string>();
  let batch: FilemakerContactLogMongoDocument[] = [];
  let writeResult: WriteResultSummary = { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  let writeChain = Promise.resolve();

  const flushBatch = (): Promise<void> => {
    if (batch.length === 0) return writeChain;
    const documents = batch;
    batch = [];
    if (input.dryRun) return writeChain;
    writeChain = writeChain.then(async (): Promise<void> => {
      writeResult = addWriteResult(
        writeResult,
        await runUpsertWriteBatch(input.collection, documents)
      );
    });
    return writeChain;
  };

  const processRow = (row: LegacyContactLogRow): Promise<void> | void => {
    counters.parsedRowCount += 1;
    const contactLog = parseContactLogFromRow(row);
    if (contactLog === null) {
      counters.skippedRowCount += 1;
      return undefined;
    }
    if (seenLegacyUuids.has(contactLog.legacyUuid)) counters.duplicateLegacyUuidCount += 1;
    seenLegacyUuids.add(contactLog.legacyUuid);
    const document = toContactLogDocument({
      contactLog,
      importBatchId: input.importBatchId,
      importedAt: input.importedAt,
      partyByLegacyUuid: input.partyByLegacyUuid,
      valueByLegacyUuid: input.valueByLegacyUuid,
    });
    counters.importedDocumentCount += 1;
    counters.totalLegacyValueUuidCount += document.legacyValueUuids.length;
    counters.resolvedValueUuidCount += document.valueIds.length;
    if (document.linkedParties.length === 0) {
      counters.unresolvedOwnerCount += 1;
    } else {
      counters.resolvedOwnerLinkCount += 1;
      if (document.linkedParties.length > 1) counters.ambiguousOwnerCount += 1;
      document.linkedParties.forEach((party: ContactLogPartyMongoDocument): void => {
        counters.partyKindCounts[party.partyKind] += 1;
      });
    }
    batch.push(document);
    if (batch.length >= input.batchSize) return flushBatch();
    return undefined;
  };

  let header: string[] | undefined;
  if (isWorkbookInputPath(input.inputPath)) {
    const streamResult = await streamFilemakerLegacyContactLogWorkbookRows(
      input.inputPath,
      processRow
    );
    header = streamResult.header;
  } else {
    const rows = parseFilemakerLegacyContactLogRows(await readFile(input.inputPath, 'utf8'));
    rows.forEach((row: LegacyContactLogRow): void => {
      void processRow(row);
    });
  }

  await flushBatch();
  await writeChain;
  counters.uniqueLegacyUuidCount = seenLegacyUuids.size;
  return { counters, header, writeResult };
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
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerContactLogMongoDocument>(CONTACT_LOGS_COLLECTION);
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(collection)
        : false;
    const [partyByLegacyUuid, valueByLegacyUuid] = await Promise.all([
      buildPartyMap(db),
      buildValueMap(db),
    ]);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const result = await processRows({
      batchSize: options.batchSize,
      collection,
      dryRun: options.dryRun,
      importBatchId,
      importedAt,
      inputPath: options.inputPath,
      partyByLegacyUuid,
      valueByLegacyUuid,
    });
    if (!options.dryRun) await ensureIndexes(collection);

    console.log(
      JSON.stringify(
        {
          ambiguousOwnerCount: result.counters.ambiguousOwnerCount,
          duplicateLegacyUuidCount: result.counters.duplicateLegacyUuidCount,
          header: result.header ?? null,
          importBatchId: options.dryRun ? null : importBatchId,
          importedDocumentCount: result.counters.importedDocumentCount,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          parsedRowCount: result.counters.parsedRowCount,
          partyKindCounts: result.counters.partyKindCounts,
          partyLookupCount: partyByLegacyUuid.size,
          replacedCollection,
          resolvedOwnerLinkCount: result.counters.resolvedOwnerLinkCount,
          resolvedValueUuidCount: result.counters.resolvedValueUuidCount,
          skippedRowCount: result.counters.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          totalLegacyValueUuidCount: result.counters.totalLegacyValueUuidCount,
          uniqueLegacyUuidCount: result.counters.uniqueLegacyUuidCount,
          unresolvedOwnerCount: result.counters.unresolvedOwnerCount,
          unresolvedValueUuidCount:
            result.counters.totalLegacyValueUuidCount - result.counters.resolvedValueUuidCount,
          valueLookupCount: valueByLegacyUuid.size,
          writeResult: result.writeResult,
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
