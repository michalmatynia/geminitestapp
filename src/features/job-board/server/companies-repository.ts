import 'server-only';

import { randomUUID } from 'crypto';

import {
  COMPANIES_COLLECTION,
  normalizeCompany,
  type Company,
  type CompanyInput,
} from '@/shared/contracts/job-board';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type CompanyDoc = Omit<Company, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

let indexesEnsured: Promise<void> | null = null;
let inMemory: Company[] = [];

const useMemory = (): boolean => !process.env['MONGODB_URI'];

const ensureIndexes = async (): Promise<void> => {
  if (useMemory()) return;
  if (indexesEnsured) return indexesEnsured;
  indexesEnsured = (async () => {
    try {
      const db = await getMongoDb();
      const collection = db.collection<CompanyDoc>(COMPANIES_COLLECTION);
      await Promise.all([
        collection.createIndex({ id: 1 }, { unique: true }),
        collection.createIndex(
          { nip: 1 },
          { unique: true, partialFilterExpression: { nip: { $type: 'string' } } }
        ),
        collection.createIndex(
          { domain: 1 },
          { partialFilterExpression: { domain: { $type: 'string' } } }
        ),
        collection.createIndex({ name: 1 }),
      ]);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'companies.repository',
        action: 'ensureIndexes',
      });
    }
  })();
  return indexesEnsured;
};

const toRecord = (doc: CompanyDoc): Company =>
  normalizeCompany({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });

const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

const matchKey = (company: Company): { nip: string | null; domain: string | null; name: string } => ({
  nip: company.nip?.trim() || null,
  domain: company.domain?.trim().toLowerCase() || null,
  name: normalizeName(company.name),
});

export async function findCompanyMatch(input: {
  nip?: string | null;
  domain?: string | null;
  name?: string | null;
}): Promise<Company | null> {
  const nip = input.nip?.trim() || null;
  const domain = input.domain?.trim().toLowerCase() || null;
  const name = input.name ? normalizeName(input.name) : null;

  if (useMemory()) {
    if (nip) {
      const byNip = inMemory.find((c) => c.nip === nip);
      if (byNip) return byNip;
    }
    if (domain) {
      const byDomain = inMemory.find((c) => c.domain?.toLowerCase() === domain);
      if (byDomain) return byDomain;
    }
    if (name) {
      const byName = inMemory.find((c) => normalizeName(c.name) === name);
      if (byName) return byName;
    }
    return null;
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const collection = db.collection<CompanyDoc>(COMPANIES_COLLECTION);

  if (nip) {
    const doc = await collection.findOne({ nip });
    if (doc) return toRecord(doc);
  }
  if (domain) {
    const doc = await collection.findOne({ domain });
    if (doc) return toRecord(doc);
  }
  if (name) {
    const docs = await collection.find({}).toArray();
    const match = docs.find((doc) => normalizeName(doc.name) === name);
    if (match) return toRecord(match);
  }
  return null;
}

export async function listCompanies(input: { limit?: number | null } = {}): Promise<Company[]> {
  const limit = input.limit != null ? Math.max(1, Math.trunc(input.limit)) : 100;

  if (useMemory()) {
    return [...inMemory]
      .sort((a, b) => {
        const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTs - aTs;
      })
      .slice(0, limit);
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const docs = await db
    .collection<CompanyDoc>(COMPANIES_COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toRecord);
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const trimmedId = id.trim();
  if (!trimmedId) return null;

  if (useMemory()) {
    return inMemory.find((c) => c.id === trimmedId) ?? null;
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const collection = db.collection<CompanyDoc>(COMPANIES_COLLECTION);
  const doc = await collection.findOne({ id: trimmedId });
  return doc ? toRecord(doc) : null;
}

export async function upsertCompany(input: CompanyInput): Promise<Company> {
  const normalized = normalizeCompany({ ...input, id: input.id || randomUUID() });
  const now = new Date();

  if (useMemory()) {
    const existingIndex = inMemory.findIndex((c) => c.id === normalized.id);
    const next: Company = {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    if (existingIndex >= 0) {
      inMemory[existingIndex] = next;
    } else {
      inMemory = [next, ...inMemory];
    }
    return next;
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const collection = db.collection<CompanyDoc>(COMPANIES_COLLECTION);
  const { createdAt: _c, updatedAt: _u, ...rest } = normalized;
  const result = await collection.findOneAndUpdate(
    { id: normalized.id },
    {
      $set: { ...rest, updatedAt: now },
      $setOnInsert: { createdAt: normalized.createdAt ? new Date(normalized.createdAt) : now },
    },
    { upsert: true, returnDocument: 'after' }
  );
  return result
    ? toRecord(result)
    : { ...normalized, createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

/**
 * Upsert by match keys: NIP first, then domain, then normalized name.
 * Returns the resulting (possibly merged) company. Existing fields take precedence over null
 * incoming values; non-null incoming values override.
 */
export async function upsertCompanyByMatch(input: CompanyInput): Promise<Company> {
  const candidate = normalizeCompany({ ...input, id: input.id || randomUUID() });
  const keys = matchKey(candidate);
  const existing = await findCompanyMatch({
    nip: keys.nip,
    domain: keys.domain,
    name: keys.name,
  });

  if (!existing) {
    return await upsertCompany(candidate);
  }

  const merged: CompanyInput = { ...existing };
  for (const [key, value] of Object.entries(candidate)) {
    if (value !== null && value !== undefined && value !== '') {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  merged.id = existing.id;
  return await upsertCompany(merged);
}
