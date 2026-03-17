import 'server-only';

import type { Filter } from 'mongodb';

import {
  KANGUR_SOCIAL_POSTS_COLLECTION,
  normalizeKangurSocialPost,
  type KangurSocialPost,
  type UpdateKangurSocialPostInput,
} from '@/shared/contracts/kangur-social-posts';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

type KangurSocialPostDoc = Omit<KangurSocialPost, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

let indexesEnsured: Promise<void> | null = null;
let inMemoryPosts: KangurSocialPost[] = [];

const ensureIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) {
    return;
  }

  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async () => {
    const db = await getMongoDb();
    const collection = db.collection<KangurSocialPostDoc>(KANGUR_SOCIAL_POSTS_COLLECTION);
    await Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ status: 1, scheduledAt: 1 }),
      collection.createIndex({ publishedAt: -1 }),
      collection.createIndex({ updatedAt: -1 }),
    ]);
  })();

  return indexesEnsured;
};

const readCollection = async () => {
  const db = await getMongoDb();
  return db.collection<KangurSocialPostDoc>(KANGUR_SOCIAL_POSTS_COLLECTION);
};

const toSocialPost = (doc: KangurSocialPostDoc): KangurSocialPost =>
  normalizeKangurSocialPost({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });

const toDocUpdate = (post: KangurSocialPost): Omit<KangurSocialPostDoc, 'createdAt' | 'updatedAt'> => {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = post;
  return rest;
};

const matchPublished = (): Filter<KangurSocialPostDoc> => ({ status: 'published' });

export async function listKangurSocialPosts(): Promise<KangurSocialPost[]> {
  if (!process.env['MONGODB_URI']) {
    return [...inMemoryPosts].sort((left, right) => {
      const leftTs = left.updatedAt ? Date.parse(left.updatedAt) : 0;
      const rightTs = right.updatedAt ? Date.parse(right.updatedAt) : 0;
      return rightTs - leftTs;
    });
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection.find({}).sort({ updatedAt: -1 }).toArray();
  return docs.map(toSocialPost);
}

export async function listPublishedKangurSocialPosts(limit = 8): Promise<KangurSocialPost[]> {
  if (!process.env['MONGODB_URI']) {
    return [...inMemoryPosts]
      .filter((post) => post.status === 'published')
      .sort((left, right) => {
        const leftTs = left.publishedAt ? Date.parse(left.publishedAt) : 0;
        const rightTs = right.publishedAt ? Date.parse(right.publishedAt) : 0;
        return rightTs - leftTs;
      })
      .slice(0, limit);
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection
    .find(matchPublished())
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toSocialPost);
}

export async function listDueScheduledKangurSocialPosts(
  now: Date = new Date()
): Promise<KangurSocialPost[]> {
  if (!process.env['MONGODB_URI']) {
    const nowIso = now.toISOString();
    return [...inMemoryPosts].filter(
      (post) =>
        post.status === 'scheduled' &&
        post.scheduledAt !== null &&
        post.scheduledAt <= nowIso
    );
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection
    .find({
      status: 'scheduled',
      scheduledAt: { $lte: now.toISOString() },
    })
    .sort({ scheduledAt: 1 })
    .toArray();
  return docs.map(toSocialPost);
}

export async function getKangurSocialPostById(id: string): Promise<KangurSocialPost | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;

  if (!process.env['MONGODB_URI']) {
    return inMemoryPosts.find((post) => post.id === normalizedId) ?? null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const doc = await collection.findOne({ id: normalizedId });
  return doc ? toSocialPost(doc) : null;
}

export async function upsertKangurSocialPost(post: KangurSocialPost): Promise<KangurSocialPost> {
  const normalized = normalizeKangurSocialPost(post);
  const now = new Date();

  if (!process.env['MONGODB_URI']) {
    const next = {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const existingIndex = inMemoryPosts.findIndex((entry) => entry.id === normalized.id);
    if (existingIndex >= 0) {
      inMemoryPosts[existingIndex] = next;
    } else {
      inMemoryPosts = [next, ...inMemoryPosts];
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

  if (!result.value) {
    return {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  return toSocialPost(result.value);
}

export async function updateKangurSocialPost(
  id: string,
  updates: UpdateKangurSocialPostInput
): Promise<KangurSocialPost | null> {
  const existing = await getKangurSocialPostById(id);
  if (!existing) return null;
  const merged = normalizeKangurSocialPost({
    ...existing,
    ...updates,
    id: existing.id,
  });
  return upsertKangurSocialPost(merged);
}
