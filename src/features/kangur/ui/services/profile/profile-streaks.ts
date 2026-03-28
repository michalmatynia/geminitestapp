'use client';

import type { KangurScoreRecord } from '@kangur/platform';
import {
  DAY_IN_MS,
  parseDateOrNull,
  toDateAtLocalMidnight,
  toLocalDateKey,
} from './profile-utils';

export const computeStreaks = (
  scores: KangurScoreRecord[],
  now: Date
): {
  currentStreakDays: number;
  longestStreakDays: number;
  lastPlayedAt: string | null;
} => {
  if (scores.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0, lastPlayedAt: null };
  }

  const uniqueDateKeys = Array.from(
    new Set(
      scores
        .map((score) => parseDateOrNull(score.created_date))
        .filter((date): date is Date => Boolean(date))
        .map((date) => toLocalDateKey(date))
    )
  ).sort(
    (left, right) => toDateAtLocalMidnight(right).getTime() - toDateAtLocalMidnight(left).getTime()
  );

  if (uniqueDateKeys.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0, lastPlayedAt: null };
  }

  let longestStreakDays = 1;
  let rolling = 1;
  for (let index = 1; index < uniqueDateKeys.length; index += 1) {
    const prev = toDateAtLocalMidnight(uniqueDateKeys[index - 1]!);
    const next = toDateAtLocalMidnight(uniqueDateKeys[index]!);
    const diffDays = Math.round((prev.getTime() - next.getTime()) / DAY_IN_MS);
    if (diffDays === 1) {
      rolling += 1;
    } else {
      rolling = 1;
    }
    if (rolling > longestStreakDays) {
      longestStreakDays = rolling;
    }
  }

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const latestDate = toDateAtLocalMidnight(uniqueDateKeys[0]!);
  const latestDiffDays = Math.round((todayDate.getTime() - latestDate.getTime()) / DAY_IN_MS);
  let currentStreakDays = 0;
  if (latestDiffDays === 0 || latestDiffDays === 1) {
    currentStreakDays = 1;
    for (let index = 1; index < uniqueDateKeys.length; index += 1) {
      const prev = toDateAtLocalMidnight(uniqueDateKeys[index - 1]!);
      const next = toDateAtLocalMidnight(uniqueDateKeys[index]!);
      const diffDays = Math.round((prev.getTime() - next.getTime()) / DAY_IN_MS);
      if (diffDays !== 1) break;
      currentStreakDays += 1;
    }
  }

  return {
    currentStreakDays,
    longestStreakDays,
    lastPlayedAt: scores[0]?.created_date ?? null,
  };
};
