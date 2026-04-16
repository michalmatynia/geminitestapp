import { createRewardOutcome as createCoreRewardOutcome } from '@kangur/core';

import type { KangurProgressState } from '@/features/kangur/ui/types';

import type { KangurRewardInput } from './progress.contracts';
import { isProgressPersistenceEnabled } from './progress.persistence';

export {
  DIFFICULTY_XP_BONUS,
  MASTERY_STAGE_BONUSES,
  clampCounter,
  createEmptyActivityStatsEntry,
  getActivityStatsEntry,
  getAccuracyBonus,
  getDifficultyBonus,
  getSpeedBonus,
  getStreakBonus,
  getVarietyBonus,
  getActivityRepeatPenalty,
  getMasteryGainBonus,
  buildRewardBreakdown,
  buildActivityStatsUpdate,
  buildLessonMasteryUpdate,
} from '@kangur/core';

export const createRewardOutcome = (
  progress: KangurProgressState,
  input: KangurRewardInput,
): ReturnType<typeof createCoreRewardOutcome> =>
  createCoreRewardOutcome(progress, input, {
    persistenceEnabled: isProgressPersistenceEnabled(),
  });
