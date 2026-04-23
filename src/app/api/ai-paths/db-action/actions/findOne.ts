import { ObjectId } from 'mongodb';
import { withProviderPayload, looksLikeObjectId } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
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
};
