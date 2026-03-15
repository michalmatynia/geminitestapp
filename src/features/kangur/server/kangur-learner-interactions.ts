import 'server-only';

import { ActivityTypes } from '@/shared/constants/observability';
import type { ActivityLog } from '@/shared/contracts/system';
import { getActivityRepository } from '@/shared/lib/observability/activity-repository';

export type KangurLearnerInteractionHistory = {
  items: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
};

const DEFAULT_INTERACTION_LIMIT = 20;
const MAX_INTERACTION_LIMIT = 200;

const INTERACTION_TYPES = [
  ActivityTypes.KANGUR.OPENED_TASK,
  ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
  ActivityTypes.KANGUR.LEARNER_SIGNIN,
  ActivityTypes.KANGUR.LEARNER_SIGNOUT,
];

export const listKangurLearnerInteractions = async (input: {
  ownerUserId: string;
  learnerId: string;
  limit?: number;
  offset?: number;
}): Promise<KangurLearnerInteractionHistory> => {
  const repository = await getActivityRepository();
  const limit = Math.min(
    MAX_INTERACTION_LIMIT,
    Math.max(1, Math.floor(input.limit ?? DEFAULT_INTERACTION_LIMIT))
  );
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const filters = {
    userId: input.ownerUserId,
    entityId: input.learnerId,
    entityType: 'kangur_learner',
    types: INTERACTION_TYPES,
  };

  const [items, total] = await Promise.all([
    repository.listActivity({
      ...filters,
      limit,
      offset,
    }),
    repository.countActivity(filters),
  ]);

  return {
    items,
    total,
    limit,
    offset,
  };
};
