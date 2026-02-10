export const runtime = 'nodejs';

import { ObjectId, Sort } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiPathsActionRateLimit, isCollectionAllowed, requireAiPathsAccessOrInternal } from '@/features/ai/ai-paths/server';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { resolveCollectionProviderForRequest } from '@/shared/lib/db/collection-provider-map';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const querySchema = z.object({
  provider: z.enum(['auto', 'mongodb', 'prisma']).optional(),
  collection: z.string().trim().min(1),
  query: z.record(z.string(), z['unknown']()).optional(),
  projection: z.record(z.string(), z['unknown']()).optional(),
  sort: z.record(z.string(), z.union([z.number(), z.literal('asc'), z.literal('desc')])).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  single: z.boolean().optional(),
  idType: z.enum(['string', 'objectId']).optional(),
});

const PRISMA_COLLECTION_DELEGATES: Record<string, string> = {
  products: 'product',
  product_drafts: 'productDraft',
  product_categories: 'productCategory',
  product_category_assignments: 'productCategoryAssignment',
  product_tags: 'productTag',
  product_tag_assignments: 'productTagAssignment',
  catalogs: 'catalog',
  image_files: 'imageFile',
  product_listings: 'productListing',
  product_ai_jobs: 'productAiJob',
  product_producer_assignments: 'productProducerAssignment',
  integrations: 'integration',
  integration_connections: 'integrationConnection',
  settings: 'setting',
  users: 'user',
  user_preferences: 'userPreferences',
  languages: 'language',
  system_logs: 'systemLog',
  notes: 'note',
  tags: 'tag',
  categories: 'category',
  notebooks: 'notebook',
  noteFiles: 'noteFile',
  themes: 'theme',
  chatbot_sessions: 'chatbotSession',
  auth_security_attempts: 'authSecurityAttempt',
  auth_security_profiles: 'authSecurityProfile',
  auth_login_challenges: 'authLoginChallenge',
};

type PrismaDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst?: (args: Record<string, unknown>) => Promise<unknown | null>;
  count: (args: Record<string, unknown>) => Promise<number>;
};

const coerceQuery = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

const normalizeCollectionKey = (value: string): string => value.trim().toLowerCase();

const resolvePrismaCollectionKey = (collection: string): string | null => {
  if (!collection) return null;
  const trimmed = collection.trim();
  if (!trimmed) return null;
  if (PRISMA_COLLECTION_DELEGATES[trimmed]) return trimmed;
  const normalized = normalizeCollectionKey(trimmed);
  return PRISMA_COLLECTION_DELEGATES[normalized] ? normalized : null;
};

const looksLikeObjectId = (value: string): boolean => /^[0-9a-fA-F]{24}$/.test(value);

const normalizeObjectId = (query: Record<string, unknown>, idType?: string): Record<string, unknown> => {
  if (idType !== 'objectId') return query;
  const next = { ...query };
  if (typeof next['_id'] === 'string' && looksLikeObjectId(next['_id'])) {
    next['_id'] = new ObjectId(next['_id']);
  }
  return next;
};

const canRetryWithObjectId = (query: Record<string, unknown>, idType?: string): boolean =>
  idType !== 'objectId' &&
  typeof query['_id'] === 'string' &&
  looksLikeObjectId(query['_id']);

const getPrismaDelegate = (collection: string): PrismaDelegate | null => {
  const delegateName = PRISMA_COLLECTION_DELEGATES[collection];
  if (!delegateName) return null;
  const delegate = (prisma as unknown as Record<string, PrismaDelegate>)[delegateName];
  return delegate ?? null;
};

const normalizePrismaSelect = (
  projection?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!projection || typeof projection !== 'object' || Array.isArray(projection)) return undefined;
  const hasNested = Object.values(projection).some(
    (value: unknown) => value !== null && typeof value === 'object'
  );
  if (hasNested) return projection;
  const select: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(projection)) {
    if (value === 0 || value === false || value === null) continue;
    select[key] = true;
  }
  return Object.keys(select).length > 0 ? select : undefined;
};

