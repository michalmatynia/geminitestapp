import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const result = await ctx.collectionRef.deleteMany(normalizedFilter);
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { deletedCount: result.deletedCount });
};
