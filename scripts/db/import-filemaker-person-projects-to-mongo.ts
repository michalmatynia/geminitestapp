import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Db, Document } from 'mongodb';
import { read, utils as xlsxUtils } from 'xlsx';

import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { parseFilemakerDatabase } from '@/features/filemaker/settings/database-getters';
import type { FilemakerValue } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { decodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const DEFAULT_BATCH_SIZE = 5_000;
const DEFAULT_INPUT = 'csv/b/x/projectDisplay.xlsx';
const IMPORT_SOURCE_KIND = 'filemaker.person_project';
const PERSON_PROJECTS_COLLECTION = 'filemaker_person_projects';
const PERSONS_COLLECTION = 'filemaker_persons';
const SETTINGS_COLLECTION = 'settings';
const VALUES_COLLECTION = 'filemaker_values';

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  inputPath: string;
  replaceCollection: boolean;
  source: MongoSource | undefined;
};

type ParsedProjectDisplayRow = {
  createdAt?: string;
  createdBy?: string;
  legacyPersonUuid: string;
  legacyProjectUuid?: string;
  legacyUuid: string;
  rowIndex: number;
  updatedAt?: string;
  updatedBy?: string;
};

type PersonLookupRecord = {
  id: string;
  legacyUuid: string;
  name?: string;
};

type ValueLookupRecord = {
  id: string;
  label: string;
  legacyUuid: string;
  parentId?: string | null;
};

type ValueCatalogDocument = Document & {
  id?: unknown;
  label?: unknown;
  legacyUuid?: unknown;
  parentId?: unknown;
};

type FilemakerPersonProjectMongoDocument = Document & {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  importBatchId: string;
  importedAt: Date;
  importSourceKind: string;
  legacyPersonUuid: string;
  legacyProjectUuid?: string;
  legacyUuid: string;
  personId?: string;
  personName?: string;
  projectName?: string;
  projectParentId?: string | null;
  projectValueId?: string;
  rowIndex: number;
  schemaVersion: 1;
  updatedAt?: string;
  updatedBy?: string;
};

type CollectedProjectRows = {
  duplicateLegacyUuidCount: number;
  projects: Map<string, ParsedProjectDisplayRow>;
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
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/import-filemaker-person-projects-to-mongo.ts --input=csv/b/x/projectDisplay.xlsx --source=local --write',
      '',
      `Imports FileMaker projectDisplay XLSX/CSV/TSV exports into ${PERSON_PROJECTS_COLLECTION}.`,
      'UUID_Related is resolved against imported persons in filemaker_persons.',
      'option1 is retained as legacyProjectUuid and linked to filemaker_values when present.',
      'By default the script performs a dry run. Pass --write to upsert records.',
      'Pass --replace with --write to drop and rebuild only the person project collection.',
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
    inputPath: DEFAULT_INPUT,
    replaceCollection: false,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--replace') options.replaceCollection = true;
    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length).trim() || DEFAULT_INPUT;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
    if (!arg.startsWith('--')) options.inputPath = arg.trim() || DEFAULT_INPUT;
  });

  return options;
};

