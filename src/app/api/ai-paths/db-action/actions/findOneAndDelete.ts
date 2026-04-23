import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const result = await ctx.collectionRef.findOneAndDelete(normalizedFilter, { includeResultMetadata: true });
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { value: result.value ?? null, ok: result.ok });
};
