import type { Collection } from 'mongodb';
import { numberBalanceMatchStatusSchema } from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { notFoundError } from '@/features/kangur/shared/errors/app-error';
import { computeExpiresAt } from './helpers';
import type { MongoNumberBalanceMatchDocument } from './database';

export const isMatchExpired = (match: MongoNumberBalanceMatchDocument, nowMs: number): boolean => {
  if (match.status === numberBalanceMatchStatusSchema.enum.waiting) {
    return false;
  }
  return nowMs > match.startTimeMs + match.roundDurationMs;
};

export const refreshMatchStatus = async (
  collection: Collection<MongoNumberBalanceMatchDocument>,
  match: MongoNumberBalanceMatchDocument,
  nowMs: number
): Promise<MongoNumberBalanceMatchDocument> => {
  if (!isMatchExpired(match, nowMs) || match.status === 'completed') {
    return match;
  }

  const updatedMatch = await collection.findOneAndUpdate(
    { _id: match._id, status: { $ne: numberBalanceMatchStatusSchema.enum.completed } },
    {
      $set: {
        status: numberBalanceMatchStatusSchema.enum.completed,
        updatedAt: new Date(nowMs),
        expiresAt: computeExpiresAt(nowMs),
      },
    },
    { returnDocument: 'after', includeResultMetadata: false }
  );

  return updatedMatch ?? { ...match, status: numberBalanceMatchStatusSchema.enum.completed };
};

export const resolveMatch = async (
  collection: Collection<MongoNumberBalanceMatchDocument>,
  matchId: string,
  nowMs: number
): Promise<MongoNumberBalanceMatchDocument> => {
  const match = await collection.findOne({ _id: matchId });
  if (!match) {
    throw notFoundError('Number balance match not found.');
  }
  return refreshMatchStatus(collection, match, nowMs);
};
