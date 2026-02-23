import type { PrismaClient } from '@prisma/client';
import type { Db } from 'mongodb';

export interface SyncCollectionResult {
  sourceCount: number;
  targetDeleted: number;
  targetInserted: number;
  warnings?: string[];
}

export interface SyncHandlerContext {
  mongo: Db;
  prisma: PrismaClient;
  toDate: (value: unknown) => Date | null;
  normalizeId: (doc: Record<string, unknown>) => string;
  toObjectIdMaybe: (id: string | null | undefined) => ObjectId | string | null;
  toJsonValue: (value: unknown) => Prisma.InputJsonValue;
  currencyCodes: Set<string>;
  countryCodes: Set<string>;
}

export type SyncHandler = (context: SyncHandlerContext) => Promise<SyncCollectionResult>;
