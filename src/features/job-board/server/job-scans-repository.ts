import 'server-only';

import { randomUUID } from 'crypto';

import {
  JOB_SCANS_COLLECTION,
  normalizeJobScanRecord,
  type JobScanRecord,
  type JobScanRecordInput,
  type JobScanStatus,
} from '@/shared/contracts/job-board';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type JobScanDoc = Omit<JobScanRecord, 'createdAt' | 'updatedAt' | 'completedAt'> & {
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

let indexesEnsured: Promise<void> | null = null;
let inMemory: JobScanRecord[] = [];

const useMemory = (): boolean => !process.env['MONGODB_URI'];

const ensureIndexes = async (): Promise<void> => {
  if (useMemory()) return;
  if (indexesEnsured) return indexesEnsured;
  indexesEnsured = (async () => {
    try {
      const db = await getMongoDb();
      const collection = db.collection<JobScanDoc>(JOB_SCANS_COLLECTION);
      await Promise.all([
        collection.createIndex({ id: 1 }, { unique: true }),
        collection.createIndex({ status: 1, updatedAt: -1 }),
        collection.createIndex({ sourceUrl: 1, createdAt: -1 }),
        collection.createIndex(
          { engineRunId: 1 },
          { unique: true, partialFilterExpression: { engineRunId: { $type: 'string' } } }
        ),
      ]);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'job-scans.repository',
        action: 'ensureIndexes',
      });
    }
  })();
  return indexesEnsured;
};

const toRecord = (doc: JobScanDoc): JobScanRecord =>
  normalizeJobScanRecord({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  });

const sortByCreatedAtDesc = (scans: JobScanRecord[]): JobScanRecord[] =>
  [...scans].sort((a, b) => {
    const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTs - aTs;
  });

export async function listJobScans(input: {
  statuses?: JobScanStatus[] | null;
  limit?: number | null;
} = {}): Promise<JobScanRecord[]> {
  const limit = input.limit != null ? Math.max(1, Math.trunc(input.limit)) : 50;
  const statuses = input.statuses ?? null;

  if (useMemory()) {
    const filtered = statuses
      ? inMemory.filter((s) => statuses.includes(s.status))
      : inMemory;
    return sortByCreatedAtDesc(filtered).slice(0, limit);
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const filter = statuses ? { status: { $in: statuses } } : {};
  const docs = await db
    .collection<JobScanDoc>(JOB_SCANS_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toRecord);
}

export async function getJobScanById(id: string): Promise<JobScanRecord | null> {
  const trimmedId = id.trim();
  if (!trimmedId) return null;

  if (useMemory()) {
    return inMemory.find((s) => s.id === trimmedId) ?? null;
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const doc = await db.collection<JobScanDoc>(JOB_SCANS_COLLECTION).findOne({ id: trimmedId });
  return doc ? toRecord(doc) : null;
}

export async function upsertJobScan(input: JobScanRecordInput): Promise<JobScanRecord> {
  const normalized = normalizeJobScanRecord({ ...input, id: input.id || randomUUID() });
  const now = new Date();

  if (useMemory()) {
    const next: JobScanRecord = {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: normalized.completedAt ?? null,
    };
    const existingIndex = inMemory.findIndex((s) => s.id === normalized.id);
    if (existingIndex >= 0) {
      inMemory[existingIndex] = next;
    } else {
      inMemory = [next, ...inMemory];
    }
    return next;
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const collection = db.collection<JobScanDoc>(JOB_SCANS_COLLECTION);
  const { createdAt: _c, updatedAt: _u, completedAt, ...rest } = normalized;
  const result = await collection.findOneAndUpdate(
    { id: normalized.id },
    {
      $set: {
        ...rest,
        completedAt: completedAt ? new Date(completedAt) : null,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: normalized.createdAt ? new Date(normalized.createdAt) : now },
    },
    { upsert: true, returnDocument: 'after' }
  );
  return result
    ? toRecord(result)
    : {
        ...normalized,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
}

export async function updateJobScan(
  id: string,
  updates: Partial<JobScanRecordInput>
): Promise<JobScanRecord | null> {
  const existing = await getJobScanById(id);
  if (!existing) return null;
  return await upsertJobScan({ ...existing, ...updates, id: existing.id });
}
