import { ObjectId } from 'mongodb';
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

const updateSchema = z.object({
  provider: z.enum(['auto', 'mongodb', 'prisma']).optional(),
  collection: z.string().trim().min(1),
  collectionMap: z.record(z.string(), z.string()).optional(),
  query: z.record(z.string(), z['unknown']()).optional(),
  updates: z.record(z.string(), z['unknown']()).optional(),
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
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
};

type DbProvider = 'mongodb' | 'prisma';

type ProviderResolutionErrorCode = 'provider_not_configured' | 'collection_not_available';

class ProviderResolutionError extends Error {
  public readonly code: ProviderResolutionErrorCode;
  public readonly provider: DbProvider;

  constructor(code: ProviderResolutionErrorCode, provider: DbProvider, message: string) {
    super(message);
    this.name = 'ProviderResolutionError';
    this.code = code;
    this.provider = provider;
  }
}

const isProviderResolutionError = (error: unknown): error is ProviderResolutionError =>
  error instanceof ProviderResolutionError;

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

const normalizeObjectId = (
  query: Record<string, unknown>,
  idType?: string
): Record<string, unknown> => {
  if (idType !== 'objectId') return query;
  const next = { ...query };
  if (typeof next['_id'] === 'string' && looksLikeObjectId(next['_id'])) {
    next['_id'] = new ObjectId(next['_id']);
  }
  return next;
};

const getPrismaDelegate = (collection: string): PrismaDelegate | null => {
  const delegateName = PRISMA_COLLECTION_DELEGATES[collection];
  if (!delegateName) return null;
  const delegate = (prisma as unknown as Record<string, PrismaDelegate>)[delegateName];
  return delegate ?? null;
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'db-update');
  }
  const parsed = await parseJsonBody(req, updateSchema, {
    logPrefix: 'ai-paths.db-update',
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const {
    provider: requestedProvider,
    collection,
    collectionMap,
    query,
    updates,
    single = true,
    idType,
  } = data;
  const requestedCollection = collection.trim();
  const explicitCollectionMap = normalizeAiPathsCollectionMap(collectionMap);
  const collectionResolution = resolveAiPathsCollectionName(
    requestedCollection,
    explicitCollectionMap
  );
  const resolvedCollection = collectionResolution.collection;

  if (!isCollectionAllowed(resolvedCollection)) {
    throw internalError('Collection not allowlisted');
  }

  const normalizedUpdates = updates && typeof updates === 'object' ? updates : {};
  if (Object.keys(normalizedUpdates).length === 0) {
    throw badRequestError('No updates provided');
  }

  const runUpdateWithProvider = async (provider: DbProvider): Promise<Record<string, unknown>> => {
    if (provider === 'prisma') {
      if (!process.env['DATABASE_URL']) {
        throw new ProviderResolutionError(
          'provider_not_configured',
          provider,
          'Prisma is not configured'
        );
      }
      const prismaCollection = resolvePrismaCollectionKey(resolvedCollection);
      const delegate = prismaCollection ? getPrismaDelegate(prismaCollection) : null;
      if (!delegate) {
        throw new ProviderResolutionError(
          'collection_not_available',
          provider,
          'Collection not available for Prisma'
        );
      }
      const where = coerceQuery(query);
      if (!where || Object.keys(where).length === 0) {
        throw badRequestError('Update requires a query filter');
      }
      const result = await delegate.updateMany({
        where,
        data: normalizedUpdates,
      });
      return {
        ok: true,
        collection: resolvedCollection,
        requestedCollection,
        ...(collectionResolution.mappedFrom
          ? { collectionMappedFrom: collectionResolution.mappedFrom }
          : {}),
        single,
        matchedCount: result.count,
        modifiedCount: result.count,
        provider,
        requestedProvider: requestedProvider ?? 'auto',
        resolvedProvider: provider,
      };
    }

    if (!process.env['MONGODB_URI']) {
      throw new ProviderResolutionError(
        'provider_not_configured',
        provider,
        'MongoDB is not configured'
      );
    }

    const filter = normalizeObjectId(coerceQuery(query), idType);
    if (!filter || Object.keys(filter).length === 0) {
      throw badRequestError('Update requires a query filter');
    }

    const mongo = await getMongoDb();
    const collectionRef = mongo.collection(resolvedCollection);
    const result = single
      ? await collectionRef.updateOne(filter, { $set: normalizedUpdates })
      : await collectionRef.updateMany(filter, { $set: normalizedUpdates });

    return {
      ok: true,
      collection: resolvedCollection,
      requestedCollection,
      ...(collectionResolution.mappedFrom
        ? { collectionMappedFrom: collectionResolution.mappedFrom }
        : {}),
      single,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      provider,
      requestedProvider: requestedProvider ?? 'auto',
      resolvedProvider: provider,
    };
  };

  const primaryProvider = await resolveCollectionProviderForRequest(
    resolvedCollection,
    requestedProvider
  );
  const canAttemptFallback = requestedProvider !== 'mongodb' && requestedProvider !== 'prisma';

  try {
    const result = await runUpdateWithProvider(primaryProvider);
    return NextResponse.json(result);
  } catch (primaryError) {
    if (!isProviderResolutionError(primaryError)) {
      throw primaryError;
    }
    if (!canAttemptFallback) {
      if (primaryError.code === 'provider_not_configured') {
        throw internalError(primaryError.message);
      }
      throw badRequestError(primaryError.message);
    }

    const fallbackProvider: DbProvider = primaryProvider === 'prisma' ? 'mongodb' : 'prisma';

    try {
      const fallbackResult = await runUpdateWithProvider(fallbackProvider);
      return NextResponse.json({
        ...fallbackResult,
        fallback: {
          used: true,
          requestedProvider: requestedProvider ?? 'auto',
          attemptedProvider: primaryProvider,
          resolvedProvider: fallbackProvider,
          reason: primaryError.message,
          code: primaryError.code,
        },
      });
    } catch {
      throw primaryError;
    }
  }
}
