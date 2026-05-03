import { type Document, type FindOneAndUpdateOptions } from 'mongodb';
import { badRequestError } from '@/shared/errors/app-error';
import { withProviderPayload, normalizeUpdateDoc, shouldAutoStampUpdatedAt, applyUpdatedAtToUpdateDoc } from '../handler.helpers';
import { type MongoActionContext } from '../handler.mongo';

export const runMongoAction = async (ctx: MongoActionContext, normalizedFilter: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const updateDoc = normalizeUpdateDoc(ctx.update);
  if (updateDoc === null) throw badRequestError('Update document is required');
  const now = new Date();
  const nextUpdateDoc = shouldAutoStampUpdatedAt(ctx.resolvedCollection) ? applyUpdatedAtToUpdateDoc(updateDoc, now) : updateDoc;
  
  const options: FindOneAndUpdateOptions = {
    returnDocument: ctx.returnDocument === 'before' ? 'before' : 'after',
    upsert: Boolean(ctx.upsert),
    includeResultMetadata: true
  };

  const result = await ctx.collectionRef.findOneAndUpdate(
    normalizedFilter, 
    nextUpdateDoc as Document, 
    options
  );
  return withProviderPayload(ctx.provider, ctx.requestedProvider, { value: result.value ?? null, ok: result.ok });
};
