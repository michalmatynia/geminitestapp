import { ObjectId, Sort } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  enforceAiPathsActionRateLimit,
  isCollectionAllowed,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import {
  normalizeAiPathsCollectionMap,
  resolveAiPathsCollectionName,
} from '@/shared/lib/ai-paths/core/utils/collection-mapping';
import { getUnsupportedProviderActionMessage } from '@/shared/lib/ai-paths/core/utils/provider-actions';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const actionSchema = z.object({
  provider: z.enum(['auto', 'mongodb']).optional(),
  collection: z.string().trim().min(1),
  collectionMap: z.record(z.string(), z.string()).optional(),
  action: z.enum([
    'insertOne',
    'insertMany',
    'find',
    'findOne',
    'countDocuments',
    'distinct',
    'aggregate',
    'updateOne',
    'updateMany',
    'replaceOne',
    'findOneAndUpdate',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
  ]),
  filter: z.record(z.string(), z['unknown']()).optional(),
  query: z.never().optional(),
  update: z
    .union([z.record(z.string(), z['unknown']()), z.array(z.record(z.string(), z['unknown']()))])
    .optional(),
  updates: z.never().optional(),
  pipeline: z.array(z.record(z.string(), z['unknown']())).optional(),
  document: z.record(z.string(), z['unknown']()).optional(),
  documents: z.array(z.record(z.string(), z['unknown']())).optional(),
  projection: z.record(z.string(), z['unknown']()).optional(),
  sort: z.record(z.string(), z.union([z.number(), z.literal('asc'), z.literal('desc')])).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  idType: z.enum(['string', 'objectId']).optional(),
  distinctField: z.string().optional(),
  upsert: z.boolean().optional(),
  returnDocument: z.enum(['before', 'after']).optional(),
});

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

const normalizeUpdateDoc = (update: unknown): Record<string, unknown> | unknown[] | null => {
  if (Array.isArray(update)) return update as unknown[];
  if (update && typeof update === 'object') {
    const keys = Object.keys(update as Record<string, unknown>);
    if (keys.some((key: string) => key.startsWith('$'))) {
      return update as Record<string, unknown>;
    }
    return { $set: update } as Record<string, unknown>;
  }
  return null;
};

const AUTO_UPDATED_AT_COLLECTIONS = new Set<string>(['products', 'product_drafts']);

const shouldAutoStampUpdatedAt = (collection: string): boolean =>
  AUTO_UPDATED_AT_COLLECTIONS.has(collection.trim().toLowerCase());

const applyUpdatedAtToUpdateDoc = (
  update: Record<string, unknown> | unknown[],
  now: Date
): Record<string, unknown> | unknown[] => {
  if (Array.isArray(update)) {
    return [...update, { $set: { updatedAt: now } }];
  }

  const hasOperator = Object.keys(update).some((key: string): boolean => key.startsWith('$'));
  if (!hasOperator) {
    return {
      ...update,
      updatedAt: now,
    };
  }

  const nextUpdate = { ...update };
  const existingSet =
    nextUpdate['$set'] &&
    typeof nextUpdate['$set'] === 'object' &&
    !Array.isArray(nextUpdate['$set'])
      ? (nextUpdate['$set'] as Record<string, unknown>)
      : {};
  nextUpdate['$set'] = {
    ...existingSet,
    updatedAt: now,
  };
  return nextUpdate;
};

const applyUpdatedAtToReplacement = (
  replacement: Record<string, unknown>,
  now: Date
): Record<string, unknown> => ({
  ...replacement,
  updatedAt: now,
});

const normalizeReplaceDoc = (update: unknown): Record<string, unknown> | null => {
  if (update && typeof update === 'object' && !Array.isArray(update)) {
    const keys = Object.keys(update as Record<string, unknown>);
    if (keys.some((key: string) => key.startsWith('$'))) {
      return null;
    }
    return update as Record<string, unknown>;
  }
  return null;
};

const extractFlatUpdates = (update: unknown): Record<string, unknown> | null => {
  if (update && typeof update === 'object' && !Array.isArray(update)) {
    const keys = Object.keys(update as Record<string, unknown>);
    if (!keys.some((key: string) => key.startsWith('$'))) {
      return update as Record<string, unknown>;
    }
  }
  return null;
};

