import { pathToFileURL } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { AnyBulkWriteOperation, Collection, Document, Filter } from 'mongodb';

import {
  FILEMAKER_EMAIL_STATUSES,
  normalizeFilemakerEmailStatus,
  normalizeRecognizedFilemakerEmailStatus,
} from '@/features/filemaker/filemaker-email-status';
import {
  FILEMAKER_EMAIL_LINKS_COLLECTION,
  FILEMAKER_EMAILS_COLLECTION,
} from '@/features/filemaker/server/filemaker-email-repository.types';
import type { FilemakerEmailStatus } from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const DEFAULT_BATCH_SIZE = 1_000;

type CliOptions = {
  batchSize: number;
  dryRun: boolean;
  limit: number | null;
  source: MongoSource | undefined;
};

type BackfillEmailDocument = Document & {
  _id: unknown;
  email?: unknown;
  id?: unknown;
  legacyStatusRaw?: unknown;
  legacyStatusUuid?: unknown;
  status?: unknown;
};

type BackfillEmailLinkDocument = Document & {
  _id: unknown;
  legacyStatusUuid?: unknown;
  legacyStatusUuids?: unknown;
};

type ChangedEmailPreview = {
  cleansLegacyStatusFields: boolean;
  email: string | null;
  id: string | null;
  nextStatus: FilemakerEmailStatus;
  previousStatus: FilemakerEmailStatus;
  storedStatus: string | null;
};

type BackfillSummary = {
  affectedEmailCount: number;
  changedStatusCounts: Record<string, number>;
  currentStatusCounts: Record<FilemakerEmailStatus, number>;
  legacyEmailLinkStatusFieldCount: number;
  limit: number | null;
  mode: 'dry-run' | 'write';
  nextStatusCounts: Record<FilemakerEmailStatus, number>;
  preview: ChangedEmailPreview[];
  scannedEmailCount: number;
  source: MongoSource | string | null;
  updatedEmailCount: number;
  updatedEmailLinkCount: number;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/backfill-filemaker-email-statuses.ts --source=local --write',
      '',
      'Backfills filemaker_emails.status from legacy FileMaker email status UUIDs and labels.',
      'The script updates existing FileMaker email collections only; it does not create a status collection.',
      'It also removes duplicate legacy status fields from email and email-link documents.',
      'By default the script performs a dry run. Pass --write to apply updates.',
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
    limit: null,
    source: undefined,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exitCode = 0;
      return;
    }
    if (arg === '--write') options.dryRun = false;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), DEFAULT_BATCH_SIZE);
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      options.limit = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
    }
  });

  return options;
};

const createStatusCountMap = (): Record<FilemakerEmailStatus, number> =>
  Object.fromEntries(FILEMAKER_EMAIL_STATUSES.map((status) => [status, 0])) as Record<
    FilemakerEmailStatus,
    number
  >;

const optionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const resolveNextStatus = (document: BackfillEmailDocument): FilemakerEmailStatus =>
  normalizeRecognizedFilemakerEmailStatus(document.legacyStatusUuid) ??
  normalizeRecognizedFilemakerEmailStatus(document.legacyStatusRaw) ??
  normalizeFilemakerEmailStatus(document.status);

const hasEmailLegacyStatusFields = (document: BackfillEmailDocument): boolean =>
  document.legacyStatusRaw !== undefined || document.legacyStatusUuid !== undefined;

const toUpdateOperation = (
  document: BackfillEmailDocument,
  status: FilemakerEmailStatus
): AnyBulkWriteOperation<BackfillEmailDocument> => ({
  updateOne: {
    filter: { _id: document._id } as Filter<BackfillEmailDocument>,
    update: {
      $set: { status },
      $unset: { legacyStatusRaw: '', legacyStatusUuid: '' },
    },
  },
});

const toEmailLinkCleanupOperation = (
  document: BackfillEmailLinkDocument
): AnyBulkWriteOperation<BackfillEmailLinkDocument> => ({
  updateOne: {
    filter: { _id: document._id } as Filter<BackfillEmailLinkDocument>,
    update: { $unset: { legacyStatusUuid: '', legacyStatusUuids: '' } },
  },
});

