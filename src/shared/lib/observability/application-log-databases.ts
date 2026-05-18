import 'server-only';

import type { Db } from 'mongodb';

import type { ObservabilityApplicationId } from '@/shared/contracts/system';
import { getMongoDb as getRootMongoDb } from '@/shared/lib/db/mongo-client';

export const getObservabilityApplicationMongoDb = async (
  applicationId: ObservabilityApplicationId
): Promise<Db> => {
  if (applicationId === 'studiq') {
    const { getMongoDb } = await import('@/shared/lib/db/studiq-mongo-client');
    return getMongoDb();
  }

  if (applicationId === 'cms-builder') {
    const { getMongoDb } = await import('@/shared/lib/db/cms-builder-mongo-client');
    return getMongoDb();
  }

  if (applicationId === 'stargater') {
    const { getMongoDb } = await import('@/shared/lib/db/ecommerce-mongo-client');
    return getMongoDb();
  }

  if (applicationId === 'arch') {
    const { getMongoDb } = await import('@/shared/lib/db/arch-mongo-client');
    return getMongoDb();
  }

  return getRootMongoDb();
};

export const isCentralObservabilityApplication = (
  applicationId: ObservabilityApplicationId
): boolean => applicationId === 'geminitestapp';

export const getMongoDatabaseName = (db: Db): string | null => {
  const candidate = (db as Db & { databaseName?: unknown }).databaseName;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
};
