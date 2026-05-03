import { type Sort } from 'mongodb';
import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const cursor = ctx.collectionRef.find(normalizedFilter, ctx.projection ? { projection: ctx.projection } : undefined);
  if (ctx.sort !== undefined) cursor.sort(ctx.sort as Sort);
  const [items, count] = await Promise.all([
    cursor.limit(ctx.limit).toArray(),
    ctx.collectionRef.countDocuments(normalizedFilter),
  ]);
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { items, count });
};
