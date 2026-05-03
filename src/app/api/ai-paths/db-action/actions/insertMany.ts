import { badRequestError } from '@/shared/errors/app-error';
import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, _normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  let docs: Record<string, unknown>[] | null = null;
  if (Array.isArray(ctx.documents)) {
    docs = ctx.documents as Record<string, unknown>[];
  } else if (Array.isArray(ctx.document)) {
    docs = ctx.document as Record<string, unknown>[];
  }

  if (docs === null || docs.length === 0) throw badRequestError('Documents array is required');
  const result = await ctx.collectionRef.insertMany(docs);
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { insertedIds: result.insertedIds, insertedCount: result.insertedCount });
};
