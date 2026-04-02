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

export type KangurSocialPostListStatus = 'all' | 'draft' | 'scheduled' | 'published' | 'failed';

export type KangurSocialPostsPage = {
  posts: KangurSocialPost[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<Exclude<KangurSocialPostListStatus, 'all'>, number>;
};

type KangurSocialPostsPageOptions = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  status?: KangurSocialPostListStatus | null;
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

const matchNotPublished = (): Filter<KangurSocialPostDoc> => ({
  publishedAt: null,
  linkedinPostId: null,
  linkedinUrl: null,
  status: { $ne: 'published' },
});

const normalizePageNumber = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value as number);
  return normalized > 0 ? normalized : fallback;
};

const normalizeSocialStatus = (
  value: KangurSocialPostListStatus | null | undefined
): KangurSocialPostListStatus => {
  switch (value) {
    case 'draft':
    case 'scheduled':
    case 'published':
    case 'failed':
      return value;
    default:
      return 'all';
  }
};

const resolveListStatus = (post: KangurSocialPost): Exclude<KangurSocialPostListStatus, 'all'> =>
  hasKangurSocialLinkedInPublication(post) ? 'published' : post.status;

const buildSearchableText = (post: KangurSocialPost): string =>
  [
    post.titlePl,
    post.titleEn,
    post.bodyPl,
    post.bodyEn,
    post.combinedBody,
    post.visualSummary,
    ...(post.visualHighlights ?? []),
    post.visualAnalysisModelId,
    post.visualAnalysisJobId,
    post.visualAnalysisError,
    post.linkedinPostId,
    post.linkedinUrl,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const buildStatusCounts = (
  posts: KangurSocialPost[]
): Record<Exclude<KangurSocialPostListStatus, 'all'>, number> => ({
  draft: posts.filter((post) => resolveListStatus(post) === 'draft').length,
  scheduled: posts.filter((post) => resolveListStatus(post) === 'scheduled').length,
  published: posts.filter((post) => resolveListStatus(post) === 'published').length,
  failed: posts.filter((post) => resolveListStatus(post) === 'failed').length,
});

const filterPostsForAdminList = (
  posts: KangurSocialPost[],
  options?: KangurSocialPostsPageOptions
): KangurSocialPostsPage => {
  const page = normalizePageNumber(options?.page, 1);
  const pageSize = normalizePageNumber(options?.pageSize, 8);
  const normalizedSearch = options?.search?.trim().toLowerCase() ?? '';
  const normalizedStatus = normalizeSocialStatus(options?.status);

  const searchFilteredPosts = normalizedSearch
    ? posts.filter((post) => buildSearchableText(post).includes(normalizedSearch))
    : posts;
  const statusCounts = buildStatusCounts(searchFilteredPosts);
  const filteredPosts =
    normalizedStatus === 'all'
      ? searchFilteredPosts
      : searchFilteredPosts.filter((post) => resolveListStatus(post) === normalizedStatus);
  const total = filteredPosts.length;
  const startIndex = (page - 1) * pageSize;

  return {
    posts: filteredPosts.slice(startIndex, startIndex + pageSize),
    total,
    page,
    pageSize,
    statusCounts,
  };
};

const buildMongoSearchMatch = (search: string | null | undefined): Filter<KangurSocialPostDoc> => {
  const normalizedSearch = search?.trim();
  if (!normalizedSearch) {
    return {};
  }

  const regex = new RegExp(escapeRegex(normalizedSearch), 'i');
  return {
    $or: [
      { titlePl: { $regex: regex } },
      { titleEn: { $regex: regex } },
      { bodyPl: { $regex: regex } },
      { bodyEn: { $regex: regex } },
      { combinedBody: { $regex: regex } },
      { visualSummary: { $regex: regex } },
      { visualHighlights: { $regex: regex } },
      { visualAnalysisModelId: { $regex: regex } },
      { visualAnalysisJobId: { $regex: regex } },
      { visualAnalysisError: { $regex: regex } },
      { linkedinPostId: { $regex: regex } },
      { linkedinUrl: { $regex: regex } },
    ],
  };
};

const buildMongoStatusMatch = (
  status: KangurSocialPostListStatus
): Filter<KangurSocialPostDoc> => {
  switch (status) {
    case 'published':
      return matchPublished();
    case 'draft':
    case 'scheduled':
    case 'failed':
      return {
        $and: [{ status }, matchNotPublished()],
      };
    default:
      return {};
  }
};

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

export async function listKangurSocialPostsPage(
  options?: KangurSocialPostsPageOptions
): Promise<KangurSocialPostsPage> {
  const page = normalizePageNumber(options?.page, 1);
  const pageSize = normalizePageNumber(options?.pageSize, 8);
  const normalizedStatus = normalizeSocialStatus(options?.status);

  if (!process.env['MONGODB_URI']) {
    const store = await readLocalStore();
    const posts = [...store.posts].sort((left, right) => {
      const leftTs = left.updatedAt ? Date.parse(left.updatedAt) : 0;
      const rightTs = right.updatedAt ? Date.parse(right.updatedAt) : 0;
      return rightTs - leftTs;
    });
    return filterPostsForAdminList(posts, {
      ...options,
      page,
      pageSize,
      status: normalizedStatus,
    });
  }

  await ensureIndexes();
  const collection = await readCollection();
  const skip = (page - 1) * pageSize;
  const searchMatch = buildMongoSearchMatch(options?.search);
  const statusMatch = buildMongoStatusMatch(normalizedStatus);

  const [result] = await collection
    .aggregate<{
      posts?: KangurSocialPostDoc[];
      total?: Array<{ total?: number }>;
      statusCounts?: Array<{ _id: string; count: number }>;
    }>([
      { $match: searchMatch },
      {
        $facet: {
          posts: [
            ...(Object.keys(statusMatch).length > 0 ? [{ $match: statusMatch }] : []),
            { $sort: { updatedAt: -1 } },
            { $skip: skip },
            { $limit: pageSize },
          ],
          total: [
            ...(Object.keys(statusMatch).length > 0 ? [{ $match: statusMatch }] : []),
            { $count: 'total' },
          ],
          statusCounts: [
            {
              $group: {
                _id: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$status', 'published'] },
                        { $ne: ['$publishedAt', null] },
                        { $ne: ['$linkedinPostId', null] },
                        { $ne: ['$linkedinUrl', null] },
                      ],
                    },
                    'published',
                    '$status',
                  ],
                },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ])
    .toArray();

  const docs = Array.isArray(result?.posts) ? result.posts : [];
  const total =
    result?.total && Array.isArray(result.total) && typeof result.total[0]?.total === 'number'
      ? result.total[0].total
      : 0;
  const counts = {
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  };

  (result?.statusCounts ?? []).forEach((entry) => {
    if (
      entry &&
      typeof entry._id === 'string' &&
      Object.prototype.hasOwnProperty.call(counts, entry._id) &&
      typeof entry.count === 'number'
    ) {
      counts[entry._id as keyof typeof counts] = entry.count;
    }
  });

  return {
    posts: docs.map(toSocialPost),
    total,
    page,
    pageSize,
    statusCounts: counts,
  };
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