const flushUpdates = async <TDocument extends Document>(
  collection: Collection<TDocument>,
  operations: AnyBulkWriteOperation<TDocument>[]
): Promise<number> => {
  if (operations.length === 0) return 0;
  const result = await collection.bulkWrite(operations, { ordered: false });
  operations.splice(0, operations.length);
  return result.modifiedCount;
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (process.exitCode === 0) return;

  const { getMongoClient, getMongoDb } = await import('@/shared/lib/db/mongo-client');
  const client = await getMongoClient(options.source);

  try {
    const db = await getMongoDb(options.source);
    const collection = db.collection<BackfillEmailDocument>(FILEMAKER_EMAILS_COLLECTION);
    const linkCollection =
      db.collection<BackfillEmailLinkDocument>(FILEMAKER_EMAIL_LINKS_COLLECTION);
    const cursor = collection.find(
      {},
      {
        projection: {
          _id: 1,
          email: 1,
          id: 1,
          legacyStatusRaw: 1,
          legacyStatusUuid: 1,
          status: 1,
        },
      }
    );
    if (options.limit !== null) cursor.limit(options.limit);

    const currentStatusCounts = createStatusCountMap();
    const nextStatusCounts = createStatusCountMap();
    const changedStatusCounts: Record<string, number> = {};
    const preview: ChangedEmailPreview[] = [];
    const operations: AnyBulkWriteOperation<BackfillEmailDocument>[] = [];
    const linkOperations: AnyBulkWriteOperation<BackfillEmailLinkDocument>[] = [];
    let affectedEmailCount = 0;
    let legacyEmailLinkStatusFieldCount = 0;
    let scannedEmailCount = 0;
    let updatedEmailCount = 0;
    let updatedEmailLinkCount = 0;

    for await (const document of cursor) {
      scannedEmailCount += 1;
      const storedStatus = optionalString(document.status);
      const previousStatus = normalizeFilemakerEmailStatus(document.status);
      const nextStatus = resolveNextStatus(document);
      const cleansLegacyStatusFields = hasEmailLegacyStatusFields(document);
      currentStatusCounts[previousStatus] += 1;
      nextStatusCounts[nextStatus] += 1;

      if (storedStatus === nextStatus && !cleansLegacyStatusFields) continue;

      affectedEmailCount += 1;
      if (storedStatus !== nextStatus) {
        const changeKey = `${previousStatus}->${nextStatus}`;
        changedStatusCounts[changeKey] = (changedStatusCounts[changeKey] ?? 0) + 1;
      }
      if (preview.length < 25) {
        preview.push({
          cleansLegacyStatusFields,
          email: optionalString(document.email),
          id: optionalString(document.id),
          nextStatus,
          previousStatus,
          storedStatus,
        });
      }

      if (!options.dryRun) {
        operations.push(toUpdateOperation(document, nextStatus));
        if (operations.length >= options.batchSize) {
          updatedEmailCount += await flushUpdates(collection, operations);
        }
      }
    }

    const linkCursor = linkCollection.find(
      {
        $or: [
          { legacyStatusUuid: { $exists: true } },
          { legacyStatusUuids: { $exists: true } },
        ],
      },
      { projection: { _id: 1, legacyStatusUuid: 1, legacyStatusUuids: 1 } }
    );
    for await (const document of linkCursor) {
      legacyEmailLinkStatusFieldCount += 1;
      if (!options.dryRun) {
        linkOperations.push(toEmailLinkCleanupOperation(document));
        if (linkOperations.length >= options.batchSize) {
          updatedEmailLinkCount += await flushUpdates(linkCollection, linkOperations);
        }
      }
    }

    if (!options.dryRun) {
      updatedEmailCount += await flushUpdates(collection, operations);
      updatedEmailLinkCount += await flushUpdates(linkCollection, linkOperations);
    }

    const summary: BackfillSummary = {
      affectedEmailCount,
      changedStatusCounts,
      currentStatusCounts,
      legacyEmailLinkStatusFieldCount,
      limit: options.limit,
      mode: options.dryRun ? 'dry-run' : 'write',
      nextStatusCounts,
      preview,
      scannedEmailCount,
      source: options.source ?? process.env['MONGODB_ACTIVE_SOURCE'] ?? null,
      updatedEmailCount,
      updatedEmailLinkCount,
    };

    console.log(JSON.stringify(summary, null, 2));
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
