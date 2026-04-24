import type { KangurProgressState } from '@kangur/core';
import { buildKangurLessonMasteryUpdate, checkKangurNewBadges } from '@kangur/core';

export interface SaveLessonCheckpointInput {
  countsAsLessonCompletion?: boolean;
  lessonComponentId: string;
  scorePercent: number;
}

export interface SaveLessonCheckpointResult {
  countsAsLessonCompletion: boolean;
  newBadges: string[];
  scorePercent: number;
}

export function saveLessonCheckpoint(
  input: SaveLessonCheckpointInput,
  currentProgress: KangurProgressState,
  progressStore: { saveProgress: (p: any) => void }
): SaveLessonCheckpointResult {
  const normalizedScorePercent = Math.max(0, Math.min(100, Math.round(input.scorePercent)));
  const countsAsLessonCompletion = input.countsAsLessonCompletion === true;
  
  const updatedProgress: KangurProgressState = {
    ...currentProgress,
    lessonMastery: buildKangurLessonMasteryUpdate(
      currentProgress,
      input.lessonComponentId.trim(),
      normalizedScorePercent
    ),
    lessonsCompleted: countsAsLessonCompletion
      ? currentProgress.lessonsCompleted + 1
      : currentProgress.lessonsCompleted,
  };

  const newBadges = checkKangurNewBadges(updatedProgress);
  updatedProgress.badges = Array.from(new Set([...updatedProgress.badges, ...newBadges]));
  
  progressStore.saveProgress(updatedProgress);

  return {
    countsAsLessonCompletion,
    newBadges,
    scorePercent: normalizedScorePercent,
  };
}
