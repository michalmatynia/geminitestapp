import { ObjectId, Sort } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  normalizeAiPathsCollectionMap,
  resolveAiPathsCollectionName,
} from '@/shared/lib/ai-paths/core/utils/collection-mapping';
import {
  enforceAiPathsActionRateLimit,
  isCollectionAllowed,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { resolveCollectionProviderForRequest } from '@/shared/lib/db/collection-provider-map';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

const querySchema = z.object({
  provider: z.enum(['auto', 'mongodb', 'prisma']).optional(),
  collection: z.string().trim().min(1),
  collectionMap: z.record(z.string(), z.string()).optional(),
  query: z.record(z.string(), z['unknown']()).optional(),
  projection: z.record(z.string(), z['unknown']()).optional(),
  sort: z
    .record(
      z.string(),
      z.union([z.number(), z.literal('asc'), z.literal('desc')]),
    )
    .optional(),
  limit: z.number().int().min(1).max(200).optional(),
  single: z.boolean().optional(),
  idType: z.enum(['string', 'objectId']).optional(),
});

const PRISMA_COLLECTION_DELEGATES: Record<string, string> = {
  products: 'product',
  product_drafts: 'productDraft',
  product_categories: 'productCategory',
  product_parameters: 'productParameter',
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

const normalizeCollectionKey = (value: string): string =>
  value.trim().toLowerCase();

const resolvePrismaCollectionKey = (collection: string): string | null => {
  if (!collection) return null;
  const trimmed = collection.trim();
  if (!trimmed) return null;
  if (PRISMA_COLLECTION_DELEGATES[trimmed]) return trimmed;
  const normalized = normalizeCollectionKey(trimmed);
  return PRISMA_COLLECTION_DELEGATES[normalized] ? normalized : null;
};

const looksLikeObjectId = (value: string): boolean =>
  /^[0-9a-fA-F]{24}$/.test(value);

const normalizeObjectId = (
  query: Record<string, unknown>,
  idType?: string,
): Record<string, unknown> => {
  if (idType !== 'objectId') return query;
  const next = { ...query };
  if (typeof next['_id'] === 'string' && looksLikeObjectId(next['_id'])) {
    next['_id'] = new ObjectId(next['_id']);
  }
  return next;
};

const canRetryWithObjectId = (
  query: Record<string, unknown>,
  idType?: string,
): boolean =>
  idType !== 'objectId' &&
  typeof query['_id'] === 'string' &&
  looksLikeObjectId(query['_id']);

const getPrismaDelegate = (collection: string): PrismaDelegate | null => {
  const delegateName = PRISMA_COLLECTION_DELEGATES[collection];
  if (!delegateName) return null;
  const delegate = (prisma as unknown as Record<string, PrismaDelegate>)[
    delegateName
  ];
  return delegate ?? null;
};

const normalizePrismaSelect = (
  projection?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (
    !projection ||
    typeof projection !== 'object' ||
    Array.isArray(projection)
  )
    return undefined;
  const hasNested = Object.values(projection).some(
    (value: unknown) => value !== null && typeof value === 'object',
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
  sort?: Record<string, unknown>,
): Record<string, 'asc' | 'desc'> | undefined => {
  if (!sort || typeof sort !== 'object' || Array.isArray(sort))
    return undefined;
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

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isScalarValue = (value: unknown): boolean =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const isSimpleInValue = (value: unknown): boolean => {
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== '$in') return false;
  const list = value['$in'];
  return (
    Array.isArray(list) &&
    list.length > 0 &&
    list.length <= 200 &&
    list.every(isScalarValue)
  );
};

const isSafeSimpleFilter = (filter: Record<string, unknown>): boolean => {
  const entries = Object.entries(filter);
  if (entries.length === 0) return true;
  return entries.every(([key, value]) => {
    if (!key || key.startsWith('$')) return false;
    return isScalarValue(value) || isSimpleInValue(value);
  });
};

const isSafeSimpleProjection = (
  projection?: Record<string, unknown>,
): boolean => {
  if (!projection || !isPlainRecord(projection)) return true;
  return Object.values(projection).every(
    (value: unknown) =>
      value === 1 || value === 0 || value === true || value === false,
  );
};

const isSafeSimpleSort = (sort?: Record<string, unknown>): boolean => {
  if (!sort || !isPlainRecord(sort)) return true;
  return Object.values(sort).every(
    (value: unknown) =>
      value === 1 || value === -1 || value === 'asc' || value === 'desc',
  );
};

const isSafeAutoFallbackCandidate = (input: {
  requestedProvider?: 'auto' | 'mongodb' | 'prisma';
  query: Record<string, unknown>;
  projection?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  idType?: 'string' | 'objectId';
}): boolean => {
  if (
    input.requestedProvider === 'mongodb' ||
    input.requestedProvider === 'prisma'
  ) {
    return false;
  }
  if (input.idType === 'objectId') {
    return false;
  }
  return (
    isSafeSimpleFilter(input.query) &&
    isSafeSimpleProjection(input.projection) &&
    isSafeSimpleSort(input.sort)
  );
};

type QueryResponsePayload =
  | {
      item: Record<string, unknown> | null;
      count: number;
      provider: 'mongodb' | 'prisma';
      fallback?: Record<string, unknown>;
    }
  | {
      items: Record<string, unknown>[];
      count: number;
      provider: 'mongodb' | 'prisma';
      fallback?: Record<string, unknown>;
    };

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'db-query');
  }
  const parsed = await parseJsonBody(req, querySchema, {
    logPrefix: 'ai-paths.db-query',
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const {
    provider: requestedProvider,
    collection,
    collectionMap,
    query,
    projection,
    sort,
    limit = 20,
    single = false,
    idType,
  } = data;
  const requestedCollection = collection.trim();
  const explicitCollectionMap = normalizeAiPathsCollectionMap(collectionMap);
  const collectionResolution = resolveAiPathsCollectionName(
    requestedCollection,
    explicitCollectionMap,
  );
  const resolvedCollection = collectionResolution.collection;

  if (!isCollectionAllowed(resolvedCollection)) {
    throw internalError('Collection not allowlisted');
  }
  const rawFilter = coerceQuery(query);
  const requestSort = sort as Record<string, unknown> | undefined;
  const requestProjection = projection;
  const canAttemptSafeAutoFallback = isSafeAutoFallbackCandidate({
    ...(requestedProvider !== undefined ? { requestedProvider } : {}),
    query: rawFilter,
    ...(requestProjection !== undefined
      ? { projection: requestProjection }
      : {}),
    ...(requestSort !== undefined ? { sort: requestSort } : {}),
    ...(idType !== undefined ? { idType } : {}),
  });

  const runQueryWithProvider = async (
    provider: 'mongodb' | 'prisma',
  ): Promise<QueryResponsePayload> => {
    if (provider === 'prisma') {
      if (!process.env['DATABASE_URL']) {
        throw internalError('Prisma is not configured');
      }
      const prismaCollection = resolvePrismaCollectionKey(resolvedCollection);
      const delegate = prismaCollection
        ? getPrismaDelegate(prismaCollection)
        : null;
      if (!delegate) {
        throw badRequestError('Collection not available for Prisma');
      }
      const where = rawFilter;
      const select = normalizePrismaSelect(requestProjection);
      const orderBy = normalizePrismaOrderBy(requestSort);
      if (single) {
        const item = delegate.findFirst
          ? await delegate.findFirst({
            where,
            ...(select ? { select } : {}),
            ...(orderBy ? { orderBy } : {}),
          })
          : ((
            await delegate.findMany({
              where,
              ...(select ? { select } : {}),
              ...(orderBy ? { orderBy } : {}),
              take: 1,
            })
          )[0] ?? null);
        return {
          item: (item as Record<string, unknown> | null) ?? null,
          count: item ? 1 : 0,
          provider: 'prisma',
        };
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
      return {
        items: (items as Record<string, unknown>[]) ?? [],
        count,
        provider: 'prisma',
      };
    }

    if (!process.env['MONGODB_URI']) {
      throw internalError('MongoDB is not configured');
    }
    const mongo = await getMongoDb();
    const collectionRef = mongo.collection(resolvedCollection);
    const filter = normalizeObjectId(rawFilter, idType);

    const findOneWithFilter = async (
      candidateFilter: Record<string, unknown>,
    ): Promise<Record<string, unknown> | null> =>
      collectionRef.findOne(candidateFilter, {
        ...(requestProjection ? { projection: requestProjection } : {}),
        ...(requestSort ? { sort: requestSort as Sort } : {}),
      }) as Promise<Record<string, unknown> | null>;

    const findManyWithFilter = async (
      candidateFilter: Record<string, unknown>,
    ): Promise<{ items: Record<string, unknown>[]; count: number }> => {
      const cursor = collectionRef.find(
        candidateFilter,
        requestProjection ? { projection: requestProjection } : undefined,
      );
      if (requestSort) {
        cursor.sort(requestSort as Sort);
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
        item = await findOneWithFilter(
          normalizeObjectId(rawFilter, 'objectId'),
        );
      }
      return {
        item,
        count: item ? 1 : 0,
        provider: 'mongodb',
      };
    }

    let { items, count } = await findManyWithFilter(filter);
    if (count === 0 && canRetryWithObjectId(rawFilter, idType)) {
      ({ items, count } = await findManyWithFilter(
        normalizeObjectId(rawFilter, 'objectId'),
      ));
    }
    return {
      items,
      count,
      provider: 'mongodb',
    };
  };

  const primaryProvider = await resolveCollectionProviderForRequest(
    resolvedCollection,
    requestedProvider,
  );

  try {
    const result = await runQueryWithProvider(primaryProvider);
    return NextResponse.json(result);
  } catch (primaryError) {
    if (!canAttemptSafeAutoFallback) {
      throw primaryError;
    }
    const fallbackProvider =
      primaryProvider === 'prisma' ? 'mongodb' : 'prisma';
    try {
      const fallbackResult = await runQueryWithProvider(fallbackProvider);
      return NextResponse.json({
        ...fallbackResult,
        fallback: {
          used: true,
          requestedProvider: requestedProvider ?? 'auto',
          attemptedProvider: primaryProvider,
          resolvedProvider: fallbackProvider,
          reason:
            primaryError instanceof Error
              ? primaryError.message
              : 'Primary provider failed for auto mode',
        },
      } as QueryResponsePayload);
    } catch {
      throw primaryError;
    }
  }
}
