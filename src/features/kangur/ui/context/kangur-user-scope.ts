import type { KangurUser } from '@kangur/platform';

const readTrimmedKangurScopedId = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const resolveKangurUserScopeKey = (
  user: KangurUser | null | undefined
): string | null => {
  const activeLearnerId = readTrimmedKangurScopedId(user?.activeLearner?.id);
  if (activeLearnerId) {
    return activeLearnerId;
  }

  if (user?.actorType === 'parent') {
    return null;
  }

  return readTrimmedKangurScopedId(user?.id);
};

export const isKangurParentWithoutActiveLearner = (
  user: KangurUser | null | undefined
): boolean =>
  user?.actorType === 'parent' &&
  readTrimmedKangurScopedId(user?.activeLearner?.id) === null;
