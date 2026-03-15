import 'server-only';

import { ActivityTypes } from '@/shared/constants/observability';
import type { ActivityLog } from '@/shared/contracts/system';
import { getActivityRepository } from '@/shared/lib/observability/activity-repository';

export type KangurLearnerSessionEntry = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
};

export type KangurLearnerSessionHistory = {
  sessions: KangurLearnerSessionEntry[];
  totalSessions: number;
};

const SESSION_ACTIVITY_TYPES = new Set<string>([
  ActivityTypes.KANGUR.LEARNER_SIGNIN,
  ActivityTypes.KANGUR.LEARNER_SIGNOUT,
]);

const readTimestampMs = (activity: ActivityLog): number | null => {
  const raw = activity.createdAt ?? activity.updatedAt ?? null;
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
};

const readTimestamp = (activity: ActivityLog): string | null => {
  const parsed = readTimestampMs(activity);
  return parsed === null ? null : new Date(parsed).toISOString();
};

const sortByNewest = (left: ActivityLog, right: ActivityLog): number => {
  const leftMs = readTimestampMs(left) ?? 0;
  const rightMs = readTimestampMs(right) ?? 0;
  return rightMs - leftMs;
};

const normalizeDurationSeconds = (
  startedAt: string,
  endedAt: string | null
): number | null => {
  if (!endedAt) {
    return null;
  }
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return null;
  }
  return Math.round((endMs - startMs) / 1000);
};

export const listKangurLearnerSessions = async (input: {
  ownerUserId: string;
  learnerId: string;
}): Promise<KangurLearnerSessionHistory> => {
  const repository = await getActivityRepository();
  const filters = {
    userId: input.ownerUserId,
    entityId: input.learnerId,
    entityType: 'kangur_learner',
  };

  const totalEvents = await repository.countActivity(filters);
  const events =
    totalEvents > 0
      ? await repository.listActivity({
          ...filters,
          limit: totalEvents,
          offset: 0,
        })
      : [];

  const sessionEvents = events
    .filter((event) => SESSION_ACTIVITY_TYPES.has(event.type))
    .sort(sortByNewest);

  const sessions: KangurLearnerSessionEntry[] = [];
  let pendingEnd: { id: string; at: string } | null = null;

  for (const event of sessionEvents) {
    const timestamp = readTimestamp(event);
    if (!timestamp) {
      continue;
    }
    if (event.type === ActivityTypes.KANGUR.LEARNER_SIGNOUT) {
      if (!pendingEnd) {
        pendingEnd = { id: event.id, at: timestamp };
      }
      continue;
    }

    if (event.type === ActivityTypes.KANGUR.LEARNER_SIGNIN) {
      const startedAt = timestamp;
      const endedAt =
        pendingEnd && Date.parse(pendingEnd.at) >= Date.parse(startedAt)
          ? pendingEnd.at
          : null;
      sessions.push({
        id: event.id,
        startedAt,
        endedAt,
        durationSeconds: normalizeDurationSeconds(startedAt, endedAt),
      });
      pendingEnd = null;
    }
  }

  return {
    sessions,
    totalSessions: sessions.length,
  };
};
