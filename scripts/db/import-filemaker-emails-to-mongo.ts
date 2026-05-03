import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Document } from 'mongodb';

import {
  parseEmailOrganizationJoinFromRow,
  parseFilemakerLegacyEmailOrganizationJoinRows,
  type LegacyEmailOrganizationJoinRow,
  type ParsedLegacyEmailOrganizationJoin,
} from '@/features/filemaker/filemaker-email-organization-joins-import.parser';
import {
  parseEmailFromRow,
  parseFilemakerLegacyEmailRows,
  parseFilemakerLegacyEmailWorkbookRows,
  type LegacyEmailRow,
  type ParsedLegacyEmail,
} from '@/features/filemaker/filemaker-emails-import.parser';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const DEFAULT_BATCH_SIZE = 1_000;
const FILEMAKER_ORGANIZATIONS_COLLECTION = 'filemaker_organizations';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string | null;
  joinInputPath: string | null;
  replaceCollections: boolean;
  source: MongoSource | undefined;
};

type OrganizationLookupRecord = {
  id: string;
  legacyUuid: string;
};

type CollectedEmails = {
  duplicateLegacyUuidCount: number;
  emailsByValue: Map<string, ParsedLegacyEmail[]>;
  skippedRowCount: number;
};

type CollectedEmailOrganizationJoins = {
  joins: ParsedLegacyEmailOrganizationJoin[];
  skippedRowCount: number;
};

type EmailWriteResult = {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

type MongoEmailDocument = Document & {
  _id: string;
  createdAt?: string;
  domainCountry?: string;
  email: string;
  id: string;
  importBatchId?: string;
  importedAt?: Date;
  legacyStatusRaw?: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
  legacyUuids: string[];
  schemaVersion: 1;
  status: 'active' | 'inactive' | 'bounced' | 'unverified';
  updatedAt?: string;
  updatedBy?: string;
};

type MongoEmailLinkDocument = Document & {
  _id: string;
  createdAt?: string;
  emailId: string;
  id: string;
  importBatchId?: string;
  importedAt?: Date;
  legacyEmailAddress?: string;
  legacyEmailUuid?: string;
  legacyJoinUuid?: string;
  legacyJoinUuids?: string[];
  legacyOrganizationName?: string;
  legacyOrganizationUuid?: string;
  legacyStatusUuid?: string;
  legacyStatusUuids?: string[];
  organizationId?: string;
  partyId?: string;
  partyKind: 'organization';
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-emails-to-mongo.ts --input=/path/emails.csv --write',
      '',
      'Imports FileMaker email CSV/TSV/XLSX exports into filemaker_emails and filemaker_email_links.',
      'Pass --join-input=/path/joinORGtoEMAIL.tab to import organisation-email links.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild the email collections.',
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
    if (!arg.startsWith('--') && options.inputPath === null) {
      options.inputPath = arg.trim() || null;
    }
  });

  return options;
};

