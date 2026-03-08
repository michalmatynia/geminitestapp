import 'server-only';

import { ActivityTypes } from '@/shared/constants/observability';
import type { ActivityLog } from '@/shared/contracts/system';
import { getActivityRepository } from '@/shared/lib/observability/activity-repository';

export type KangurLoginActivityEntry = {
  id: string;
  occurredAt: string;
  actorType: 'parent' | 'learner';
  activityType: 'parent_login' | 'learner_signin';
  loginMethod: 'password' | 'magic_link' | 'unknown';
  learnerId: string | null;
  summary: string;
};

export type KangurLoginActivitySnapshot = {
  events: KangurLoginActivityEntry[];
  lastParentLogin: KangurLoginActivityEntry | null;
  lastLearnerSignIn: KangurLoginActivityEntry | null;
  parentLoginCount7d: number;
  learnerSignInCount7d: number;
};

const DEFAULT_EVENT_LIMIT = 8;
const DEFAULT_RECENT_WINDOW_DAYS = 30;
const SUMMARY_WINDOW_DAYS = 7;
const MIN_QUERY_LIMIT = 32;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isWithinDays = (isoTimestamp: string, days: number): boolean => {
  const occurredAtMs = Date.parse(isoTimestamp);
  if (Number.isNaN(occurredAtMs)) {
    return false;
  }
  return Date.now() - occurredAtMs <= days * 24 * 60 * 60 * 1000;
};

const sortByNewest = (left: KangurLoginActivityEntry, right: KangurLoginActivityEntry): number =>
  Date.parse(right.occurredAt) - Date.parse(left.occurredAt);

const toParentLoginEntry = (activity: ActivityLog): KangurLoginActivityEntry | null => {
  if (activity.type !== ActivityTypes.AUTH.LOGIN) {
    return null;
  }

  const metadata = asRecord(activity.metadata);
  if (!metadata || readString(metadata['surface']) !== 'kangur') {
    return null;
  }
  if (readString(metadata['authFlow']) !== 'kangur_parent') {
    return null;
  }

  const loginMethodRaw = readString(metadata['loginMethod']);
  const loginMethod =
    loginMethodRaw === 'password' || loginMethodRaw === 'magic_link' ? loginMethodRaw : 'unknown';
  const occurredAt = readString(activity.createdAt);
  if (!occurredAt) {
    return null;
  }

  return {
    id: activity.id,
    occurredAt,
    actorType: 'parent',
    activityType: 'parent_login',
    loginMethod,
    learnerId: null,
    summary:
      loginMethod === 'magic_link'
        ? 'Parent logged into Kangur with a magic link.'
        : loginMethod === 'password'
          ? 'Parent logged into Kangur with email and password.'
          : 'Parent logged into Kangur.',
  };
};

const toLearnerSignInEntry = (
  activity: ActivityLog,
  learnerId: string
): KangurLoginActivityEntry | null => {
  if (activity.type !== ActivityTypes.KANGUR.LEARNER_SIGNIN) {
    return null;
  }

  const metadata = asRecord(activity.metadata);
  const activityLearnerId = readString(metadata?.['learnerId']) ?? readString(activity.entityId);
  if (activityLearnerId !== learnerId) {
    return null;
  }
  const occurredAt = readString(activity.createdAt);
  if (!occurredAt) {
    return null;
  }

  return {
    id: activity.id,
    occurredAt,
    actorType: 'learner',
    activityType: 'learner_signin',
    loginMethod: 'password',
    learnerId,
    summary: 'Learner signed into Kangur.',
  };
};

export const listKangurLoginActivity = async (input: {
  ownerUserId: string;
  learnerId: string;
  limit?: number;
  recentWindowDays?: number;
}): Promise<KangurLoginActivitySnapshot> => {
  const limit = Math.max(1, input.limit ?? DEFAULT_EVENT_LIMIT);
  const recentWindowDays = Math.max(1, input.recentWindowDays ?? DEFAULT_RECENT_WINDOW_DAYS);
  const queryLimit = Math.max(MIN_QUERY_LIMIT, limit * 6);
  const repository = await getActivityRepository();

  const [parentLoginLogs, learnerSignInLogs] = await Promise.all([
    repository.listActivity({
      userId: input.ownerUserId,
      type: ActivityTypes.AUTH.LOGIN,
      limit: queryLimit,
      offset: 0,
    }),
    repository.listActivity({
      userId: input.ownerUserId,
      type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
      limit: queryLimit,
      offset: 0,
    }),
  ]);

  const allEvents = [
    ...parentLoginLogs.map((activity) => toParentLoginEntry(activity)).filter(Boolean),
    ...learnerSignInLogs
      .map((activity) => toLearnerSignInEntry(activity, input.learnerId))
      .filter(Boolean),
  ]
    .filter((entry): entry is KangurLoginActivityEntry => Boolean(entry))
    .filter((entry) => isWithinDays(entry.occurredAt, recentWindowDays))
    .sort(sortByNewest);

  const summaryWindowEvents = allEvents.filter((entry) => isWithinDays(entry.occurredAt, SUMMARY_WINDOW_DAYS));
  const lastParentLogin = allEvents.find((entry) => entry.actorType === 'parent') ?? null;
  const lastLearnerSignIn = allEvents.find((entry) => entry.actorType === 'learner') ?? null;

  return {
    events: allEvents.slice(0, limit),
    lastParentLogin,
    lastLearnerSignIn,
    parentLoginCount7d: summaryWindowEvents.filter((entry) => entry.actorType === 'parent').length,
    learnerSignInCount7d: summaryWindowEvents.filter((entry) => entry.actorType === 'learner')
      .length,
  };
};
