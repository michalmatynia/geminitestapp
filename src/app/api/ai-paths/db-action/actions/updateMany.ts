import { type Document, type UpdateFilter } from 'mongodb';
import { badRequestError } from '@/shared/errors/app-error';
import { withProviderPayload, normalizeUpdateDoc, shouldAutoStampUpdatedAt, applyUpdatedAtToUpdateDoc } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const updateDoc = normalizeUpdateDoc(ctx.update);
  if (updateDoc === null) throw badRequestError('Update document is required');
  const now = new Date();
  const nextUpdateDoc = shouldAutoStampUpdatedAt(ctx.resolvedCollection) ? applyUpdatedAtToUpdateDoc(updateDoc, now) : updateDoc;
  const result = await ctx.collectionRef.updateMany(
    normalizedFilter, 
    nextUpdateDoc as UpdateFilter<Document>, 
    { upsert: Boolean(ctx.upsert) }
  );
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId ?? null });
};
