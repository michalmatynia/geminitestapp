import 'server-only';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Filter } from 'mongodb';

import {
  KANGUR_SOCIAL_POSTS_COLLECTION,
  hasKangurSocialLinkedInPublication,
  normalizeKangurSocialPost,
  parseKangurSocialPostStore,
  type KangurSocialPost,
  type KangurSocialPostStore,
  type UpdateKangurSocialPostInput,
} from '@/shared/contracts/kangur-social-posts';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

type KangurSocialPostDoc = Omit<KangurSocialPost, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

let indexesEnsured: Promise<void> | null = null;

const LOCAL_STORE_FILENAME = 'kangur_social_posts.json';

const resolveLocalStorePath = (): string => {
  const customPath = process.env['KANGUR_SOCIAL_POSTS_STORE_PATH']?.trim();
  const baseDir = customPath
    ? path.extname(customPath)
      ? path.dirname(customPath)
      : customPath
    : os.tmpdir();

  return path.join(baseDir, LOCAL_STORE_FILENAME);
};

const LOCAL_STORE_PATH = resolveLocalStorePath();

const readLocalStore = async (): Promise<KangurSocialPostStore> => {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return parseKangurSocialPostStore(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      void ErrorSystem.captureException(error, {
        service: 'kangur.social-posts.repository',
        action: 'readLocalStore',
      });
    }
    return parseKangurSocialPostStore({});
  }
};

const writeLocalStore = async (store: KangurSocialPostStore): Promise<void> => {
  const payload = JSON.stringify(store, null, 2);
  await fs.writeFile(LOCAL_STORE_PATH, payload, 'utf8');
};

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
  })().catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.repository',
      action: 'ensureIndexes',
    });
    indexesEnsured = null;
    throw error;
  });

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

const matchPublished = (): Filter<KangurSocialPostDoc> => ({
  $or: [
    { status: 'published' },
    { publishedAt: { $ne: null } },
    { linkedinPostId: { $ne: null } },
    { linkedinUrl: { $ne: null } },
  ],
});

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLooseIdRegex = (id: string): RegExp =>
  new RegExp(`^\\s*${escapeRegex(id)}\\s*$`);

const findPostDocById = async (
  collection: ReturnType<typeof readCollection> extends Promise<infer T> ? T : never,
  normalizedId: string
): Promise<KangurSocialPostDoc | null> => {
  const direct = await collection.findOne({ id: normalizedId });
  if (direct) return direct;
  const regex = buildLooseIdRegex(normalizedId);
  return collection.findOne({ id: { $regex: regex } });
};

export async function listKangurSocialPosts(): Promise<KangurSocialPost[]> {
  if (!process.env['MONGODB_URI']) {
    const store = await readLocalStore();
    return [...store.posts].sort((left, right) => {
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
    const store = await readLocalStore();
    return [...store.posts]
      .filter((post) => hasKangurSocialLinkedInPublication(post))
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
    const store = await readLocalStore();
    return [...store.posts].filter(
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
    const store = await readLocalStore();
    return store.posts.find((post) => post.id === normalizedId) ?? null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const doc = await findPostDocById(collection, normalizedId);
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
    const store = await readLocalStore();
    const existingIndex = store.posts.findIndex((entry) => entry.id === normalized.id);
    if (existingIndex >= 0) {
      store.posts[existingIndex] = next;
    } else {
      store.posts = [next, ...store.posts];
    }
    await writeLocalStore(store);
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

  return toSocialPost(result);
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

export async function deleteKangurSocialPost(id: string): Promise<KangurSocialPost | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;

  if (!process.env['MONGODB_URI']) {
    const store = await readLocalStore();
    const matchesId = (value: string): boolean => value.trim() === normalizedId;
    const existing = store.posts.find((entry) => matchesId(entry.id)) ?? null;
    if (!existing) return null;
    store.posts = store.posts.filter((entry) => !matchesId(entry.id));
    await writeLocalStore(store);
    return existing;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const existing = await findPostDocById(collection, normalizedId);
  if (!existing) return null;
  const regex = buildLooseIdRegex(normalizedId);
  await collection.deleteMany({ id: { $regex: regex } });
  return toSocialPost(existing);
}
