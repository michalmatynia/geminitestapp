import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const count = await ctx.collectionRef.countDocuments(normalizedFilter);
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { count });
};
