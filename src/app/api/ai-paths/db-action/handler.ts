import { ObjectId, type Sort } from 'mongodb';
import { type NextRequest, NextResponse } from 'next/server';

import {
  enforceAiPathsActionRateLimit,
  isCollectionAllowed,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import { aiPathsDbActionRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import {
  normalizeAiPathsCollectionMap,
  resolveAiPathsCollectionName,
} from '@/shared/lib/ai-paths/core/utils/collection-mapping';
import { getUnsupportedProviderActionMessage } from '@/shared/lib/ai-paths/core/utils/provider-actions';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isObject } from '@/shared/utils/object-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type DbProvider = 'mongodb';
export type DbActionRequestedProvider = 'auto' | DbProvider | undefined;
type ProviderResolutionErrorCode =
  | 'provider_not_configured'
  | 'action_not_supported';

// Collections edited through the internal AI-paths DB action route should receive
// an `updatedAt` stamp whenever a document mutation is applied.
const AUTO_UPDATED_AT_COLLECTIONS = new Set<string>([
  'products',
  'product_drafts',
  'product_categories',
  'product_parameters',
  'product_category_assignments',
  'product_tags',
  'product_tag_assignments',
  'catalogs',
  'image_files',
  'product_listings',
  'product_ai_jobs',
  'product_producer_assignments',
  'integrations',
  'integration_connections',
  'settings',
  'users',
  'user_preferences',
  'languages',
  'system_logs',
  'notes',
  'tags',
  'categories',
  'notebooks',
  'notefiles',
  'themes',
  'chatbot_sessions',
  'auth_security_attempts',
  'auth_security_profiles',
  'auth_login_challenges',
]);

export class ProviderResolutionError extends Error {
  public readonly code: ProviderResolutionErrorCode;
  public readonly provider: DbProvider;

  constructor(code: ProviderResolutionErrorCode, provider: DbProvider, message: string) {
    super(message);
    this.name = 'ProviderResolutionError';
    this.code = code;
    this.provider = provider;
  }
}

export const isProviderResolutionError = (error: unknown): error is ProviderResolutionError =>
  error instanceof ProviderResolutionError;

export const withProviderPayload = (
  provider: DbProvider,
  requestedProvider: DbActionRequestedProvider,
  payload: Record<string, unknown>
): Record<string, unknown> => ({
  ...payload,
  requestedProvider: requestedProvider ?? 'auto',
  resolvedProvider: provider,
});

export const expandFilter = (
  filter: Record<string, unknown>,
  collection: string
): Record<string, unknown> => {
  const normalizedCollection = collection.trim().toLowerCase();
  if (normalizedCollection !== 'products' && normalizedCollection !== 'product_drafts') {
    return filter;
  }

  const keys = Object.keys(filter);
  if (keys.length === 1 && keys[0] === 'id' && typeof filter['id'] === 'string') {
    const id = filter['id'];
    return {
      $or: [{ id }, { _id: id }],
    };
  }

  return filter;
};

export const coerceQuery = (value: unknown): Record<string, unknown> => {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    if (value.length === 0) return {};
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => { /* ignore */ });
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const looksLikeObjectId = (value: string): boolean => /^[0-9a-fA-F]{24}$/.test(value);

export const normalizeObjectId = (
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

export const normalizeUpdateDoc = (update: unknown): Record<string, unknown> | unknown[] | null => {
  if (Array.isArray(update)) return update as unknown[];
  if (update !== null && typeof update === 'object') {
    const keys = Object.keys(update as Record<string, unknown>);
    if (keys.some((key: string) => key.startsWith('$'))) {
      return update as Record<string, unknown>;
    }
    return { $set: update };
  }
  return null;
};

export const shouldAutoStampUpdatedAt = (collection: string): boolean =>
  AUTO_UPDATED_AT_COLLECTIONS.has(collection.trim().toLowerCase());

export const applyUpdatedAtToUpdateDoc = (
  update: Record<string, unknown> | unknown[],
  now: Date
): Record<string, unknown> | unknown[] => {
  if (Array.isArray(update)) {
    return [...update, { $set: { updatedAt: now } }];
  }

  const hasOperator = Object.keys(update).some((key: string): boolean => key.startsWith('$'));
  if (!hasOperator) {
    return { ...update, updatedAt: now };
  }

  const nextUpdate = { ...update };
  const existingSetRaw = nextUpdate['$set'];
  const existingSet =
    existingSetRaw !== undefined && existingSetRaw !== null && typeof existingSetRaw === 'object' && !Array.isArray(existingSetRaw)
      ? (existingSetRaw as Record<string, unknown>)
      : {};

  nextUpdate['$set'] = { ...existingSet, updatedAt: now };
  return nextUpdate;
};

export const applyUpdatedAtToReplacement = (
  replacement: Record<string, unknown>,
  now: Date
): Record<string, unknown> => ({
  ...replacement,
  updatedAt: now,
});

export const normalizeReplaceDoc = (update: unknown): Record<string, unknown> | null => {
  if (update !== null && typeof update === 'object' && !Array.isArray(update)) {
    const keys = Object.keys(update as Record<string, unknown>);
    if (keys.some((key: string) => key.startsWith('$'))) {
      return null;
    }
    return update as Record<string, unknown>;
  }
  return null;
};

export const extractFlatUpdates = (update: unknown): Record<string, unknown> | null => {
  if (update !== null && typeof update === 'object' && !Array.isArray(update)) {
    const keys = Object.keys(update as Record<string, unknown>);
    if (!keys.some((key: string) => key.startsWith('$'))) {
      return update as Record<string, unknown>;
    }
  }
  return null;
};

export async function postAiPathsDbActionHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'db-action');
  }
  const parsed = await parseJsonBody(req, aiPathsDbActionRequestSchema, {
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
    if (providerActionError !== null) {
      throw new ProviderResolutionError('action_not_supported', provider, providerActionError);
    }

    if (process.env['MONGODB_URI'] === undefined || process.env['MONGODB_URI'] === '') {
      throw new ProviderResolutionError(
        'provider_not_configured',
        provider,
        'MongoDB is not configured'
      );
    }

    const mongo = await getMongoDb();
    const collectionRef = mongo.collection(resolvedCollection);
    const where = coerceQuery(filter);
    const normalizedFilter = expandFilter(normalizeObjectId(coerceQuery(filter), idType), resolvedCollection);
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

    if (requireFilter && Object.keys(where).length === 0) {
      throw badRequestError('Filter is required for this action');
    }

    switch (action) {
      case 'find': {
        const cursor = collectionRef.find(normalizedFilter, projection ? { projection } : undefined);
        if (sort) cursor.sort(sort as Sort);
        const [items, count] = await Promise.all([
          cursor.limit(limit).toArray(),
          collectionRef.countDocuments(normalizedFilter),
        ]);
        return withProviderPayload(provider, requestedProvider, { items, count });
      }
      case 'findOne': {
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
        return withProviderPayload(provider, requestedProvider, { item, count: item ? 1 : 0 });
      }
      case 'countDocuments': {
        const count = await collectionRef.countDocuments(normalizedFilter);
        return withProviderPayload(provider, requestedProvider, { count });
      }
      case 'distinct': {
        const field = distinctField?.trim() ?? '';
        if (field.length === 0) throw badRequestError('distinctField is required');
        const values = await collectionRef.distinct(field, normalizedFilter);
        return withProviderPayload(provider, requestedProvider, { values, count: values.length });
      }
      case 'aggregate': {
        if (pipeline === undefined || pipeline.length === 0) throw badRequestError('Aggregation pipeline is required');
        const items = await collectionRef.aggregate(pipeline).toArray();
        return withProviderPayload(provider, requestedProvider, { items, count: items.length });
      }
      case 'insertOne': {
        const doc = isObject(document) ? document : null;
        if (!doc) throw badRequestError('Document is required');
        const result = await collectionRef.insertOne(doc);
        return withProviderPayload(provider, requestedProvider, { insertedId: result.insertedId, insertedCount: 1 });
      }
      case 'insertMany': {
        let docs: Record<string, unknown>[] | null = null;
        if (Array.isArray(documents)) {
          docs = documents;
        } else if (Array.isArray(document)) {
          docs = document as Record<string, unknown>[];
        }

        if (docs === null || docs.length === 0) throw badRequestError('Documents array is required');
        const result = await collectionRef.insertMany(docs);
        return withProviderPayload(provider, requestedProvider, { insertedIds: result.insertedIds, insertedCount: result.insertedCount });
      }
      case 'replaceOne': {
        const flatUpdates = extractFlatUpdates(update);
        const replacement = normalizeReplaceDoc(update);
        if (!replacement || !flatUpdates) throw badRequestError('Replacement document is required');
        const nextReplacement = shouldAutoStampUpdatedAt(resolvedCollection) ? applyUpdatedAtToReplacement(replacement, now) : replacement;
        const result = await collectionRef.replaceOne(normalizedFilter, nextReplacement, { upsert: Boolean(upsert) });
        return withProviderPayload(provider, requestedProvider, { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId ?? null });
      }
      case 'findOneAndUpdate': {
        const updateDoc = normalizeUpdateDoc(update);
        if (!updateDoc) throw badRequestError('Update document is required');
        const nextUpdateDoc = shouldAutoStampUpdatedAt(resolvedCollection) ? applyUpdatedAtToUpdateDoc(updateDoc, now) : updateDoc;
        const result = await collectionRef.findOneAndUpdate(normalizedFilter, nextUpdateDoc, { returnDocument, upsert: Boolean(upsert), includeResultMetadata: true });
        return withProviderPayload(provider, requestedProvider, { value: result.value ?? null, ok: result.ok });
      }
      case 'updateOne':
      case 'updateMany': {
        const updateDoc = normalizeUpdateDoc(update);
        if (!updateDoc) throw badRequestError('Update document is required');
        const nextUpdateDoc = shouldAutoStampUpdatedAt(resolvedCollection) ? applyUpdatedAtToUpdateDoc(updateDoc, now) : updateDoc;
        const result = action === 'updateOne'
          ? await collectionRef.updateOne(normalizedFilter, nextUpdateDoc, { upsert: Boolean(upsert) })
          : await collectionRef.updateMany(normalizedFilter, nextUpdateDoc, { upsert: Boolean(upsert) });
        return withProviderPayload(provider, requestedProvider, { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId ?? null });
      }
      case 'deleteOne':
      case 'deleteMany': {
        const result = action === 'deleteOne' ? await collectionRef.deleteOne(normalizedFilter) : await collectionRef.deleteMany(normalizedFilter);
        return withProviderPayload(provider, requestedProvider, { deletedCount: result.deletedCount });
      }
      case 'findOneAndDelete': {
        const result = await collectionRef.findOneAndDelete(normalizedFilter, { includeResultMetadata: true });
        return withProviderPayload(provider, requestedProvider, { value: result.value ?? null, ok: result.ok });
      }
      default:
        throw badRequestError('Unsupported action');
    }
  };

  const primaryProvider: DbProvider = 'mongodb';

  try {
    const result = await runActionWithProvider(primaryProvider);
    const finalResult = {
      ...result,
      collection: resolvedCollection,
      requestedCollection,
      ...(collectionResolution.mappedFrom !== undefined &&
      collectionResolution.mappedFrom !== null &&
      collectionResolution.mappedFrom !== ''
        ? { collectionMappedFrom: collectionResolution.mappedFrom }
        : {}),
    };
    return NextResponse.json(finalResult);
  } catch (primaryError) {
    ErrorSystem.captureException(primaryError).catch(() => { /* ignore */ });
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

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  return postAiPathsDbActionHandler(req, ctx);
}
