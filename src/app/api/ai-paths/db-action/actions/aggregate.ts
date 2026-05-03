import { badRequestError } from '@/shared/errors/app-error';
import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, _normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  if (ctx.pipeline === undefined || ctx.pipeline.length === 0) throw badRequestError('Aggregation pipeline is required');
  const items = await ctx.collectionRef.aggregate(ctx.pipeline).toArray();
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { items, count: items.length });
};
