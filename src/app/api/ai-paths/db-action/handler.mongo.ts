import { type Collection, ObjectId, type Sort } from 'mongodb';
import {
  coerceQuery,
  expandFilter,
  normalizeObjectId,
  normalizeUpdateDoc,
  normalizeReplaceDoc,
  extractFlatUpdates,
  shouldAutoStampUpdatedAt,
  applyUpdatedAtToUpdateDoc,
  applyUpdatedAtToReplacement,
  withProviderPayload,
  ProviderResolutionError,
  looksLikeObjectId,
  type DbProvider,
  type DbActionRequestedProvider,
} from './handler.helpers';
import { badRequestError } from '@/shared/errors/app-error';
import { getUnsupportedProviderActionMessage } from '@/shared/lib/ai-paths/core/utils/provider-actions';

export type MongoActionContext = {
  provider: DbProvider;
  requestedProvider: DbActionRequestedProvider;
  collectionRef: Collection;
  resolvedCollection: string;
  action: string;
  filter: unknown;
  idType?: string;
  projection?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  limit: number;
  distinctField?: string;
  pipeline?: unknown[];
  document?: unknown;
  documents?: unknown;
  update?: unknown;
  upsert?: boolean;
  returnDocument: 'before' | 'after';
};

type ActionHandler = (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>) => Promise<Record<string, unknown>>;

