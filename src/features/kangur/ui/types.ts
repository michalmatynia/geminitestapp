import type {
  KangurDifficulty,
  KangurOperation,
} from '@kangur/core';
import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/shared/contracts/kangur-games';
import type { KangurProgressState } from '@/features/kangur/shared/contracts/kangur';
export type { KangurExamQuestion, KangurQuestionChoice } from '@/features/kangur/shared/contracts/kangur';
export type { KangurLessonMasteryEntry, KangurProgressState } from '@/features/kangur/shared/contracts/kangur';
export type {
  KangurDifficulty,
  KangurDifficultyConfig,
  KangurDifficultyConfigEntry,
  KangurOperation,
  KangurQuestion,
} from '@kangur/core';

export const KANGUR_GAME_SCREENS = [
  'home',
  'training',
  'kangur_setup',
  'kangur',
  ...KANGUR_LAUNCHABLE_GAME_SCREENS,
  'operation',
  'playing',
  'result',
] as const;

export type KangurGameScreen = (typeof KANGUR_GAME_SCREENS)[number];

export type KangurDifficultyOption = {
  displayLabel: string;
  id: KangurDifficulty;
  label: string;
  metaLabel: string;
  selected: boolean;
  select: () => void;
};

export type KangurXpRewards = {
  correct_answer: number;
  perfect_game: number;
  great_game: number;
  good_game: number;
  lesson_completed: number;
  clock_training_perfect: number;
  clock_training_good: number;
  geometry_training_perfect: number;
  geometry_training_good: number;
};

export type KangurRewardBreakdownEntry = {
  kind: string;
  label: string;
  xp: number;
};

export type KangurMiniGameFinishActionPropsDto = {
  onFinish: () => void;
};
export type KangurMiniGameFinishActionProps = KangurMiniGameFinishActionPropsDto;

export type KangurMiniGameFinishPropsDto = KangurMiniGameFinishActionPropsDto & {
  finishLabel?: string;
};
export type KangurMiniGameFinishProps = KangurMiniGameFinishPropsDto;

export type KangurMiniGameFinishVariantPropsDto = KangurMiniGameFinishActionPropsDto & {
  finishLabelVariant?: 'lesson' | 'play';
};
export type KangurMiniGameFinishVariantProps = KangurMiniGameFinishVariantPropsDto;

export type KangurMiniGameFeedbackBaseDto<TKind extends string> = {
  kind: TKind;
  text: string;
};

export type KangurMiniGameFeedbackDto = KangurMiniGameFeedbackBaseDto<'success' | 'error'>;
export type KangurMiniGameFeedback = KangurMiniGameFeedbackDto;
export type KangurMiniGameFeedbackState = KangurMiniGameFeedback | null;
export type KangurMiniGameBinaryFeedbackState = 'correct' | 'wrong' | null;
export type KangurIntlTranslate = ReturnType<(typeof import('next-intl'))['useTranslations']>;

export type KangurMiniGameInformationalFeedbackDto = KangurMiniGameFeedbackBaseDto<
  'success' | 'error' | 'info'
>;
export type KangurMiniGameInformationalFeedback = KangurMiniGameInformationalFeedbackDto;

export type KangurXpToastBadgeHint = {
  emoji: string;
  name: string;
  summary: string;
};

export type KangurSessionRecommendationHint = {
  description?: string;
  label: string;
  source: 'kangur_setup' | 'operation_selector' | 'training_setup';
  title: string;
};

export type KangurXpToastQuestHint = {
  title: string;
  summary: string;
  xpAwarded: number;
};

export type KangurXpToastRecommendationHint = {
  label: string;
  summary: string;
  title: string;
};

export type KangurXpToastState = {
  visible: boolean;
  xpGained: number;
  newBadges: string[];
  breakdown?: KangurRewardBreakdownEntry[];
  nextBadge?: KangurXpToastBadgeHint | null;
  dailyQuest?: KangurXpToastQuestHint | null;
  recommendation?: KangurXpToastRecommendationHint | null;
};

export type KangurAddXpResult = {
  updated: KangurProgressState;
  newBadges: string[];
  xpGained: number;
};

export type KangurBasePathProgressPropsDto = {
  basePath: string;
  progress: KangurProgressState;
};
export type KangurBasePathProgressProps = KangurBasePathProgressPropsDto;

export type KangurHomeScreenVisibilityPropsDto = {
  hideWhenScreenMismatch?: boolean;
};
export type KangurHomeScreenVisibilityProps = KangurHomeScreenVisibilityPropsDto;

export type KangurTrainingSelection = {
  categories: KangurOperation[];
  count: number;
  difficulty: KangurDifficulty;
};

export type KangurSessionStartOptions = {
  recommendation?: KangurSessionRecommendationHint | null;
};

export type KangurMode = string;
