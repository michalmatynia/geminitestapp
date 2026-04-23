import { badRequestError } from '@/shared/errors/app-error';
import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, _normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  if (ctx.document === null || ctx.document === undefined || typeof ctx.document !== 'object' || Array.isArray(ctx.document)) {
    throw badRequestError('Document is required');
  }
  const result = await ctx.collectionRef.insertOne(ctx.document as Record<string, unknown>);
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { insertedId: result.insertedId, insertedCount: 1 });
};
