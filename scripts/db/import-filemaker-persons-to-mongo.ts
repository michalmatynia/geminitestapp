import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document, WithId } from 'mongodb';

import {
  parseFilemakerLegacyPersonRows,
  parseFilemakerLegacyPersonWorkbookRows,
  parsePersonFromRow,
  type LegacyPersonRow,
  type ParsedLegacyPerson,
} from '@/features/filemaker/filemaker-persons-import.parser';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const PERSONS_COLLECTION = 'filemaker_persons';
const PERSON_ORGANIZATION_LINKS_COLLECTION = 'filemaker_person_organization_links';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const DEFAULT_BATCH_SIZE = 1_000;
const IMPORT_SOURCE_KIND = 'filemaker.person';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type ExistingPersonRecord = {
  createdAt?: string;
  id: string;
};

type OrganizationLookupRecord = {
  id: string;
  legacyUuid: string;
  name?: string;
};

type FilemakerPersonMongoDocument = Document & {
  _id: string;
  checked1?: boolean;
  checked2?: boolean;
  createdAt?: string;
  dateOfBirth?: string;
  firstName: string;
  fullName: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  lastName: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyOrganizationUuids: string[];
  legacyParentUuid?: string;
  legacyUuid: string;
  mongoCreatedAt?: Date;
  mongoUpdatedAt?: Date;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
};

type FilemakerPersonOrganizationLinkMongoDocument = Document & {
  _id: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyOrganizationUuid: string;
  legacyPersonUuid: string;
  organizationId?: string;
  organizationName?: string;
  personId: string;
  personName: string;
  schemaVersion: 1;
};

