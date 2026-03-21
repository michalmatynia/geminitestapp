import {
  normalizeKangurProgressState,
  type KangurLessonComponentId,
  type KangurProgressState,
} from '@kangur/contracts';

import { KANGUR_XP_REWARDS, checkKangurNewBadges } from './progress-metadata';
import {
  getLocalizedKangurLogicPracticeQuestionBank,
  getLocalizedKangurPracticeFallbackAnswer,
  getLocalizedKangurPracticeFallbackQuestion,
  getLocalizedKangurPracticeOperationLabel,
} from './practice-i18n';

export const KANGUR_PRACTICE_OPERATIONS = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'clock',
  'calendar',
  'mixed',
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
] as const;

export type KangurPracticeOperation = (typeof KANGUR_PRACTICE_OPERATIONS)[number];
export type KangurPracticeQuestion = {
  question: string;
  answer: string | number;
  choices: Array<string | number>;
  category?: string;
};

export type KangurPracticeOperationConfig = {
  id: KangurPracticeOperation;
  label: string;
  categories: KangurPracticeCategory[];
  lessonComponentId: KangurLessonComponentId | null;
  kind: 'arithmetic' | 'logic' | 'time';
};

export type KangurPracticeCategory =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'clock'
  | 'calendar'
  | 'logical_thinking'
  | 'logical_patterns'
  | 'logical_classification'
  | 'logical_reasoning'
  | 'logical_analogies';

export type KangurPracticeCompletionResult = {
  updated: KangurProgressState;
  newBadges: string[];
  xpGained: number;
  scorePercent: number;
  isPerfect: boolean;
  operation: KangurPracticeOperation;
};

const KANGUR_PRACTICE_OPERATION_CONFIG: Record<
  KangurPracticeOperation,
  Omit<KangurPracticeOperationConfig, 'label'>
> = {
  addition: {
    id: 'addition',
    categories: ['addition'],
    lessonComponentId: 'adding',
    kind: 'arithmetic',
  },
  subtraction: {
    id: 'subtraction',
    categories: ['subtraction'],
    lessonComponentId: 'subtracting',
    kind: 'arithmetic',
  },
  multiplication: {
    id: 'multiplication',
    categories: ['multiplication'],
    lessonComponentId: 'multiplication',
    kind: 'arithmetic',
  },
  division: {
    id: 'division',
    categories: ['division'],
    lessonComponentId: 'division',
    kind: 'arithmetic',
  },
  clock: {
    id: 'clock',
    categories: ['clock'],
    lessonComponentId: 'clock',
    kind: 'time',
  },
  calendar: {
    id: 'calendar',
    categories: ['calendar'],
    lessonComponentId: 'calendar',
    kind: 'time',
  },
  mixed: {
    id: 'mixed',
    categories: ['addition', 'subtraction', 'multiplication', 'division'],
    lessonComponentId: null,
    kind: 'arithmetic',
  },
  logical_thinking: {
    id: 'logical_thinking',
    categories: ['logical_thinking'],
    lessonComponentId: 'logical_thinking',
    kind: 'logic',
  },
  logical_patterns: {
    id: 'logical_patterns',
    categories: ['logical_patterns'],
    lessonComponentId: 'logical_patterns',
    kind: 'logic',
  },
  logical_classification: {
    id: 'logical_classification',
    categories: ['logical_classification'],
    lessonComponentId: 'logical_classification',
    kind: 'logic',
  },
  logical_reasoning: {
    id: 'logical_reasoning',
    categories: ['logical_reasoning'],
    lessonComponentId: 'logical_reasoning',
    kind: 'logic',
  },
  logical_analogies: {
    id: 'logical_analogies',
    categories: ['logical_analogies'],
    lessonComponentId: 'logical_analogies',
    kind: 'logic',
  },
};

const PRACTICE_OPERATION_BY_LESSON_COMPONENT: Partial<
  Record<KangurLessonComponentId, KangurPracticeOperation>
> = {
  adding: 'addition',
  subtracting: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
  calendar: 'calendar',
  logical_thinking: 'logical_thinking',
  logical_patterns: 'logical_patterns',
  logical_classification: 'logical_classification',
  logical_reasoning: 'logical_reasoning',
  logical_analogies: 'logical_analogies',
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const mergeUniqueStrings = (values: string[]): string[] => Array.from(new Set(values));
const shuffleValues = <T,>(values: readonly T[]): T[] =>
  [...values].sort(() => Math.random() - 0.5);

const createEmptyLessonMasteryEntry = () => ({
  attempts: 0,
  completions: 0,
  masteryPercent: 0,
  bestScorePercent: 0,
  lastScorePercent: 0,
  lastCompletedAt: null,
});

export const isKangurPracticeOperation = (
  value: string,
): value is KangurPracticeOperation =>
  KANGUR_PRACTICE_OPERATIONS.includes(value as KangurPracticeOperation);

export const resolveKangurPracticeOperation = (
  value: string | null | undefined,
): KangurPracticeOperation => {
  const normalized = value?.trim().toLowerCase();
  if (normalized && isKangurPracticeOperation(normalized)) {
    return normalized;
  }

  return 'mixed';
};

export const getKangurPracticeOperationConfig = (
  operation: KangurPracticeOperation,
  locale?: string | null | undefined,
): KangurPracticeOperationConfig => ({
  ...KANGUR_PRACTICE_OPERATION_CONFIG[operation],
  label: getLocalizedKangurPracticeOperationLabel(operation, locale),
});

export const resolveKangurLessonFocusForPracticeOperation = (
  value: string | null | undefined,
): KangurLessonComponentId | null => {
  const operation = resolvePreferredKangurPracticeOperation(value);
  if (!operation) {
    return null;
  }

  return getKangurPracticeOperationConfig(operation).lessonComponentId;
};

export const getKangurPracticeOperationForLessonComponent = (
  lessonComponentId: KangurLessonComponentId,
): KangurPracticeOperation | null =>
  PRACTICE_OPERATION_BY_LESSON_COMPONENT[lessonComponentId] ?? null;

export const resolvePreferredKangurPracticeOperation = (
  value: string | null | undefined,
): KangurPracticeOperation | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (isKangurPracticeOperation(normalized)) {
    return normalized;
  }

  return getKangurPracticeOperationForLessonComponent(
    normalized as KangurLessonComponentId,
  );
};

