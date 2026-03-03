import type { PrismaClient } from '@prisma/client';
import type { Db, ObjectId } from 'mongodb';
import type { SyncCollectionResult } from '@/shared/contracts/database';

export type { SyncCollectionResult };

export interface SyncHandlerContext {
  mongo: Db;
  prisma: PrismaClient;
  toDate: (value: unknown) => Date | null;
  normalizeId: (doc: Record<string, unknown>) => string;
  toObjectIdMaybe: (id: string | null | undefined) => ObjectId | string | null;
  toJsonValue: (value: unknown) => unknown;
  currencyCodes: Set<string>;
  countryCodes: Set<string>;
}

export type SyncHandler = (context: SyncHandlerContext) => Promise<SyncCollectionResult>;
