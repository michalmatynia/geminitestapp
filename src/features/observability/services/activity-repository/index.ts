import 'server-only';

import type { ActivityRepository } from '@/features/observability/types/services/activity-repository';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

import { mongoActivityRepository } from './mongo-activity-repository';
import { prismaActivityRepository } from './prisma-activity-repository';

export const getActivityRepository = async (): Promise<ActivityRepository> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return mongoActivityRepository;
  }
  return prismaActivityRepository;
};