export const handlers: Record<string, ActionHandler> = {
  find: async (ctx, normalizedFilter) => {
    const cursor = ctx.collectionRef.find(normalizedFilter, ctx.projection ? { projection: ctx.projection } : undefined);
    if (ctx.sort !== undefined) cursor.sort(ctx.sort as Sort);
    const [items, count] = await Promise.all([
      cursor.limit(ctx.limit).toArray(),
      ctx.collectionRef.countDocuments(normalizedFilter),
    ]);
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { items, count });
  },

  findOne: async (ctx, normalizedFilter) => {
    let item = await ctx.collectionRef.findOne(
      normalizedFilter,
      ctx.projection ? { projection: ctx.projection } : undefined
    );
    if (
      item === null &&
      ctx.idType !== 'objectId' &&
      typeof normalizedFilter['_id'] === 'string' &&
      looksLikeObjectId(normalizedFilter['_id'])
    ) {
      const retryFilter = { ...normalizedFilter, _id: new ObjectId(normalizedFilter['_id']) };
      item = await ctx.collectionRef.findOne(retryFilter, ctx.projection ? { projection: ctx.projection } : undefined);
    }
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { item, count: item !== null ? 1 : 0 });
  },

  countDocuments: async (ctx, normalizedFilter) => {
    const count = await ctx.collectionRef.countDocuments(normalizedFilter);
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { count });
  },

  distinct: async (ctx, normalizedFilter) => {
    const field = ctx.distinctField?.trim() ?? '';
    if (field === '') throw badRequestError('distinctField is required');
    const values = await ctx.collectionRef.distinct(field, normalizedFilter);
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { values, count: values.length });
  },

  aggregate: async (ctx) => {
    if (ctx.pipeline === undefined || ctx.pipeline.length === 0) throw badRequestError('Aggregation pipeline is required');
    const items = await ctx.collectionRef.aggregate(ctx.pipeline).toArray();
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { items, count: items.length });
  },

  insertOne: async (ctx) => {
    if (ctx.document === null || ctx.document === undefined || typeof ctx.document !== 'object' || Array.isArray(ctx.document)) {
      throw badRequestError('Document is required');
    }
    const result = await ctx.collectionRef.insertOne(ctx.document as Record<string, unknown>);
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { insertedId: result.insertedId, insertedCount: 1 });
  },

  insertMany: async (ctx) => {
    let docs: Record<string, unknown>[] | null = null;
    if (Array.isArray(ctx.documents)) {
      docs = ctx.documents as Record<string, unknown>[];
    } else if (Array.isArray(ctx.document)) {
      docs = ctx.document as Record<string, unknown>[];
    }

    if (docs === null || docs.length === 0) throw badRequestError('Documents array is required');
    const result = await ctx.collectionRef.insertMany(docs);
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { insertedIds: result.insertedIds, insertedCount: result.insertedCount });
  },

  replaceOne: async (ctx, normalizedFilter) => {
    const flatUpdates = extractFlatUpdates(ctx.update);
    const replacement = normalizeReplaceDoc(ctx.update);
    if (replacement === null || flatUpdates === null) throw badRequestError('Replacement document is required');
    const now = new Date();
    const nextReplacement = shouldAutoStampUpdatedAt(ctx.resolvedCollection) ? applyUpdatedAtToReplacement(replacement, now) : replacement;
    const result = await ctx.collectionRef.replaceOne(normalizedFilter, nextReplacement, { upsert: Boolean(ctx.upsert) });
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId ?? null });
  },

  findOneAndUpdate: async (ctx, normalizedFilter) => {
    const updateDoc = normalizeUpdateDoc(ctx.update);
    if (updateDoc === null) throw badRequestError('Update document is required');
    const now = new Date();
    const nextUpdateDoc = shouldAutoStampUpdatedAt(ctx.resolvedCollection) ? applyUpdatedAtToUpdateDoc(updateDoc, now) : updateDoc;
    const result = await ctx.collectionRef.findOneAndUpdate(normalizedFilter, nextUpdateDoc as Record<string, unknown>, { returnDocument: ctx.returnDocument, upsert: Boolean(ctx.upsert), includeResultMetadata: true });
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { value: result.value ?? null, ok: result.ok });
  },

  updateOne: async (ctx, normalizedFilter) => {
    const updateDoc = normalizeUpdateDoc(ctx.update);
    if (updateDoc === null) throw badRequestError('Update document is required');
    const result = await ctx.collectionRef.updateOne(
      normalizedFilter,
      applyTimestamp(ctx, updateDoc) as Record<string, unknown>,
      { upsert: Boolean(ctx.upsert) }
    );
    return withProviderPayload(ctx.provider, ctx.requestedProvider, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId ?? null,
    });
  },

  updateMany: async (ctx, normalizedFilter) => {
    const updateDoc = normalizeUpdateDoc(ctx.update);
    if (updateDoc === null) throw badRequestError('Update document is required');
    const result = await ctx.collectionRef.updateMany(
      normalizedFilter,
      applyTimestamp(ctx, updateDoc) as Record<string, unknown>,
      { upsert: Boolean(ctx.upsert) }
    );
    return withProviderPayload(ctx.provider, ctx.requestedProvider, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId ?? null,
    });
  },

  deleteOne: async (ctx, normalizedFilter) => {
    const result = await ctx.collectionRef.deleteOne(normalizedFilter as Record<string, unknown>);
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { deletedCount: result.deletedCount });
  },

  deleteMany: async (ctx, normalizedFilter) => {
    const result = await ctx.collectionRef.deleteMany(normalizedFilter as Record<string, unknown>);
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { deletedCount: result.deletedCount });
  },


  findOneAndDelete: async (ctx, normalizedFilter) => {
    const result = await ctx.collectionRef.findOneAndDelete(normalizedFilter, { includeResultMetadata: true });
    return withProviderPayload(ctx.provider, ctx.requestedProvider, { value: result.value ?? null, ok: result.ok });
  },
};


const REQUIRED_FILTER_ACTIONS = new Set([
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
]);

export const runMongoAction = async (ctx: MongoActionContext, handler: ActionHandler): Promise<Record<string, unknown>> => {
  const providerActionError = getUnsupportedProviderActionMessage(ctx.provider, ctx.action);
  if (providerActionError !== null) {
    throw new ProviderResolutionError('action_not_supported', ctx.provider, providerActionError);
  }

  const where = coerceQuery(ctx.filter);
  if (REQUIRED_FILTER_ACTIONS.has(ctx.action) && Object.keys(where).length === 0) {
    throw badRequestError('Filter is required for this action');
  }

  const normalizedFilter = expandFilter(normalizeObjectId(where, ctx.idType), ctx.resolvedCollection);
  return await handler(ctx, normalizedFilter);
};
