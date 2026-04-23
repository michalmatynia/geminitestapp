import { badRequestError } from '@/shared/errors/app-error';
import { withProviderPayload, extractFlatUpdates, normalizeReplaceDoc, shouldAutoStampUpdatedAt, applyUpdatedAtToReplacement } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const flatUpdates = extractFlatUpdates(ctx.update);
  const replacement = normalizeReplaceDoc(ctx.update);
  if (replacement === null || flatUpdates === null) throw badRequestError('Replacement document is required');
  const now = new Date();
  const nextReplacement = shouldAutoStampUpdatedAt(ctx.resolvedCollection) ? applyUpdatedAtToReplacement(replacement, now) : replacement;
  const result = await ctx.collectionRef.replaceOne(normalizedFilter, nextReplacement, { upsert: Boolean(ctx.upsert) });
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId ?? null });
};
