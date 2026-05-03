import 'server-only';

import { randomUUID } from 'crypto';

import {
  JOB_LISTINGS_COLLECTION,
  normalizeJobListing,
  type JobListing,
  type JobListingInput,
} from '@/shared/contracts/job-board';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type JobListingDoc = Omit<JobListing, 'createdAt' | 'updatedAt' | 'postedAt' | 'expiresAt'> & {
  createdAt: Date;
  updatedAt: Date;
  postedAt: Date | null;
  expiresAt: Date | null;
};

let indexesEnsured: Promise<void> | null = null;
let inMemory: JobListing[] = [];

const useMemory = (): boolean => !process.env['MONGODB_URI'];

const ensureIndexes = async (): Promise<void> => {
  if (useMemory()) return;
  if (indexesEnsured) return indexesEnsured;
  indexesEnsured = (async () => {
    try {
      const db = await getMongoDb();
      const collection = db.collection<JobListingDoc>(JOB_LISTINGS_COLLECTION);
      await Promise.all([
        collection.createIndex({ id: 1 }, { unique: true }),
        collection.createIndex({ companyId: 1, createdAt: -1 }),
        collection.createIndex(
          { sourceUrl: 1 },
          { unique: true, partialFilterExpression: { sourceUrl: { $type: 'string' } } }
        ),
      ]);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'job-listings.repository',
        action: 'ensureIndexes',
      });
    }
  })();
  return indexesEnsured;
};

const toRecord = (doc: JobListingDoc): JobListing =>
  normalizeJobListing({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    postedAt: doc.postedAt ? doc.postedAt.toISOString() : null,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
  });

export async function findJobListingBySourceUrl(sourceUrl: string): Promise<JobListing | null> {
  const url = sourceUrl.trim();
  if (!url) return null;

  if (useMemory()) {
    return inMemory.find((j) => j.sourceUrl === url) ?? null;
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const doc = await db.collection<JobListingDoc>(JOB_LISTINGS_COLLECTION).findOne({ sourceUrl: url });
  return doc ? toRecord(doc) : null;
}

export async function listJobListings(input: {
  companyId?: string | null;
  limit?: number | null;
} = {}): Promise<JobListing[]> {
  const limit = input.limit != null ? Math.max(1, Math.trunc(input.limit)) : 100;
  const companyId = input.companyId?.trim() || null;

  if (useMemory()) {
    const filtered = companyId ? inMemory.filter((j) => j.companyId === companyId) : inMemory;
    return [...filtered]
      .sort((a, b) => {
        const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTs - aTs;
      })
      .slice(0, limit);
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const filter = companyId ? { companyId } : {};
  const docs = await db
    .collection<JobListingDoc>(JOB_LISTINGS_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toRecord);
}

export async function listJobListingsByCompany(companyId: string): Promise<JobListing[]> {
  const id = companyId.trim();
  if (!id) return [];

  if (useMemory()) {
    return inMemory.filter((j) => j.companyId === id);
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const docs = await db
    .collection<JobListingDoc>(JOB_LISTINGS_COLLECTION)
    .find({ companyId: id })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toRecord);
}

export async function upsertJobListing(input: JobListingInput): Promise<JobListing> {
  const normalized = normalizeJobListing({ ...input, id: input.id || randomUUID() });
  const now = new Date();

  if (useMemory()) {
    const existingIndex = inMemory.findIndex(
      (j) => j.id === normalized.id || j.sourceUrl === normalized.sourceUrl
    );
    const next: JobListing = {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    if (existingIndex >= 0) {
      inMemory[existingIndex] = { ...next, id: inMemory[existingIndex]!.id };
    } else {
      inMemory = [next, ...inMemory];
    }
    return inMemory[existingIndex >= 0 ? existingIndex : 0]!;
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const collection = db.collection<JobListingDoc>(JOB_LISTINGS_COLLECTION);
  const { createdAt: _c, updatedAt: _u, postedAt, expiresAt, ...rest } = normalized;
  const result = await collection.findOneAndUpdate(
    { sourceUrl: normalized.sourceUrl },
    {
      $set: {
        ...rest,
        postedAt: postedAt ? new Date(postedAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: normalized.createdAt ? new Date(normalized.createdAt) : now,
      },
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
