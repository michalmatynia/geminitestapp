import type { KangurScoreRecord } from '@kangur/platform';
import {
  DAY_IN_MS,
  parseDateOrNull,
  toDateAtLocalMidnight,
  toLocalDateKey,
} from './profile-utils';

const EMPTY_STREAKS = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  lastPlayedAt: null,
} as const;

const compareDateKeysDesc = (left: string, right: string): number =>
  toDateAtLocalMidnight(right).getTime() - toDateAtLocalMidnight(left).getTime();

const toUniqueScoreDateKeys = (scores: KangurScoreRecord[]): string[] =>
  Array.from(
    new Set(
      scores
        .map((score) => parseDateOrNull(score.created_date))
        .filter((date): date is Date => Boolean(date))
        .map((date) => toLocalDateKey(date))
    )
  ).sort(compareDateKeysDesc);

const isConsecutiveDatePair = (left: string, right: string): boolean => {
  const previousDate = toDateAtLocalMidnight(left);
  const nextDate = toDateAtLocalMidnight(right);
  const diffDays = Math.round((previousDate.getTime() - nextDate.getTime()) / DAY_IN_MS);
  return diffDays === 1;
};

const computeLongestStreakDays = (dateKeys: string[]): number => {
  let longestStreakDays = 1;
  let rollingStreakDays = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    rollingStreakDays = isConsecutiveDatePair(dateKeys[index - 1]!, dateKeys[index]!)
      ? rollingStreakDays + 1
      : 1;
    longestStreakDays = Math.max(longestStreakDays, rollingStreakDays);
  }

  return longestStreakDays;
};

const canContinueCurrentStreak = (latestDateKey: string, now: Date): boolean => {
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const latestDate = toDateAtLocalMidnight(latestDateKey);
  const latestDiffDays = Math.round((todayDate.getTime() - latestDate.getTime()) / DAY_IN_MS);
  return latestDiffDays === 0 || latestDiffDays === 1;
};

const computeCurrentStreakDays = (dateKeys: string[], now: Date): number => {
  if (!canContinueCurrentStreak(dateKeys[0]!, now)) {
    return 0;
  }

  let currentStreakDays = 1;
  for (let index = 1; index < dateKeys.length; index += 1) {
    if (!isConsecutiveDatePair(dateKeys[index - 1]!, dateKeys[index]!)) {
      break;
    }

    currentStreakDays += 1;
  }

  return currentStreakDays;
};

export const computeStreaks = (
  scores: KangurScoreRecord[],
  now: Date
): {
  currentStreakDays: number;
  longestStreakDays: number;
  lastPlayedAt: string | null;
} => {
  if (scores.length === 0) {
    return EMPTY_STREAKS;
  }

  const uniqueDateKeys = toUniqueScoreDateKeys(scores);

  if (uniqueDateKeys.length === 0) {
    return EMPTY_STREAKS;
  }

  return {
    currentStreakDays: computeCurrentStreakDays(uniqueDateKeys, now),
    longestStreakDays: computeLongestStreakDays(uniqueDateKeys),
    lastPlayedAt: scores[0]?.created_date ?? null,
  };
};
