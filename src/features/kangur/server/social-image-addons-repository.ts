import 'server-only';

import type { Filter } from 'mongodb';

import {
  KANGUR_SOCIAL_IMAGE_ADDONS_COLLECTION,
  normalizeKangurSocialImageAddon,
  type KangurSocialImageAddon,
  type UpdateKangurSocialImageAddonInput,
} from '@/shared/contracts/kangur-social-image-addons';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

type KangurSocialImageAddonDoc = Omit<KangurSocialImageAddon, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

let indexesEnsured: Promise<void> | null = null;
let inMemoryAddons: KangurSocialImageAddon[] = [];

const ensureIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) {
    return;
  }

  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async () => {
    const db = await getMongoDb();
    const collection = db.collection<KangurSocialImageAddonDoc>(
      KANGUR_SOCIAL_IMAGE_ADDONS_COLLECTION
    );
    await Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ createdAt: -1 }),
      collection.createIndex({ updatedAt: -1 }),
    ]);
  })().catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-image-addons.repository',
      action: 'ensureIndexes',
    });
    indexesEnsured = null;
    throw error;
  });

  return indexesEnsured;
};

const readCollection = async () => {
  const db = await getMongoDb();
  return db.collection<KangurSocialImageAddonDoc>(KANGUR_SOCIAL_IMAGE_ADDONS_COLLECTION);
};

const toAddon = (doc: KangurSocialImageAddonDoc): KangurSocialImageAddon =>
  normalizeKangurSocialImageAddon({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });

const toDocUpdate = (
  addon: KangurSocialImageAddon
): Omit<KangurSocialImageAddonDoc, 'createdAt' | 'updatedAt'> => {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = addon;
  return rest;
};

const matchByIds = (ids: string[]): Filter<KangurSocialImageAddonDoc> => ({
  id: { $in: ids },
});

export async function listKangurSocialImageAddons(
  limit = 12
): Promise<KangurSocialImageAddon[]> {
  if (!process.env['MONGODB_URI']) {
    return [...inMemoryAddons]
      .sort((left, right) => {
        const leftTs = left.updatedAt ? Date.parse(left.updatedAt) : 0;
        const rightTs = right.updatedAt ? Date.parse(right.updatedAt) : 0;
        return rightTs - leftTs;
      })
      .slice(0, limit);
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection.find({}).sort({ updatedAt: -1 }).limit(limit).toArray();
  return docs.map(toAddon);
}

export async function findKangurSocialImageAddonsByIds(
  ids: string[]
): Promise<KangurSocialImageAddon[]> {
  const normalized = ids.map((id) => id.trim()).filter(Boolean);
  if (normalized.length === 0) return [];

  if (!process.env['MONGODB_URI']) {
    const idSet = new Set(normalized);
    return inMemoryAddons.filter((addon) => idSet.has(addon.id));
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection.find(matchByIds(normalized)).toArray();
  return docs.map(toAddon);
}

export async function getKangurSocialImageAddonById(
  id: string
): Promise<KangurSocialImageAddon | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;

  if (!process.env['MONGODB_URI']) {
    return inMemoryAddons.find((addon) => addon.id === normalizedId) ?? null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const doc = await collection.findOne({ id: normalizedId });
  return doc ? toAddon(doc) : null;
}

export async function upsertKangurSocialImageAddon(
  addon: KangurSocialImageAddon
): Promise<KangurSocialImageAddon> {
  const normalized = normalizeKangurSocialImageAddon(addon);
  const now = new Date();

  if (!process.env['MONGODB_URI']) {
    const next = {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const existingIndex = inMemoryAddons.findIndex((entry) => entry.id === normalized.id);
    if (existingIndex >= 0) {
      inMemoryAddons[existingIndex] = next;
    } else {
      inMemoryAddons = [next, ...inMemoryAddons];
    }
    return next;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const update = toDocUpdate(normalized);
  const result = await collection.findOneAndUpdate(
    { id: normalized.id },
    {
      $set: {
        ...update,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  if (!result) {
    return {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  return toAddon(result);
}

export async function updateKangurSocialImageAddon(
  id: string,
  updates: UpdateKangurSocialImageAddonInput
): Promise<KangurSocialImageAddon | null> {
  const existing = await getKangurSocialImageAddonById(id);
  if (!existing) return null;
  const merged = normalizeKangurSocialImageAddon({
    ...existing,
    ...updates,
    id: existing.id,
  });
  return upsertKangurSocialImageAddon(merged);
}