type DbProvider = 'mongodb';
type DbActionRequestedProvider = 'auto' | DbProvider | undefined;
type ProviderResolutionErrorCode =
  | 'provider_not_configured'
  | 'action_not_supported';

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

const withProviderPayload = (
  provider: DbProvider,
  requestedProvider: DbActionRequestedProvider,
  payload: Record<string, unknown>
): Record<string, unknown> => ({
  ...payload,
  requestedProvider: requestedProvider ?? 'auto',
  resolvedProvider: provider,
});

export async function postAiPathsDbActionHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'db-action');
  }
  const parsed = await parseJsonBody(req, actionSchema, {
    logPrefix: 'ai-paths.db-action',
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const {
    provider: requestedProvider,
    collection,
    collectionMap,
    action,
    filter,
    update,
    pipeline,
    document,
    documents,
    projection,
    sort,
    limit = 20,
    idType,
    distinctField,
    upsert,
    returnDocument = 'after',
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

  const runActionWithProvider = async (provider: DbProvider): Promise<Record<string, unknown>> => {
    const providerActionError = getUnsupportedProviderActionMessage(provider, action);
    if (providerActionError) {
      throw new ProviderResolutionError('action_not_supported', provider, providerActionError);
    }

    if (!process.env['MONGODB_URI']) {
      throw new ProviderResolutionError(
        'provider_not_configured',
        provider,
        'MongoDB is not configured'
      );
    }

    const mongo = await getMongoDb();
    const collectionRef = mongo.collection(resolvedCollection);
    const where = coerceQuery(filter);
    const normalizedFilter = normalizeObjectId(coerceQuery(filter), idType);
    const hasFilter = Object.keys(where).length > 0;
    const now = new Date();

    const requireFilter = [
      'updateOne',
      'updateMany',
      'replaceOne',
      'findOneAndUpdate',
      'deleteOne',
      'deleteMany',
      'findOneAndDelete',
    ].includes(action);

    if (requireFilter && !hasFilter) {
      throw badRequestError('Filter is required for this action');
    }

    if (action === 'find') {
      const cursor = collectionRef.find(normalizedFilter, projection ? { projection } : undefined);
      if (sort) {
        cursor.sort(sort as Sort);
      }
      const [items, count] = await Promise.all([
        cursor.limit(limit).toArray(),
        collectionRef.countDocuments(normalizedFilter),
      ]);
      return withProviderPayload(provider, requestedProvider, { items, count });
    }

    if (action === 'findOne') {
      let item = await collectionRef.findOne(
        normalizedFilter,
        projection ? { projection } : undefined
      );

      if (
        !item &&
        idType !== 'objectId' &&
        typeof normalizedFilter['_id'] === 'string' &&
        looksLikeObjectId(normalizedFilter['_id'])
      ) {
        const retryFilter = { ...normalizedFilter, _id: new ObjectId(normalizedFilter['_id']) };
        item = await collectionRef.findOne(retryFilter, projection ? { projection } : undefined);
      }

      return withProviderPayload(provider, requestedProvider, {
        item,
        count: item ? 1 : 0,
      });
    }

    if (action === 'countDocuments') {
      const count = await collectionRef.countDocuments(normalizedFilter);
      return withProviderPayload(provider, requestedProvider, { count });
    }

    if (action === 'distinct') {
      const field = distinctField?.trim();
      if (!field) {
        throw badRequestError('distinctField is required');
      }
      const values = await collectionRef.distinct(field, normalizedFilter);
      return withProviderPayload(provider, requestedProvider, {
        values,
        count: values.length,
      });
    }

    if (action === 'aggregate') {
      if (!pipeline || pipeline.length === 0) {
        throw badRequestError('Aggregation pipeline is required');
      }
      const items = await collectionRef.aggregate(pipeline).toArray();
      return withProviderPayload(provider, requestedProvider, {
        items,
        count: items.length,
      });
    }

    if (action === 'insertOne') {
      const doc =
        document && typeof document === 'object' && !Array.isArray(document) ? document : null;
      if (!doc) {
        throw badRequestError('Document is required');
      }
      const result = await collectionRef.insertOne(doc);
      return withProviderPayload(provider, requestedProvider, {
        insertedId: result.insertedId,
        insertedCount: 1,
      });
    }

    if (action === 'insertMany') {
      const docs =
        documents && Array.isArray(documents)
          ? documents
          : Array.isArray(document)
            ? (document as unknown[])
            : null;
      if (!docs || docs.length === 0) {
        throw badRequestError('Documents array is required');
      }
      const result = await collectionRef.insertMany(docs as Record<string, unknown>[]);
      return withProviderPayload(provider, requestedProvider, {
        insertedIds: result.insertedIds,
        insertedCount: result.insertedCount,
      });
    }

    if (action === 'replaceOne') {
      const flatUpdates = extractFlatUpdates(update);
      const replacement = normalizeReplaceDoc(update);
      if (!replacement || !flatUpdates) {
        throw badRequestError('Replacement document is required');
      }
      const nextReplacement = shouldAutoStampUpdatedAt(resolvedCollection)
        ? applyUpdatedAtToReplacement(replacement, now)
        : replacement;
      const result = await collectionRef.replaceOne(normalizedFilter, nextReplacement, {
        upsert: !!upsert,
      });
      return withProviderPayload(provider, requestedProvider, {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId ?? null,
      });
    }

    if (action === 'findOneAndUpdate') {
      const updateDoc = normalizeUpdateDoc(update);
      if (!updateDoc) {
        throw badRequestError('Update document is required');
      }
      const nextUpdateDoc = shouldAutoStampUpdatedAt(resolvedCollection)
        ? applyUpdatedAtToUpdateDoc(updateDoc, now)
        : updateDoc;
      const result = await collectionRef.findOneAndUpdate(normalizedFilter, nextUpdateDoc, {
        returnDocument,
        upsert: !!upsert,
        includeResultMetadata: true,
      });
      return withProviderPayload(provider, requestedProvider, {
        value: result.value ?? null,
        ok: result.ok ?? 1,
      });
    }

    if (action === 'updateOne' || action === 'updateMany') {
      const updateDoc = normalizeUpdateDoc(update);
      if (!updateDoc) {
        throw badRequestError('Update document is required');
      }
      const nextUpdateDoc = shouldAutoStampUpdatedAt(resolvedCollection)
        ? applyUpdatedAtToUpdateDoc(updateDoc, now)
        : updateDoc;
      const result =
        action === 'updateOne'
          ? await collectionRef.updateOne(normalizedFilter, nextUpdateDoc, {
            upsert: !!upsert,
          })
          : await collectionRef.updateMany(normalizedFilter, nextUpdateDoc, {
            upsert: !!upsert,
          });
      return withProviderPayload(provider, requestedProvider, {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId ?? null,
      });
    }

    if (action === 'deleteOne' || action === 'deleteMany') {
      const result =
        action === 'deleteOne'
          ? await collectionRef.deleteOne(normalizedFilter)
          : await collectionRef.deleteMany(normalizedFilter);
      return withProviderPayload(provider, requestedProvider, {
        deletedCount: result.deletedCount ?? 0,
      });
    }

    if (action === 'findOneAndDelete') {
      const result = await collectionRef.findOneAndDelete(normalizedFilter, {
        includeResultMetadata: true,
      });
      return withProviderPayload(provider, requestedProvider, {
        value: result.value ?? null,
        ok: result.ok ?? 1,
      });
    }

    throw badRequestError('Unsupported action');
  };

  const primaryProvider: DbProvider = 'mongodb';

  try {
    const result = await runActionWithProvider(primaryProvider);
    const finalResult = {
      ...result,
      collection: resolvedCollection,
      requestedCollection,
      ...(collectionResolution.mappedFrom
        ? { collectionMappedFrom: collectionResolution.mappedFrom }
        : {}),
    };
    return NextResponse.json(finalResult);
  } catch (primaryError) {
    const isResolutionError = isProviderResolutionError(primaryError);
    if (!isResolutionError) {
      throw primaryError;
    }
    if (primaryError.code === 'provider_not_configured') {
      throw internalError(primaryError.message);
    }
    throw badRequestError(primaryError.message);
  }
}

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  return postAiPathsDbActionHandler(req, ctx);
}