type CollectedPersons = {
  duplicateLegacyUuidCount: number;
  persons: Map<string, ParsedLegacyPerson>;
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-persons-to-mongo.ts --input=csv/persons.tab --write',
      '',
      'Imports FileMaker person XLSX exports and headerless TAB/CSV exports into filemaker_persons.',
      'key_org.PORTALFILTER is normalized into filemaker_person_organization_links.',
      'Person UUID is retained as legacyUuid and each person receives a deterministic modern id.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild the person collections.',
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
    replaceCollections: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollections = true;
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

const createModernId = (kind: 'person' | 'person-organization-link', key: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const isWorkbookInputPath = (inputPath: string): boolean => /\.(xlsx|xls)$/i.test(inputPath);

const readLegacyPersonRows = async (inputPath: string): Promise<LegacyPersonRow[]> => {
  if (isWorkbookInputPath(inputPath)) {
    return parseFilemakerLegacyPersonWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyPersonRows(await readFile(inputPath, 'utf8'));
};

const collectPersons = (rows: LegacyPersonRow[]): CollectedPersons => {
  const persons = new Map<string, ParsedLegacyPerson>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyPersonRow): void => {
    const person = parsePersonFromRow(row);
    if (person === null) {
      skippedRowCount += 1;
      return;
    }
    if (persons.has(person.legacyUuid)) duplicateLegacyUuidCount += 1;
    persons.set(person.legacyUuid, person);
  });

  return { duplicateLegacyUuidCount, persons, skippedRowCount };
};

const buildExistingPersonMap = async (
  collection: Collection<FilemakerPersonMongoDocument>
): Promise<Map<string, ExistingPersonRecord>> => {
  const documents = await collection
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { _id: 0, id: 1, legacyUuid: 1, createdAt: 1 } }
    )
    .toArray();
  return new Map(
    documents
      .map((document: WithId<FilemakerPersonMongoDocument>): [string, ExistingPersonRecord] | null => {
        if (!document.legacyUuid || !document.id) return null;
        return [
          document.legacyUuid,
          {
            createdAt: document.createdAt,
            id: document.id,
          },
        ];
      })
      .filter((entry): entry is [string, ExistingPersonRecord] => entry !== null)
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

const buildModernPersonIdMap = (
  persons: Map<string, ParsedLegacyPerson>,
  existingByLegacyUuid: Map<string, ExistingPersonRecord>
): Map<string, string> => {
  const idByLegacyUuid = new Map<string, string>();
  persons.forEach((person: ParsedLegacyPerson): void => {
    const existingId = existingByLegacyUuid.get(person.legacyUuid)?.id;
    idByLegacyUuid.set(person.legacyUuid, existingId ?? createModernId('person', person.legacyUuid));
  });
  return idByLegacyUuid;
};

const toPersonDocument = (input: {
  existing: ExistingPersonRecord | undefined;
  id: string;
  importBatchId: string;
  importedAt: Date;
  person: ParsedLegacyPerson;
}): FilemakerPersonMongoDocument => ({
  _id: input.id,
  ...(input.person.checked1 !== undefined ? { checked1: input.person.checked1 } : {}),
  ...(input.person.checked2 !== undefined ? { checked2: input.person.checked2 } : {}),
  ...(input.person.createdAt || input.existing?.createdAt
    ? { createdAt: input.person.createdAt ?? input.existing?.createdAt }
    : {}),
  ...(input.person.dateOfBirth ? { dateOfBirth: input.person.dateOfBirth } : {}),
  firstName: input.person.firstName,
  fullName: input.person.fullName,
  id: input.id,
  importBatchId: input.importBatchId,
  importedAt: input.importedAt,
  importSourceKind: IMPORT_SOURCE_KIND,
  lastName: input.person.lastName,
  ...(input.person.legacyDefaultAddressUuid
    ? { legacyDefaultAddressUuid: input.person.legacyDefaultAddressUuid }
    : {}),
  ...(input.person.legacyDefaultBankAccountUuid
    ? { legacyDefaultBankAccountUuid: input.person.legacyDefaultBankAccountUuid }
    : {}),
  ...(input.person.legacyDisplayAddressUuid
    ? { legacyDisplayAddressUuid: input.person.legacyDisplayAddressUuid }
    : {}),
  ...(input.person.legacyDisplayBankAccountUuid
    ? { legacyDisplayBankAccountUuid: input.person.legacyDisplayBankAccountUuid }
    : {}),
  legacyOrganizationUuids: input.person.legacyOrganizationUuids,
  ...(input.person.legacyParentUuid ? { legacyParentUuid: input.person.legacyParentUuid } : {}),
  legacyUuid: input.person.legacyUuid,
  schemaVersion: 1,
  ...(input.person.updatedAt ? { updatedAt: input.person.updatedAt } : {}),
  ...(input.person.updatedBy ? { updatedBy: input.person.updatedBy } : {}),
});

const toPersonOrganizationLinkDocuments = (input: {
  idByLegacyPersonUuid: Map<string, string>;
  importBatchId: string;
  importedAt: Date;
  organizationByLegacyUuid: Map<string, OrganizationLookupRecord>;
  persons: Map<string, ParsedLegacyPerson>;
}): FilemakerPersonOrganizationLinkMongoDocument[] => {
  const documents = new Map<string, FilemakerPersonOrganizationLinkMongoDocument>();
  input.persons.forEach((person: ParsedLegacyPerson): void => {
    const personId = input.idByLegacyPersonUuid.get(person.legacyUuid);
    if (personId === undefined) return;
    person.legacyOrganizationUuids.forEach((legacyOrganizationUuid: string): void => {
      const organization = input.organizationByLegacyUuid.get(legacyOrganizationUuid);
      const id = createModernId(
        'person-organization-link',
        `${person.legacyUuid}:${legacyOrganizationUuid}`
      );
      documents.set(id, {
        _id: id,
        id,
        importBatchId: input.importBatchId,
        importedAt: input.importedAt,
        importSourceKind: IMPORT_SOURCE_KIND,
        legacyOrganizationUuid,
        legacyPersonUuid: person.legacyUuid,
        ...(organization
          ? { organizationId: organization.id, organizationName: organization.name }
          : {}),
        personId,
        personName: person.fullName,
        schemaVersion: 1,
      });
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
    db.collection(PERSONS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      {
        name: 'filemaker_persons_legacy_uuid_unique',
        partialFilterExpression: { legacyUuid: { $type: 'string' } },
        unique: true,
      }
    ),
    db.collection(PERSONS_COLLECTION).createIndex(
      { lastName: 1, firstName: 1 },
      { name: 'filemaker_persons_name' }
    ),
    db.collection(PERSONS_COLLECTION).createIndex(
      { legacyOrganizationUuids: 1 },
      { name: 'filemaker_persons_legacy_organization_uuids' }
    ),
    db.collection(PERSON_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { personId: 1 },
      { name: 'filemaker_person_organization_links_person_id' }
    ),
    db.collection(PERSON_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { organizationId: 1 },
      {
        name: 'filemaker_person_organization_links_organization_id',
        partialFilterExpression: { organizationId: { $type: 'string' } },
      }
    ),
    db.collection(PERSON_ORGANIZATION_LINKS_COLLECTION).createIndex(
      { legacyPersonUuid: 1, legacyOrganizationUuid: 1 },
      { name: 'filemaker_person_organization_links_legacy_pair' }
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

  const parsedRows = await readLegacyPersonRows(options.inputPath);
  const collected = collectPersons(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const personsCollection = db.collection<FilemakerPersonMongoDocument>(PERSONS_COLLECTION);
    const linksCollection = db.collection<FilemakerPersonOrganizationLinkMongoDocument>(
      PERSON_ORGANIZATION_LINKS_COLLECTION
    );
    const replacedCollections =
      !options.dryRun && options.replaceCollections
        ? {
            links: await dropCollectionIfExists(linksCollection),
            persons: await dropCollectionIfExists(personsCollection),
          }
        : { links: false, persons: false };
    if (!options.dryRun && !options.replaceCollections) await ensureIndexes(db);

    const existingByLegacyUuid = await buildExistingPersonMap(personsCollection);
    const idByLegacyPersonUuid = buildModernPersonIdMap(collected.persons, existingByLegacyUuid);
    const organizationByLegacyUuid = await buildOrganizationMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const personDocuments = Array.from(collected.persons.values()).map(
      (person: ParsedLegacyPerson): FilemakerPersonMongoDocument =>
        toPersonDocument({
          existing: existingByLegacyUuid.get(person.legacyUuid),
          id: idByLegacyPersonUuid.get(person.legacyUuid) ?? createModernId('person', person.legacyUuid),
          importBatchId,
          importedAt,
          person,
        })
    );
    const linkDocuments = toPersonOrganizationLinkDocuments({
      idByLegacyPersonUuid,
      importBatchId,
      importedAt,
      organizationByLegacyUuid,
      persons: collected.persons,
    });
    const personWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollections
        ? await runInsertWrites(personsCollection, personDocuments, options.batchSize)
        : await runUpsertWrites(personsCollection, personDocuments, options.batchSize);
    const linkWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollections
        ? await runInsertWrites(linksCollection, linkDocuments, options.batchSize)
        : await runUpsertWrites(linksCollection, linkDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    console.log(
      JSON.stringify(
        {
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          existingLegacyUuidCount: existingByLegacyUuid.size,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          linkWrite,
          mode: options.dryRun ? 'dry-run' : 'write',
          organizationLookupCount: organizationByLegacyUuid.size,
          parsedRowCount: parsedRows.length,
          personWrite,
          replacedCollections,
          resolvedOrganizationLinkCount: linkDocuments.filter(
            (link: FilemakerPersonOrganizationLinkMongoDocument): boolean =>
              typeof link.organizationId === 'string'
          ).length,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniquePersonCount: collected.persons.size,
          uniquePersonOrganizationLinkCount: linkDocuments.length,
          unresolvedOrganizationLinkCount: linkDocuments.filter(
            (link: FilemakerPersonOrganizationLinkMongoDocument): boolean =>
              typeof link.organizationId !== 'string'
          ).length,
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