const createModernId = (kind: 'email' | 'email-link', key: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-${kind}-${digest}`;
};

const collectEmails = (rows: LegacyEmailRow[]): CollectedEmails => {
  const emailsByValue = new Map<string, ParsedLegacyEmail[]>();
  const seenLegacyUuids = new Set<string>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((row: LegacyEmailRow): void => {
    const email = parseEmailFromRow(row);
    if (email === null) {
      skippedRowCount += 1;
      return;
    }
    if (email.legacyUuid !== undefined) {
      if (seenLegacyUuids.has(email.legacyUuid)) duplicateLegacyUuidCount += 1;
      seenLegacyUuids.add(email.legacyUuid);
    }
    emailsByValue.set(email.email, [...(emailsByValue.get(email.email) ?? []), email]);
  });

  return { duplicateLegacyUuidCount, emailsByValue, skippedRowCount };
};

const collectEmailOrganizationJoins = (
  rows: LegacyEmailOrganizationJoinRow[]
): CollectedEmailOrganizationJoins => {
  const joins: ParsedLegacyEmailOrganizationJoin[] = [];
  let skippedRowCount = 0;

  rows.forEach((row: LegacyEmailOrganizationJoinRow): void => {
    const join = parseEmailOrganizationJoinFromRow(row);
    if (join === null) {
      skippedRowCount += 1;
      return;
    }
    joins.push(join);
  });

  return { joins, skippedRowCount };
};

const uniqueDefined = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => value !== undefined)));

const firstDefined = (values: Array<string | undefined>): string | undefined =>
  values.find((value: string | undefined): value is string => value !== undefined);

const latestIso = (values: Array<string | undefined>): string | undefined =>
  uniqueDefined(values).sort().at(-1);

const earliestIso = (values: Array<string | undefined>): string | undefined =>
  uniqueDefined(values).sort()[0];

const chooseStatus = (
  records: ParsedLegacyEmail[]
): 'active' | 'inactive' | 'bounced' | 'unverified' =>
  records.find((record: ParsedLegacyEmail): boolean => record.status !== 'unverified')?.status ??
  'unverified';

const buildEmailDocuments = (input: {
  collected: CollectedEmails;
  importBatchId: string;
  importedAt: Date;
}): MongoEmailDocument[] =>
  Array.from(input.collected.emailsByValue.entries()).map(
    ([email, records]: [string, ParsedLegacyEmail[]]): MongoEmailDocument => {
      const id = createModernId('email', email);
      const legacyUuids = uniqueDefined(records.map((record) => record.legacyUuid));
      return {
        _id: id,
        createdAt: earliestIso(records.map((record) => record.createdAt)),
        domainCountry: firstDefined(records.map((record) => record.domainCountry)),
        email,
        id,
        importBatchId: input.importBatchId,
        importedAt: input.importedAt,
        legacyStatusRaw: firstDefined(records.map((record) => record.legacyStatusRaw)),
        legacyStatusUuid: firstDefined(records.map((record) => record.legacyStatusUuid)),
        legacyUuid: legacyUuids[0],
        legacyUuids,
        schemaVersion: 1,
        status: chooseStatus(records),
        updatedAt: latestIso(records.map((record) => record.updatedAt)),
        updatedBy: firstDefined(records.map((record) => record.updatedBy)),
      };
    }
  );

const buildOrganizationMap = async (
  collection: Collection<Document>
): Promise<Map<string, OrganizationLookupRecord>> => {
  const documents = await collection
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { _id: 0, id: 1, legacyUuid: 1 } }
    )
    .toArray();
  return new Map(
    documents
      .map((document: Document): [string, OrganizationLookupRecord] | null => {
        const legacyUuid = typeof document['legacyUuid'] === 'string' ? document['legacyUuid'] : '';
        const id = typeof document['id'] === 'string' ? document['id'] : '';
        return legacyUuid && id ? [legacyUuid, { id, legacyUuid }] : null;
      })
      .filter((entry): entry is [string, OrganizationLookupRecord] => entry !== null)
  );
};

const buildEmailIdByLegacyUuid = (collected: CollectedEmails): Map<string, string> => {
  const emailIdByLegacyUuid = new Map<string, string>();
  collected.emailsByValue.forEach((records: ParsedLegacyEmail[], email: string): void => {
    const emailId = createModernId('email', email);
    records.forEach((record: ParsedLegacyEmail): void => {
      if (record.legacyUuid === undefined || emailIdByLegacyUuid.has(record.legacyUuid)) return;
      emailIdByLegacyUuid.set(record.legacyUuid, emailId);
    });
  });
  return emailIdByLegacyUuid;
};

const buildEmailLinkDocument = (input: {
  emailId: string;
  importBatchId: string;
  importedAt: Date;
  organizationId: string;
  record: ParsedLegacyEmail;
}): MongoEmailLinkDocument => {
  const id = createModernId('email-link', `${input.emailId}:organization:${input.organizationId}`);
  return {
    _id: id,
    createdAt: input.record.createdAt,
    emailId: input.emailId,
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    legacyEmailUuid: input.record.legacyUuid,
    legacyOrganizationName: input.record.legacyOrganizationName,
    legacyOrganizationUuid: input.record.legacyOrganizationUuid,
    organizationId: input.organizationId,
    partyId: input.organizationId,
    partyKind: 'organization',
    schemaVersion: 1,
    updatedAt: input.record.updatedAt,
  };
};

const buildEmailLinkDocumentFromJoin = (input: {
  emailId: string;
  importBatchId: string;
  importedAt: Date;
  join: ParsedLegacyEmailOrganizationJoin;
  organizationId: string;
}): MongoEmailLinkDocument => {
  const id = createModernId('email-link', `${input.emailId}:organization:${input.organizationId}`);
  return {
    _id: id,
    createdAt: input.join.createdAt,
    emailId: input.emailId,
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    legacyEmailAddress: input.join.legacyEmailAddress,
    legacyEmailUuid: input.join.legacyEmailUuid,
    legacyJoinUuid: input.join.legacyJoinUuid,
    legacyJoinUuids: uniqueDefined([input.join.legacyJoinUuid]),
    legacyOrganizationName: input.join.legacyOrganizationName,
    legacyOrganizationUuid: input.join.legacyOrganizationUuid,
    legacyStatusUuid: input.join.legacyStatusUuid,
    legacyStatusUuids: uniqueDefined([input.join.legacyStatusUuid]),
    organizationId: input.organizationId,
    partyId: input.organizationId,
    partyKind: 'organization',
    schemaVersion: 1,
    updatedAt: input.join.updatedAt,
    updatedBy: input.join.updatedBy,
  };
};

const mergeEmailLinkDocuments = (
  existing: MongoEmailLinkDocument,
  incoming: MongoEmailLinkDocument
): MongoEmailLinkDocument => ({
  ...existing,
  createdAt: earliestIso([existing.createdAt, incoming.createdAt]),
  legacyEmailAddress: existing.legacyEmailAddress ?? incoming.legacyEmailAddress,
  legacyEmailUuid: existing.legacyEmailUuid ?? incoming.legacyEmailUuid,
  legacyJoinUuid: existing.legacyJoinUuid ?? incoming.legacyJoinUuid,
  legacyJoinUuids: uniqueDefined([
    ...(existing.legacyJoinUuids ?? []),
    ...(incoming.legacyJoinUuids ?? []),
    existing.legacyJoinUuid,
    incoming.legacyJoinUuid,
  ]),
  legacyOrganizationName: existing.legacyOrganizationName ?? incoming.legacyOrganizationName,
  legacyStatusUuid: existing.legacyStatusUuid ?? incoming.legacyStatusUuid,
  legacyStatusUuids: uniqueDefined([
    ...(existing.legacyStatusUuids ?? []),
    ...(incoming.legacyStatusUuids ?? []),
    existing.legacyStatusUuid,
    incoming.legacyStatusUuid,
  ]),
  updatedAt: latestIso([existing.updatedAt, incoming.updatedAt]),
  updatedBy: existing.updatedBy ?? incoming.updatedBy,
});

const buildEmailLinkDocuments = (input: {
  collected: CollectedEmails;
  importBatchId: string;
  importedAt: Date;
  organizationByLegacyUuid: Map<string, OrganizationLookupRecord>;
}): { documents: MongoEmailLinkDocument[]; unresolvedCount: number } => {
  const documentsById = new Map<string, MongoEmailLinkDocument>();
  let unresolvedCount = 0;
  input.collected.emailsByValue.forEach((records: ParsedLegacyEmail[], email: string): void => {
    const emailId = createModernId('email', email);
    records.forEach((record: ParsedLegacyEmail): void => {
      const legacyOrganizationUuid = record.legacyOrganizationUuid;
      if (legacyOrganizationUuid === undefined) return;
      const organization = input.organizationByLegacyUuid.get(legacyOrganizationUuid);
      if (organization === undefined) {
        unresolvedCount += 1;
        return;
      }
      const document = buildEmailLinkDocument({
        emailId,
        importBatchId: input.importBatchId,
        importedAt: input.importedAt,
        organizationId: organization.id,
        record,
      });
      documentsById.set(document.id, document);
    });
  });
  return { documents: Array.from(documentsById.values()), unresolvedCount };
};

const buildEmailLinkDocumentsFromJoins = (input: {
  emailIdByLegacyUuid: Map<string, string>;
  importBatchId: string;
  importedAt: Date;
  joins: ParsedLegacyEmailOrganizationJoin[];
  organizationByLegacyUuid: Map<string, OrganizationLookupRecord>;
}): {
  documents: MongoEmailLinkDocument[];
  duplicateLegacyJoinUuidCount: number;
  duplicateNormalizedLinkCount: number;
  unresolvedEmailCount: number;
  unresolvedOrganizationCount: number;
} => {
  const documentsById = new Map<string, MongoEmailLinkDocument>();
  const seenLegacyJoinUuids = new Set<string>();
  let duplicateLegacyJoinUuidCount = 0;
  let duplicateNormalizedLinkCount = 0;
  let unresolvedEmailCount = 0;
  let unresolvedOrganizationCount = 0;

  input.joins.forEach((join: ParsedLegacyEmailOrganizationJoin): void => {
    if (join.legacyJoinUuid !== undefined) {
      if (seenLegacyJoinUuids.has(join.legacyJoinUuid)) duplicateLegacyJoinUuidCount += 1;
      seenLegacyJoinUuids.add(join.legacyJoinUuid);
    }
    const emailId = input.emailIdByLegacyUuid.get(join.legacyEmailUuid);
    if (emailId === undefined) {
      unresolvedEmailCount += 1;
      return;
    }
    const organization = input.organizationByLegacyUuid.get(join.legacyOrganizationUuid);
    if (organization === undefined) {
      unresolvedOrganizationCount += 1;
      return;
    }
    const document = buildEmailLinkDocumentFromJoin({
      emailId,
      importBatchId: input.importBatchId,
      importedAt: input.importedAt,
      join,
      organizationId: organization.id,
    });
    const existing = documentsById.get(document.id);
    if (existing !== undefined) {
      duplicateNormalizedLinkCount += 1;
      documentsById.set(document.id, mergeEmailLinkDocuments(existing, document));
      return;
    }
    documentsById.set(document.id, document);
  });

  return {
    documents: Array.from(documentsById.values()),
    duplicateLegacyJoinUuidCount,
    duplicateNormalizedLinkCount,
    unresolvedEmailCount,
    unresolvedOrganizationCount,
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
): Promise<EmailWriteResult> => {
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

const readLegacyEmailRows = async (inputPath: string): Promise<LegacyEmailRow[]> => {
  const extension = extname(inputPath).toLowerCase();
  if (extension === '.xlsx' || extension === '.xls') {
    return parseFilemakerLegacyEmailWorkbookRows(await readFile(inputPath));
  }
  return parseFilemakerLegacyEmailRows(await readFile(inputPath, 'utf8'));
};

const readLegacyEmailOrganizationJoinRows = async (
  inputPath: string
): Promise<LegacyEmailOrganizationJoinRow[]> =>
  parseFilemakerLegacyEmailOrganizationJoinRows(await readFile(inputPath, 'utf8'));

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const rows = await readLegacyEmailRows(options.inputPath);
  const collected = collectEmails(rows);
  const joinRows =
    options.joinInputPath === null
      ? []
      : await readLegacyEmailOrganizationJoinRows(options.joinInputPath);
  const collectedJoins = collectEmailOrganizationJoins(joinRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const {
    ensureMongoFilemakerEmailIndexes,
    FILEMAKER_EMAIL_LINKS_COLLECTION,
    FILEMAKER_EMAILS_COLLECTION,
  } = await import('@/features/filemaker/server/filemaker-email-repository');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const emails = db.collection<MongoEmailDocument>(FILEMAKER_EMAILS_COLLECTION);
    const links = db.collection<MongoEmailLinkDocument>(FILEMAKER_EMAIL_LINKS_COLLECTION);
    const organizations = db.collection(FILEMAKER_ORGANIZATIONS_COLLECTION);
    const replacedCollections =
      !options.dryRun && options.replaceCollections
        ? {
            emails: await dropCollectionIfExists(emails),
            links: await dropCollectionIfExists(links),
          }
        : { emails: false, links: false };
    const organizationByLegacyUuid = await buildOrganizationMap(organizations);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const emailDocuments = buildEmailDocuments({ collected, importBatchId, importedAt });
    const fallbackLinkBuild = buildEmailLinkDocuments({
      collected,
      importBatchId,
      importedAt,
      organizationByLegacyUuid,
    });
    const joinLinkBuild =
      collectedJoins.joins.length > 0
        ? buildEmailLinkDocumentsFromJoins({
            emailIdByLegacyUuid: buildEmailIdByLegacyUuid(collected),
            importBatchId,
            importedAt,
            joins: collectedJoins.joins,
            organizationByLegacyUuid,
          })
        : null;
    const linkDocuments = joinLinkBuild?.documents ?? fallbackLinkBuild.documents;
    const emailWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runUpsertWrites(emails, emailDocuments, options.batchSize);
    const linkWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : await runUpsertWrites(links, linkDocuments, options.batchSize);
    if (!options.dryRun) {
      await ensureMongoFilemakerEmailIndexes({ emails, links });
    }

    console.log(
      JSON.stringify(
        {
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          duplicateLegacyJoinUuidCount: joinLinkBuild?.duplicateLegacyJoinUuidCount ?? 0,
          duplicateNormalizedLinkCount: joinLinkBuild?.duplicateNormalizedLinkCount ?? 0,
          emailWrite,
          importBatchId: options.dryRun ? null : importBatchId,
          inputPath: options.inputPath,
          joinInputPath: options.joinInputPath,
          linkWrite,
          mode: options.dryRun ? 'dry-run' : 'write',
          parsedJoinRowCount: joinRows.length,
          organizationLookupCount: organizationByLegacyUuid.size,
          parsedRowCount: rows.length,
          replacedCollections,
          resolvedOrganizationLinkCount: linkDocuments.length,
          skippedJoinRowCount: collectedJoins.skippedRowCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          uniqueEmailCount: emailDocuments.length,
          unresolvedEmailJoinCount: joinLinkBuild?.unresolvedEmailCount ?? 0,
          unresolvedOrganizationLinkCount:
            joinLinkBuild?.unresolvedOrganizationCount ?? fallbackLinkBuild.unresolvedCount,
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
