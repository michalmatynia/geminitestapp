import 'server-only';

import type { KangurLearnerActivityStatus } from '@/shared/contracts/kangur';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';

export const publishKangurLearnerActivityUpdate = (
  learnerId: string,
  status: KangurLearnerActivityStatus
): void => {
  const normalizedLearnerId = learnerId.trim();
  if (!normalizedLearnerId) {
    return;
  }

  publishRunEvent(`kangur:learner-activity:${normalizedLearnerId}`, {
    type: 'snapshot',
    data: status,
    ts: Date.now(),
  });
};
