import 'server-only';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Filter } from 'mongodb';

import {
  SOCIAL_PUBLISHING_POSTS_COLLECTION,
  hasSocialPublishingPublication,
  normalizeSocialPublishingPost,
  parseSocialPublishingPostStore,
  type SocialPublishingPost,
  type SocialPublishingPostStore,
  type UpdateSocialPublishingPostInput,
  type SocialPublishingPostListStatus,
  type SocialPublishingPostsPageResult,
} from '@/shared/contracts/social-publishing-posts';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { SocialPublishingPostListStatus } from '@/shared/contracts/social-publishing-posts';

type SocialPublishingPostDoc = Omit<SocialPublishingPost, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

type SocialPublishingPostsPageOptions = {
  page?: number;
  pageSize?: number;
  search?: string | null;
  status?: SocialPublishingPostListStatus | null;
};

let indexesEnsured: Promise<void> | null = null;

/**
 * Name of the local JSON file used for social post persistence when MongoDB is unavailable.
 */
const LOCAL_STORE_FILENAME = 'social_publishing_posts.json';

/**
 * Resolves the absolute path to the local social posts store file.
 * Defaults to the system temp directory if no environment override is provided.
 * 
 * @returns Path to the local JSON store
 */
const resolveLocalStorePath = (): string => {
  const customPath = process.env['SOCIAL_PUBLISHING_POSTS_STORE_PATH']?.trim();

  if (customPath == null || customPath.length === 0) {
    return path.join(os.tmpdir(), LOCAL_STORE_FILENAME);
  }

  const baseDir = path.extname(customPath) ? path.dirname(customPath) : customPath;
  return path.join(baseDir, LOCAL_STORE_FILENAME);
};

const LOCAL_STORE_PATH = resolveLocalStorePath();

const readLocalStore = async (): Promise<SocialPublishingPostStore> => {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return parseSocialPublishingPostStore(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      ErrorSystem.captureException(error, {
        service: 'social-publishing.posts.repository',
        action: 'readLocalStore',
      });
    }
    return parseSocialPublishingPostStore({});
  }
};

const writeLocalStore = async (store: SocialPublishingPostStore): Promise<void> => {
  const payload = JSON.stringify(store, null, 2);
  await fs.writeFile(LOCAL_STORE_PATH, payload, 'utf8');
};

const ensureIndexes = async (): Promise<void> => {
  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
    return;
  }

  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async () => {
    const db = await getMongoDb();
    const collection = db.collection<SocialPublishingPostDoc>(SOCIAL_PUBLISHING_POSTS_COLLECTION);
    await Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ status: 1, scheduledAt: 1 }),
      collection.createIndex({ publishedAt: -1 }),
      collection.createIndex({ updatedAt: -1 }),
    ]);
  })().catch((error) => {
    ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.repository',
      action: 'ensureIndexes',
    });
    indexesEnsured = null;
    throw error;
  });

  return indexesEnsured;
};

const readCollection = async (): Promise<import('mongodb').Collection<SocialPublishingPostDoc>> => {
  const db = await getMongoDb();
  return db.collection<SocialPublishingPostDoc>(SOCIAL_PUBLISHING_POSTS_COLLECTION);
};

const toSocialPost = (doc: SocialPublishingPostDoc): SocialPublishingPost =>
  normalizeSocialPublishingPost({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });

const toDocUpdate = (post: SocialPublishingPost): Omit<SocialPublishingPostDoc, 'createdAt' | 'updatedAt'> => {
  const { createdAt: createdAtIgnored, updatedAt: updatedAtIgnored, ...rest } = post;
  return rest;
};

const matchPublished = (): Filter<SocialPublishingPostDoc> => ({
  $or: [
    { status: 'published' },
    { publishedAt: { $ne: null } },
    { publishedPostId: { $ne: null } },
    { publishedUrl: { $ne: null } },
  ],
});

const matchNotPublished = (): Filter<SocialPublishingPostDoc> => ({
  publishedAt: null,
  publishedPostId: null,
  publishedUrl: null,
  status: { $ne: 'published' },
});

const normalizePageNumber = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value as number);
  return normalized > 0 ? normalized : fallback;
};