export const isKangurLogicPracticeOperation = (
  operation: KangurPracticeOperation,
): operation is Extract<
  KangurPracticeOperation,
  | 'logical_thinking'
  | 'logical_patterns'
  | 'logical_classification'
  | 'logical_reasoning'
  | 'logical_analogies'
> => getKangurPracticeOperationConfig(operation).kind === 'logic';

export const generateKangurLogicPracticeQuestions = (
  operation: Extract<
    KangurPracticeOperation,
    | 'logical_thinking'
    | 'logical_patterns'
    | 'logical_classification'
    | 'logical_reasoning'
    | 'logical_analogies'
  >,
  count = 8,
  locale?: string | null | undefined,
): KangurPracticeQuestion[] => {
  const questionBank = getLocalizedKangurLogicPracticeQuestionBank(operation, locale);
  const safeCount = Math.max(1, Math.floor(count));

  return Array.from({ length: safeCount }, (_, index) => {
    const seed = questionBank[index % questionBank.length] ?? questionBank[0];
    if (!seed) {
      return {
        question: getLocalizedKangurPracticeFallbackQuestion(locale),
        answer: getLocalizedKangurPracticeFallbackAnswer(locale),
        choices: [getLocalizedKangurPracticeFallbackAnswer(locale)],
        category: operation,
      };
    }

    return {
      question: seed.question,
      answer: seed.answer,
      choices: shuffleValues(seed.choices),
      category: operation,
    };
  });
};

export const buildKangurLessonMasteryUpdate = (
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent: number,
  completedAt: string = new Date().toISOString(),
): KangurProgressState['lessonMastery'] => {
  const normalizedKey = lessonKey.trim();
  if (!normalizedKey) {
    return progress.lessonMastery;
  }

  const current =
    progress.lessonMastery[normalizedKey] ?? createEmptyLessonMasteryEntry();
  const normalizedScore = clampPercent(scorePercent);
  const nextAttempts = current.attempts + 1;

  return {
    ...progress.lessonMastery,
    [normalizedKey]: {
      attempts: nextAttempts,
      completions: current.completions + 1,
      masteryPercent: clampPercent(
        (current.masteryPercent * current.attempts + normalizedScore) / nextAttempts,
      ),
      bestScorePercent: Math.max(current.bestScorePercent, normalizedScore),
      lastScorePercent: normalizedScore,
      lastCompletedAt: completedAt,
    },
  };
};

export const completeKangurPracticeSession = (input: {
  progress: KangurProgressState;
  operation: KangurPracticeOperation;
  correctAnswers: number;
  totalQuestions: number;
  greatThresholdPercent?: number;
}): KangurPracticeCompletionResult => {
  const safeTotalQuestions = Math.max(1, input.totalQuestions);
  const normalizedCorrectAnswers = Math.max(
    0,
    Math.min(input.correctAnswers, safeTotalQuestions),
  );
  const scorePercent = clampPercent(
    (normalizedCorrectAnswers / safeTotalQuestions) * 100,
  );
  const isPerfect = normalizedCorrectAnswers === safeTotalQuestions;
  const greatThresholdPercent = clampPercent(input.greatThresholdPercent ?? 60);
  const xpGained = isPerfect
    ? KANGUR_XP_REWARDS.perfect_game
    : scorePercent >= greatThresholdPercent
      ? KANGUR_XP_REWARDS.great_game
      : KANGUR_XP_REWARDS.good_game;
  const config = getKangurPracticeOperationConfig(input.operation);

  const updated = normalizeKangurProgressState({
    ...input.progress,
    totalXp: input.progress.totalXp + xpGained,
    gamesPlayed: input.progress.gamesPlayed + 1,
    perfectGames: isPerfect
      ? input.progress.perfectGames + 1
      : input.progress.perfectGames,
    lessonsCompleted: config.lessonComponentId
      ? input.progress.lessonsCompleted + 1
      : input.progress.lessonsCompleted,
    operationsPlayed: mergeUniqueStrings([
      ...input.progress.operationsPlayed,
      ...config.categories,
    ]),
    lessonMastery: config.lessonComponentId
      ? buildKangurLessonMasteryUpdate(
          input.progress,
          config.lessonComponentId,
          scorePercent,
        )
      : input.progress.lessonMastery,
  });

  const newBadges = checkKangurNewBadges(updated);
  updated.badges = mergeUniqueStrings([...updated.badges, ...newBadges]);

  return {
    updated,
    newBadges,
    xpGained,
    scorePercent,
    isPerfect,
    operation: input.operation,
  };
};
