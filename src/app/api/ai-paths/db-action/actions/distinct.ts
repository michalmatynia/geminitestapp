import { badRequestError } from '@/shared/errors/app-error';
import { withProviderPayload } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const field = ctx.distinctField?.trim() ?? '';
  if (field === '') throw badRequestError('distinctField is required');
  const values = await ctx.collectionRef.distinct(field, normalizedFilter);
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { values, count: values.length });
};