const normalizeSocialStatus = (
  value: SocialPublishingPostListStatus | null | undefined
): SocialPublishingPostListStatus => {
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

const resolveListStatus = (post: SocialPublishingPost): Exclude<SocialPublishingPostListStatus, 'all'> =>
  hasSocialPublishingPublication(post) ? 'published' : post.status;

const buildSearchableText = (post: SocialPublishingPost): string =>
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
    post.publishingProvider,
    post.publishedPostId,
    post.publishedUrl,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const buildStatusCounts = (
  posts: SocialPublishingPost[]
): Record<Exclude<SocialPublishingPostListStatus, 'all'>, number> => ({
  draft: posts.filter((post) => resolveListStatus(post) === 'draft').length,
  scheduled: posts.filter((post) => resolveListStatus(post) === 'scheduled').length,
  published: posts.filter((post) => resolveListStatus(post) === 'published').length,
  failed: posts.filter((post) => resolveListStatus(post) === 'failed').length,
});

const filterPostsForAdminList = (
  posts: SocialPublishingPost[],
  options?: SocialPublishingPostsPageOptions
): SocialPublishingPostsPageResult => {
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

const buildMongoSearchMatch = (search: string | null | undefined): Filter<SocialPublishingPostDoc> => {
  const normalizedSearch = search?.trim();
  if (normalizedSearch == null || normalizedSearch.length === 0) {
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
      { publishingProvider: { $regex: regex } },
      { publishedPostId: { $regex: regex } },
      { publishedUrl: { $regex: regex } },
    ],
  };
};

const buildMongoStatusMatch = (
  status: SocialPublishingPostListStatus
): Filter<SocialPublishingPostDoc> => {
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
): Promise<SocialPublishingPostDoc | null> => {
  const direct = await collection.findOne({ id: normalizedId });
  if (direct) return direct;
  const regex = buildLooseIdRegex(normalizedId);
  return collection.findOne({ id: { $regex: regex } });
};

export async function listSocialPublishingPosts(): Promise<SocialPublishingPost[]> {
  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
    const store = await readLocalStore();
    return [...store.posts].sort((left, right) => {
      const leftTs = left.updatedAt != null ? Date.parse(left.updatedAt) : 0;
      const rightTs = right.updatedAt != null ? Date.parse(right.updatedAt) : 0;
      return rightTs - leftTs;
    });
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection.find({}).sort({ updatedAt: -1 }).toArray();
  return docs.map(toSocialPost);
}

export async function listSocialPublishingPostsPage(
  options?: SocialPublishingPostsPageOptions
): Promise<SocialPublishingPostsPageResult> {
  const page = normalizePageNumber(options?.page, 1);
  const pageSize = normalizePageNumber(options?.pageSize, 8);
  const normalizedStatus = normalizeSocialStatus(options?.status);

  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
    const store = await readLocalStore();
    const posts = [...store.posts].sort((left, right) => {
      const leftTs = left.updatedAt != null ? Date.parse(left.updatedAt) : 0;
      const rightTs = right.updatedAt != null ? Date.parse(right.updatedAt) : 0;
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
      posts?: SocialPublishingPostDoc[];
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
                        { $ne: ['$publishedPostId', null] },
                        { $ne: ['$publishedUrl', null] },
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

export async function listPublishedSocialPublishingPosts(limit = 8): Promise<SocialPublishingPost[]> {
  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
    const store = await readLocalStore();
    return [...store.posts]
      .filter((post) => hasSocialPublishingPublication(post))
      .sort((left, right) => {
        const leftTs = left.publishedAt != null ? Date.parse(left.publishedAt) : 0;
        const rightTs = right.publishedAt != null ? Date.parse(right.publishedAt) : 0;
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

export async function listDueScheduledSocialPublishingPosts(
  now: Date = new Date()
): Promise<SocialPublishingPost[]> {
  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
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

export async function getSocialPublishingPostById(id: string): Promise<SocialPublishingPost | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;

  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
    const store = await readLocalStore();
    return store.posts.find((post) => post.id === normalizedId) ?? null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const doc = await findPostDocById(collection, normalizedId);
  return doc ? toSocialPost(doc) : null;
}

export async function upsertSocialPublishingPost(post: SocialPublishingPost): Promise<SocialPublishingPost> {
  const normalized = normalizeSocialPublishingPost(post);
  const now = new Date();

  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
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

export async function updateSocialPublishingPost(
  id: string,
  updates: UpdateSocialPublishingPostInput
): Promise<SocialPublishingPost | null> {
  const existing = await getSocialPublishingPostById(id);
  if (!existing) return null;
  const merged = normalizeSocialPublishingPost({
    ...existing,
    ...updates,
    id: existing.id,
  });
  return upsertSocialPublishingPost(merged);
}

export async function deleteSocialPublishingPost(id: string): Promise<SocialPublishingPost | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;

  if (process.env['MONGODB_URI'] == null || process.env['MONGODB_URI'].length === 0) {
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