const createModernId = (legacyUuid: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.person_project:${legacyUuid}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-person-project-${digest}`;
};

const normalizeCell = (value: unknown): string => {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'undefined' || value === null) return '';
  return String(value).replace(/\r/g, '').trim();
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeCell(value);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeLegacyUuid = (value: unknown): string => optionalString(value)?.toUpperCase() ?? '';

const isWorkbookInputPath = (inputPath: string): boolean =>
  ['.xlsx', '.xls'].includes(extname(inputPath).toLowerCase());

const parseRows = (buffer: Buffer, inputPath: string): string[][] => {
  if (isWorkbookInputPath(inputPath)) {
    const workbook = read(buffer);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      header: 1,
      raw: false,
    }).map((row: unknown[]): string[] =>
      row.map((cell: unknown) => normalizeCell(cell))
    );
  }

  const text = buffer.toString('utf8');
  return text
    .split('\n')
    .map((line: string): string[] => normalizeCell(line.replace(/\u0000/g, '')).split('\t'));
};

const buildHeaderMap = (headerRow: string[]): Map<string, number> =>
  new Map(headerRow.map((header, index) => [header.trim(), index]));

const readProjectDisplayRows = async (inputPath: string): Promise<ParsedProjectDisplayRow[]> => {
  const rows = parseRows(await readFile(inputPath), inputPath);
  if (rows.length === 0) return [];

  const header = buildHeaderMap(rows[0] ?? []);
  const idx = {
    createdAt: header.get('creationTimestamp'),
    createdBy: header.get('creationAccountName'),
    legacyPersonUuid: header.get('UUID_Related'),
    legacyProjectUuid: header.get('option1'),
    legacyUuid: header.get('UUID'),
    updatedAt: header.get('modificationTimestamp'),
    updatedBy: header.get('modificationAccountName'),
  };

  const parseField = (row: string[], index: number | undefined): string | undefined =>
    index === undefined ? undefined : optionalString(row[index]);

  return rows
    .slice(1)
    .map((row: string[], rowIndex: number): ParsedProjectDisplayRow | null => {
      const legacyUuid = normalizeLegacyUuid(parseField(row, idx.legacyUuid));
      const legacyPersonUuid = normalizeLegacyUuid(parseField(row, idx.legacyPersonUuid));
      if (legacyUuid.length === 0 || legacyPersonUuid.length === 0) return null;

      return {
        createdAt: parseField(row, idx.createdAt),
        createdBy: parseField(row, idx.createdBy),
        legacyPersonUuid,
        legacyProjectUuid: normalizeLegacyUuid(parseField(row, idx.legacyProjectUuid)) || undefined,
        legacyUuid,
        rowIndex,
        updatedAt: parseField(row, idx.updatedAt),
        updatedBy: parseField(row, idx.updatedBy),
      };
    })
    .filter(
      (project: ParsedProjectDisplayRow | null): project is ParsedProjectDisplayRow =>
        project !== null
    );
};

const collectProjectRows = (rows: ParsedProjectDisplayRow[]): CollectedProjectRows => {
  const projects = new Map<string, ParsedProjectDisplayRow>();
  let duplicateLegacyUuidCount = 0;
  let skippedRowCount = 0;

  rows.forEach((project: ParsedProjectDisplayRow): void => {
    if (project.legacyUuid.length === 0 || project.legacyPersonUuid.length === 0) {
      skippedRowCount += 1;
      return;
    }
    if (projects.has(project.legacyUuid)) duplicateLegacyUuidCount += 1;
    projects.set(project.legacyUuid, project);
  });

  return { duplicateLegacyUuidCount, projects, skippedRowCount };
};

const buildPersonName = (document: Document): string | undefined => {
  const fullName = optionalString(document['fullName']);
  if (fullName !== undefined) return fullName;
  const name = [document['firstName'], document['lastName']]
    .map(optionalString)
    .filter((part): part is string => part !== undefined)
    .join(' ');
  return name.length > 0 ? name : undefined;
};

const buildPersonMap = async (db: Db): Promise<Map<string, PersonLookupRecord>> => {
  const documents = await db
    .collection(PERSONS_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      {
        projection: {
          firstName: 1,
          fullName: 1,
          id: 1,
          lastName: 1,
          legacyUuid: 1,
        },
      }
    )
    .toArray();

  return new Map(
    documents
      .map((document: Document): [string, PersonLookupRecord] | null => {
        const id = optionalString(document['id']);
        const legacyUuid = optionalString(document['legacyUuid'])?.toUpperCase();
        if (id === undefined || legacyUuid === undefined) return null;
        return [legacyUuid, { id, legacyUuid, name: buildPersonName(document) }];
      })
      .filter((entry): entry is [string, PersonLookupRecord] => entry !== null)
  );
};

const buildValueMapFromMongo = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const valueDocuments = await db
    .collection<ValueCatalogDocument>(VALUES_COLLECTION)
    .find(
      { legacyUuid: { $type: 'string' } },
      { projection: { id: 1, label: 1, legacyUuid: 1, parentId: 1 } }
    )
    .toArray();

  return new Map(
    valueDocuments
      .map((document: ValueCatalogDocument): [string, ValueLookupRecord] | null => {
        const id = typeof document.id === 'string' ? document.id : '';
        const label = typeof document.label === 'string' ? document.label : '';
        const legacyUuid =
          typeof document.legacyUuid === 'string' ? document.legacyUuid.toUpperCase() : '';
        if (!id || !legacyUuid) return null;
        return [
          legacyUuid,
          {
            id,
            label,
            legacyUuid,
            parentId: typeof document.parentId === 'string' ? document.parentId : null,
          },
        ];
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

const buildValueMap = async (db: Db): Promise<Map<string, ValueLookupRecord>> => {
  const mongoValueMap = await buildValueMapFromMongo(db);
  return mongoValueMap.size > 0 ? mongoValueMap : buildValueMapFromSettings(db);
};

const toProjectDocument = (input: {
  importBatchId: string;
  importedAt: Date;
  person: PersonLookupRecord | undefined;
  project: ParsedProjectDisplayRow;
  projectValue: ValueLookupRecord | undefined;
}): FilemakerPersonProjectMongoDocument => {
  const id = createModernId(input.project.legacyUuid);
  return {
    _id: id,
    ...(input.project.createdAt ? { createdAt: input.project.createdAt } : {}),
    ...(input.project.createdBy ? { createdBy: input.project.createdBy } : {}),
    id,
    importBatchId: input.importBatchId,
    importedAt: input.importedAt,
    importSourceKind: IMPORT_SOURCE_KIND,
    legacyPersonUuid: input.project.legacyPersonUuid,
    ...(input.project.legacyProjectUuid ? { legacyProjectUuid: input.project.legacyProjectUuid } : {}),
    legacyUuid: input.project.legacyUuid,
    ...(input.person ? { personId: input.person.id } : {}),
    ...(input.person?.name ? { personName: input.person.name } : {}),
    ...(input.projectValue ? { projectName: input.projectValue.label } : {}),
    ...(input.projectValue ? { projectParentId: input.projectValue.parentId } : {}),
    ...(input.projectValue ? { projectValueId: input.projectValue.id } : {}),
    rowIndex: input.project.rowIndex,
    schemaVersion: 1,
    ...(input.project.updatedAt ? { updatedAt: input.project.updatedAt } : {}),
    ...(input.project.updatedBy ? { updatedBy: input.project.updatedBy } : {}),
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
    db.collection(PERSON_PROJECTS_COLLECTION).createIndex(
      { legacyUuid: 1 },
      { name: 'filemaker_person_projects_legacy_uuid_unique', unique: true }
    ),
    db.collection(PERSON_PROJECTS_COLLECTION).createIndex(
      { personId: 1 },
      {
        name: 'filemaker_person_projects_person_id',
        partialFilterExpression: { personId: { $type: 'string' } },
      }
    ),
    db.collection(PERSON_PROJECTS_COLLECTION).createIndex(
      { legacyPersonUuid: 1 },
      { name: 'filemaker_person_projects_legacy_person_uuid' }
    ),
    db.collection(PERSON_PROJECTS_COLLECTION).createIndex(
      { projectValueId: 1 },
      {
        name: 'filemaker_person_projects_project_value_id',
        partialFilterExpression: { projectValueId: { $type: 'string' } },
      }
    ),
    db.collection(PERSON_PROJECTS_COLLECTION).createIndex(
      { legacyProjectUuid: 1 },
      { name: 'filemaker_person_projects_legacy_project_uuid' }
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
  if (options.inputPath.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const parsedRows = await readProjectDisplayRows(options.inputPath);
  const collected = collectProjectRows(parsedRows);
  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<FilemakerPersonProjectMongoDocument>(
      PERSON_PROJECTS_COLLECTION
    );
    const replacedCollection =
      !options.dryRun && options.replaceCollection
        ? await dropCollectionIfExists(collection)
        : false;
    if (!options.dryRun && !options.replaceCollection) await ensureIndexes(db);

    const personByLegacyUuid = await buildPersonMap(db);
    const valueByLegacyUuid = await buildValueMap(db);
    const importBatchId = randomUUID();
    const importedAt = new Date();
    const projectDocuments = Array.from(collected.projects.values()).map(
      (project: ParsedProjectDisplayRow): FilemakerPersonProjectMongoDocument =>
        toProjectDocument({
          importBatchId,
          importedAt,
          person: personByLegacyUuid.get(project.legacyPersonUuid),
          project,
          projectValue:
            project.legacyProjectUuid !== undefined
              ? valueByLegacyUuid.get(project.legacyProjectUuid)
              : undefined,
        })
    );

    const projectWrite = options.dryRun
      ? { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
      : options.replaceCollection
        ? await runInsertWrites(collection, projectDocuments, options.batchSize)
        : await runBulkWrites(collection, projectDocuments, options.batchSize);
    if (!options.dryRun) await ensureIndexes(db);

    const resolvedPersonLinkCount = projectDocuments.filter(
      (project: FilemakerPersonProjectMongoDocument): boolean =>
        typeof project.personId === 'string'
    ).length;
    const totalProjectValueCount = projectDocuments.filter(
      (project: FilemakerPersonProjectMongoDocument): boolean =>
        typeof project.legacyProjectUuid === 'string'
    ).length;
    const resolvedProjectValueCount = projectDocuments.filter(
      (project: FilemakerPersonProjectMongoDocument): boolean =>
        typeof project.projectValueId === 'string'
    ).length;

    console.log(
      JSON.stringify(
        {
          duplicateLegacyUuidCount: collected.duplicateLegacyUuidCount,
          importBatchId: options.dryRun ? null : importBatchId,
          inputFormat: isWorkbookInputPath(options.inputPath)
            ? extname(options.inputPath).slice(1) || 'workbook'
            : 'text',
          inputPath: options.inputPath,
          mode: options.dryRun ? 'dry-run' : 'write',
          parsedRowCount: parsedRows.length,
          personLookupCount: personByLegacyUuid.size,
          projectWrite,
          replacedCollection,
          resolvedPersonLinkCount,
          resolvedProjectValueCount,
          skippedRowCount: collected.skippedRowCount,
          source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
          totalProjectValueCount,
          uniqueProjectLinkCount: collected.projects.size,
          unresolvedPersonLinkCount: projectDocuments.length - resolvedPersonLinkCount,
          unresolvedProjectValueCount: totalProjectValueCount - resolvedProjectValueCount,
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
