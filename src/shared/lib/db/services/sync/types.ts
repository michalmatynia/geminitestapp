import type { Db } from 'mongodb';
import type { ObjectId } from 'mongodb';
import type { PrismaClient } from '@prisma/client';

export type DatabaseSyncHandlerContext = {
  mongo: Db;
  prisma: PrismaClient;
  normalizeId: (doc: Record<string, unknown>) => string;
  toDate: (value: unknown) => Date | null;
  toJsonValue: (value: unknown) => unknown;
  toObjectIdMaybe: (value: string | null | undefined) => ObjectId | string | null;
  currencyCodes?: ReadonlySet<string>;
  countryCodes?: ReadonlySet<string>;
};

export type DatabaseSyncHandlerResult = {
  sourceCount: number;
  targetDeleted: number;
  targetInserted: number;
};

export type DatabaseSyncHandler = (context: DatabaseSyncHandlerContext) => Promise<DatabaseSyncHandlerResult>;
