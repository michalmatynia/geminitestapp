import 'server-only';

import { ActivityTypes } from '@/shared/constants/observability';
import type {
  KangurLearnerInteractionHistory,
  KangurLearnerSessionEntry,
} from '@/shared/contracts/kangur';
import type { ActivityLog } from '@/shared/contracts/system';
import { getActivityRepository } from '@/shared/lib/observability/activity-repository';

import { listKangurLearnerSessions } from './kangur-learner-sessions';

const DEFAULT_INTERACTION_LIMIT = 20;
const MAX_INTERACTION_LIMIT = 200;

const INTERACTION_ACTIVITY_TYPES = [
  ActivityTypes.KANGUR.OPENED_TASK,
  ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
];

const parseTimestampMs = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toSessionInteraction = (
  session: KangurLearnerSessionEntry,
  input: { ownerUserId: string; learnerId: string }
): ActivityLog => {
  const sessionTimestamp = session.endedAt ?? session.startedAt;

  return {
    id: `session-${session.id}`,
    type: ActivityTypes.KANGUR.LEARNER_SESSION,
    description: 'Sesja logowania ucznia.',
    userId: input.ownerUserId,
    entityId: input.learnerId,
    entityType: 'kangur_learner',
    metadata: {
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
    },
    createdAt: sessionTimestamp,
    updatedAt: sessionTimestamp,
  };
};

const sortByRecent = (left: ActivityLog, right: ActivityLog): number =>
  parseTimestampMs(right.createdAt ?? right.updatedAt) -
  parseTimestampMs(left.createdAt ?? left.updatedAt);

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
  const windowSize = limit + offset;
  const filters = {
    userId: input.ownerUserId,
    entityId: input.learnerId,
    entityType: 'kangur_learner',
    types: INTERACTION_ACTIVITY_TYPES,
  };

  const [activityItems, activityTotal, sessionHistory] = await Promise.all([
    repository.listActivity({
      ...filters,
      limit: windowSize,
      offset: 0,
    }),
    repository.countActivity(filters),
    listKangurLearnerSessions({
      ownerUserId: input.ownerUserId,
      learnerId: input.learnerId,
      limit: windowSize,
      offset: 0,
    }),
  ]);
  const sessionItems = sessionHistory.sessions.map((session) =>
    toSessionInteraction(session, input)
  );
  const combined = [...activityItems, ...sessionItems].sort(sortByRecent);
  const items = combined.slice(offset, offset + limit);
  const total = activityTotal + sessionHistory.totalSessions;

  return {
    items,
    total,
    limit,
    offset,
  };
};
