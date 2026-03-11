import 'server-only';

import type { ActivityRepository } from '@/shared/contracts/system';

import { mongoActivityRepository } from './mongo-activity-repository';

export const getActivityRepository = async (): Promise<ActivityRepository> => {
  return mongoActivityRepository;
};