const normalizePrismaOrderBy = (
  sort?: Record<string, unknown>
): Record<string, 'asc' | 'desc'> | undefined => {
  if (!sort || typeof sort !== 'object' || Array.isArray(sort)) return undefined;
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  for (const [key, value] of Object.entries(sort)) {
    if (value === 'desc' || value === -1) {
      orderBy[key] = 'desc';
    } else if (value === 'asc' || value === 1) {
      orderBy[key] = 'asc';
    }
  }
  return Object.keys(orderBy).length > 0 ? orderBy : undefined;
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    enforceAiPathsActionRateLimit(access, 'db-query');
  }
  const parsed = await parseJsonBody(req, querySchema, {
    logPrefix: 'ai-paths.db-query',
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const {
    provider: requestedProvider,
    collection,
    query,
    projection,
    sort,
    limit = 20,
    single = false,
    idType,
  } = data;

  if (!isCollectionAllowed(collection)) {
    throw internalError('Collection not allowlisted');
  }

  const provider = await resolveCollectionProviderForRequest(
    collection,
    requestedProvider
  );

  if (provider === 'prisma') {
    if (!process.env['DATABASE_URL']) {
      throw internalError('Prisma is not configured');
    }
    const resolvedCollection = resolvePrismaCollectionKey(collection);
    const delegate = resolvedCollection ? getPrismaDelegate(resolvedCollection) : null;
    if (!delegate) {
      throw badRequestError('Collection not available for Prisma');
    }
    const where = coerceQuery(query);
    const select = normalizePrismaSelect(projection);
    const orderBy = normalizePrismaOrderBy(sort);
    if (single) {
      const item = delegate.findFirst
        ? await delegate.findFirst({
          where,
          ...(select ? { select } : {}),
          ...(orderBy ? { orderBy } : {}),
        })
        : (await delegate.findMany({
          where,
          ...(select ? { select } : {}),
          ...(orderBy ? { orderBy } : {}),
          take: 1,
        }))[0] ?? null;
      return NextResponse.json({ item, count: item ? 1 : 0 });
    }
    const [items, count] = await Promise.all([
      delegate.findMany({
        where,
        ...(select ? { select } : {}),
        ...(orderBy ? { orderBy } : {}),
        take: limit,
      }),
      delegate.count({ where }),
    ]);
    return NextResponse.json({ items, count });
  }

  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured');
  }

  const mongo = await getMongoDb();
  const collectionRef = mongo.collection(collection);
  const rawFilter = coerceQuery(query);
  const filter = normalizeObjectId(rawFilter, idType);

  const findOneWithFilter = async (
    candidateFilter: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> =>
    collectionRef.findOne(candidateFilter, {
      ...(projection ? { projection } : {}),
      ...(sort ? { sort: sort as Sort } : {}),
    }) as Promise<Record<string, unknown> | null>;

  const findManyWithFilter = async (
    candidateFilter: Record<string, unknown>
  ): Promise<{ items: Record<string, unknown>[]; count: number }> => {
    const cursor = collectionRef.find(
      candidateFilter,
      projection ? { projection } : undefined
    );
    if (sort) {
      cursor.sort(sort as Sort);
    }
    const [items, count] = await Promise.all([
      cursor.limit(limit).toArray() as Promise<Record<string, unknown>[]>,
      collectionRef.countDocuments(candidateFilter),
    ]);
    return { items, count };
  };

  if (single) {
    let item = await findOneWithFilter(filter);
    if (!item && canRetryWithObjectId(rawFilter, idType)) {
      item = await findOneWithFilter(normalizeObjectId(rawFilter, 'objectId'));
    }
    return NextResponse.json({ item, count: item ? 1 : 0 });
  }

  let { items, count } = await findManyWithFilter(filter);
  if (count === 0 && canRetryWithObjectId(rawFilter, idType)) {
    ({ items, count } = await findManyWithFilter(
      normalizeObjectId(rawFilter, 'objectId')
    ));
  }
  return NextResponse.json({ items, count });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'ai-paths.db-query' });
