import type { Collection } from 'mongodb';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  type NumberBalanceMatchPlayerState,
  type NumberBalanceMatchState,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { NUMBER_BALANCE_COLLECTION } from './constants';

export type MongoNumberBalanceMatchDocument = Omit<NumberBalanceMatchState, 'matchId'> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  players: NumberBalanceMatchPlayerState[];
  playerCount: number;
};

let indexesEnsured: Promise<void> | null = null;

const ensureNumberBalanceIndexes = async (): Promise<void> => {
  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async (): Promise<void> => {
    const db = await getMongoDb();
    const collection = db.collection<MongoNumberBalanceMatchDocument>(NUMBER_BALANCE_COLLECTION);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ updatedAt: -1 });
  })();

  return indexesEnsured;
};

export const getNumberBalanceCollection = async (): Promise<
  Collection<MongoNumberBalanceMatchDocument>
> => {
  await ensureNumberBalanceIndexes();
  const db = await getMongoDb();
  return db.collection<MongoNumberBalanceMatchDocument>(NUMBER_BALANCE_COLLECTION);
};
