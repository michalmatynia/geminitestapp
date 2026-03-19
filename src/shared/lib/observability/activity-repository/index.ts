import 'server-only';

import type { ActivityRepository } from '@/shared/contracts/system';

import { clearActivityLogs as clearMongoActivityLogs, mongoActivityRepository } from './mongo-activity-repository';

export const getActivityRepository = async (): Promise<ActivityRepository> => {
  return mongoActivityRepository;
};

export const clearActivityLogs = async (input?: {
  before?: Date | null;
}): Promise<{ deleted: number }> => {
  return clearMongoActivityLogs(input);
};
