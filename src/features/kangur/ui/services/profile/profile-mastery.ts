'use client';

import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import type {
  KangurLessonMasteryInsight,
  KangurLessonMasteryInsights,
} from '@/features/kangur/shared/contracts/kangur-profile';
import type { KangurProgressState } from '@/features/kangur/shared/contracts/kangur';

export const resolveLessonMasteryEntries = (
  progress: KangurProgressState,
  locale?: string | null | undefined
): KangurLessonMasteryInsight[] =>
  Object.entries(progress.lessonMastery ?? {})
    .map(([componentId, mastery]) => {
      const lesson = KANGUR_LESSON_LIBRARY[componentId as keyof typeof KANGUR_LESSON_LIBRARY];
      if (!lesson) {
        return null;
      }

      return {
        componentId,
        title: getLocalizedKangurLessonTitle(componentId, locale, lesson.title),
        emoji: lesson.emoji,
        masteryPercent: mastery.masteryPercent,
        attempts: mastery.attempts,
        bestScorePercent: mastery.bestScorePercent,
        lastScorePercent: mastery.lastScorePercent,
        lastCompletedAt: mastery.lastCompletedAt,
      };
    })
    .filter((entry): entry is KangurLessonMasteryInsight => entry !== null);

export const buildLessonMasteryInsights = (
  progress: KangurProgressState,
  limit = 3,
  locale?: string | null | undefined
): KangurLessonMasteryInsights => {
  const entries = resolveLessonMasteryEntries(progress, locale);
  const safeLimit = Math.max(1, Math.floor(limit));
  const weakest = [...entries]
    .filter((entry) => entry.masteryPercent < 80)
    .sort((left, right) => {
      if (left.masteryPercent !== right.masteryPercent) {
        return left.masteryPercent - right.masteryPercent;
      }
      if (left.lastScorePercent !== right.lastScorePercent) {
        return left.lastScorePercent - right.lastScorePercent;
      }
      return right.attempts - left.attempts;
    })
    .slice(0, safeLimit);
  const strongest = [...entries]
    .sort((left, right) => {
      if (left.masteryPercent !== right.masteryPercent) {
        return right.masteryPercent - left.masteryPercent;
      }
      if (left.bestScorePercent !== right.bestScorePercent) {
        return right.bestScorePercent - left.bestScorePercent;
      }
      return right.attempts - left.attempts;
    })
    .slice(0, safeLimit);

  return {
    weakest,
    strongest,
    trackedLessons: entries.length,
    masteredLessons: entries.filter((entry) => entry.masteryPercent >= 80).length,
    lessonsNeedingPractice: entries.filter((entry) => entry.masteryPercent < 80).length,
  };
};
