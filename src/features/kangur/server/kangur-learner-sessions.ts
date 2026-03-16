import 'server-only';

import { ActivityTypes } from '@/shared/constants/observability';
import type {
  KangurLearnerSessionEntry,
  KangurLearnerSessionHistory,
} from '@/features/kangur/shared/contracts/kangur';
import type { ActivityLog } from '@/shared/contracts/system';
import { getActivityRepository } from '@/shared/lib/observability/activity-repository';

const SESSION_ACTIVITY_TYPES = new Set<string>([
  ActivityTypes.KANGUR.LEARNER_SIGNIN,
  ActivityTypes.KANGUR.LEARNER_SIGNOUT,
]);

const DEFAULT_SESSION_LIMIT = 20;
const MAX_SESSION_LIMIT = 200;
const ACTIVITY_PAGE_SIZE = 200;

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
  limit?: number;
  offset?: number;
}): Promise<KangurLearnerSessionHistory> => {
  const repository = await getActivityRepository();
  const filters = {
    userId: input.ownerUserId,
    entityId: input.learnerId,
    entityType: 'kangur_learner',
  };
  const sessionLimit = Math.min(
    MAX_SESSION_LIMIT,
    Math.max(1, Math.floor(input.limit ?? DEFAULT_SESSION_LIMIT))
  );
  const sessionOffset = Math.max(0, Math.floor(input.offset ?? 0));

  const totalSessions = await repository.countActivity({
    ...filters,
    type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
  });

  if (totalSessions === 0 || sessionOffset >= totalSessions) {
    return {
      sessions: [],
      totalSessions,
      nextOffset: null,
      hasMore: false,
    };
  }

  const sessions: KangurLearnerSessionEntry[] = [];
  let pendingEnd: { id: string; at: string } | null = null;
  let seenSessions = 0;
  let eventOffset = 0;
  let hasMoreEvents = true;

  while (sessions.length < sessionLimit && hasMoreEvents) {
    const events = await repository.listActivity({
      ...filters,
      limit: ACTIVITY_PAGE_SIZE,
      offset: eventOffset,
    });

    if (events.length === 0) {
      hasMoreEvents = false;
      break;
    }

    for (const event of events) {
      if (!SESSION_ACTIVITY_TYPES.has(event.type)) {
        continue;
      }
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
        const entry = {
          id: event.id,
          startedAt,
          endedAt,
          durationSeconds: normalizeDurationSeconds(startedAt, endedAt),
        };
        pendingEnd = null;
        seenSessions += 1;

        if (seenSessions <= sessionOffset) {
          continue;
        }

        sessions.push(entry);
        if (sessions.length >= sessionLimit) {
          break;
        }
      }
    }

    eventOffset += events.length;
    if (events.length < ACTIVITY_PAGE_SIZE) {
      hasMoreEvents = false;
    }
  }

  const nextOffset = sessionOffset + sessions.length;
  const hasMore = nextOffset < totalSessions;

  return {
    sessions,
    totalSessions,
    nextOffset: hasMore ? nextOffset : null,
    hasMore,
  };
};
