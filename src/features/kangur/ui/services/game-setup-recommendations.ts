import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import {
  resolveLocalizedRecommendationActivityLabel,
  translateRecommendationWithFallback,
  type RecommendationTranslate,
} from '@/features/kangur/ui/services/recommendation-i18n';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
} from '@/features/kangur/ui/services/progress';
import type {
  KangurDifficulty,
  KangurMode,
  KangurOperation,
  KangurProgressState,
  KangurTrainingSelection,
} from '@/features/kangur/ui/types';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';

type KangurTrainingSetupRecommendation = {
  description: string;
  label: string;
  selection: KangurTrainingSelection;
  title: string;
};

type KangurModeSetupRecommendation = {
  description: string;
  label: string;
  mode: KangurMode;
  title: string;
};

type KangurRecommendationLocalizer = {
  locale?: string | null;
  translate?: RecommendationTranslate;
};

export const hasMatchingTrainingSelection = (
  selection: KangurTrainingSelection,
  suggestedSelection: KangurTrainingSelection | null
): boolean => {
  if (!suggestedSelection) {
    return false;
  }

  const selectedCategories = [...selection.categories].sort();
  const suggestedCategories = [...suggestedSelection.categories].sort();
  return (
    selection.count === suggestedSelection.count &&
    selection.difficulty === suggestedSelection.difficulty &&
    selectedCategories.length === suggestedCategories.length &&
    selectedCategories.every((category, index) => category === suggestedCategories[index])
  );
};

const TRAINING_CATEGORY_SET = new Set<KangurOperation>([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
]);

const LESSON_TO_TRAINING_CATEGORY: Partial<Record<KangurLessonComponentId, KangurOperation>> = {
  adding: 'addition',
  subtracting: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
};

const resolveRecommendedDifficulty = (accuracy: number): KangurDifficulty => {
  if (accuracy >= 85) {
    return 'hard';
  }
  if (accuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const resolveTrainingCategoryFromActivity = (activityKey: string | null | undefined): KangurOperation | null => {
  if (!activityKey) {
    return null;
  }

  const [, primary = ''] = activityKey.split(':');
  return TRAINING_CATEGORY_SET.has(primary as KangurOperation) ? (primary as KangurOperation) : null;
};

export const getRecommendedTrainingSetup = (
  progress: KangurProgressState,
  localizer?: KangurRecommendationLocalizer
): KangurTrainingSetupRecommendation => {
  const translate = localizer?.translate;
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const gamesPlayed = progress.gamesPlayed ?? 0;

  if (gamesPlayed <= 0) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'training.starter.description',
        'Łagodny start z dwiema kategoriami pomoże złapać rytm bez przeciążenia na pierwszej sesji.'
      ),
      label: translateRecommendationWithFallback(translate, 'training.starter.label', 'Start'),
      selection: {
        categories: ['addition', 'subtraction'],
        count: 5,
        difficulty: 'easy',
      },
      title: translateRecommendationWithFallback(
        translate,
        'training.starter.title',
        'Polecany trening na start'
      ),
    };
  }

  const weakestLesson = Object.entries(progress.lessonMastery)
    .filter(([, entry]) => entry.attempts > 0 && entry.masteryPercent < 80)
    .sort((left, right) => left[1].masteryPercent - right[1].masteryPercent)[0];

  if (weakestLesson) {
    const [componentId, entry] = weakestLesson;
    const category = LESSON_TO_TRAINING_CATEGORY[componentId as KangurLessonComponentId];

    if (category) {
      const lesson = KANGUR_LESSON_LIBRARY[componentId as KangurLessonComponentId];
      const lessonTitle = getLocalizedKangurLessonTitle(
        componentId,
        localizer?.locale,
        lesson.title
      );
      return {
        description: translateRecommendationWithFallback(
          translate,
          'training.weakestLesson.description',
          `Najsłabszy temat to ${lessonTitle.toLowerCase()} (${entry.masteryPercent}%). Jedna skupiona sesja szybciej odbuduje ten obszar.`,
          {
            masteryPercent: entry.masteryPercent,
            title: lessonTitle.toLowerCase(),
          }
        ),
        label: translateRecommendationWithFallback(
          translate,
          'training.weakestLesson.label',
          'Nadrabiamy lekcję'
        ),
        selection: {
          categories: [category],
          count: entry.masteryPercent < 60 ? 10 : 5,
          difficulty: resolveRecommendedDifficulty(Math.min(averageAccuracy, entry.lastScorePercent)),
        },
        title: translateRecommendationWithFallback(
          translate,
          'training.weakestLesson.title',
          `Polecany trening: ${lessonTitle}`,
          {
            title: lessonTitle,
          }
        ),
      };
    }
  }

  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  const topActivityCategory = resolveTrainingCategoryFromActivity(topActivity?.key);
  if (topActivity && topActivityCategory) {
    const activityLabel = resolveLocalizedRecommendationActivityLabel({
      activityKey: topActivity.key,
      fallbackLabel: topActivity.label,
      translate,
    });
    return {
      description: translateRecommendationWithFallback(
        translate,
        'training.topActivity.description',
        `${activityLabel} daje teraz średnio ${topActivity.averageXpPerSession} XP na grę. To najmocniejszy kandydat na kolejną sesję.`,
        {
          activity: activityLabel,
          averageXpPerSession: topActivity.averageXpPerSession,
        }
      ),
      label: translateRecommendationWithFallback(
        translate,
        'training.topActivity.label',
        'Mocna passa'
      ),
      selection: {
        categories: [topActivityCategory],
        count: topActivity.averageAccuracy >= 85 ? 15 : 10,
        difficulty: resolveRecommendedDifficulty(topActivity.averageAccuracy),
      },
      title: translateRecommendationWithFallback(
        translate,
        'training.topActivity.title',
        `Polecany trening: ${activityLabel}`,
        {
          activity: activityLabel,
        }
      ),
    };
  }

  const topTrack = getProgressBadgeTrackSummaries(progress, { maxTracks: 1 })[0] ?? null;
  return {
    description: topTrack?.nextBadge
      ? translateRecommendationWithFallback(
          translate,
          'training.mixed.descriptionWithTrack',
          `Tor ${topTrack.label} jest najbliżej kolejnej odznaki. Mieszany trening najlepiej podtrzyma postęp w kilku kategoriach naraz.`,
          {
            track: topTrack.label,
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'training.mixed.descriptionDefault',
          'Mieszany trening utrzyma rytm i pomoże złapać kolejne punkty XP w kilku kategoriach naraz.'
        ),
    label: topTrack
      ? translateRecommendationWithFallback(
          translate,
          'training.mixed.labelTrack',
          'Tor odznak'
        )
      : translateRecommendationWithFallback(translate, 'training.mixed.labelDefault', 'Tempo'),
    selection: {
      categories: ['addition', 'subtraction', 'multiplication', 'division'],
      count: 10,
      difficulty: resolveRecommendedDifficulty(averageAccuracy),
    },
    title: translateRecommendationWithFallback(
      translate,
      'training.mixed.title',
      'Polecany trening mieszany'
    ),
  };
};

export const getRecommendedKangurMode = (
  progress: KangurProgressState,
  localizer?: KangurRecommendationLocalizer
): KangurModeSetupRecommendation => {
  const translate = localizer?.translate;
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const gamesPlayed = progress.gamesPlayed ?? 0;
  const currentWinStreak = progress.currentWinStreak ?? 0;
  const perfectGames = progress.perfectGames ?? 0;

  if (gamesPlayed <= 2 || averageAccuracy < 60) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.gentle.description',
        'Łatwiejszy zestaw treningowy pozwoli wejść w formule Kangura bez zbyt ostrego progu trudności.'
      ),
      label: translateRecommendationWithFallback(translate, 'mode.gentle.label', 'Łagodny start'),
      mode: 'training_3pt',
      title: translateRecommendationWithFallback(
        translate,
        'mode.gentle.title',
        'Polecamy zacząć od treningu 3-punktowego'
      ),
    };
  }

  if (gamesPlayed >= 12 && averageAccuracy >= 90 && currentWinStreak >= 3 && perfectGames >= 2) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.competitionReady.description',
        'Masz mocne tempo i wysoką skuteczność. Pełny test konkursowy powinien dać najlepszy progres.'
      ),
      label: translateRecommendationWithFallback(
        translate,
        'mode.competitionReady.label',
        'Gotowość konkursowa'
      ),
      mode: 'full_test_2024',
      title: translateRecommendationWithFallback(
        translate,
        'mode.competitionReady.title',
        'Polecamy pełny test konkursowy'
      ),
    };
  }

  if (averageAccuracy >= 86) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.challenge.description',
        'Twoja skuteczność jest już wysoka. Zestaw za 5 punktów da lepsze wyzwanie i mocniejszą nagrodę.'
      ),
      label: translateRecommendationWithFallback(translate, 'mode.challenge.label', 'Wyzwanie'),
      mode: 'original_5pt_2024',
      title: translateRecommendationWithFallback(
        translate,
        'mode.challenge.title',
        'Polecamy zestaw 5-punktowy'
      ),
    };
  }

  if (averageAccuracy >= 72) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.strongStep.description',
        'Średni poziom trudności najlepiej podbije wynik bez zbyt ostrego skoku.'
      ),
      label: translateRecommendationWithFallback(translate, 'mode.strongStep.label', 'Mocny krok'),
      mode: 'original_4pt_2024',
      title: translateRecommendationWithFallback(
        translate,
        'mode.strongStep.title',
        'Polecamy zestaw 4-punktowy'
      ),
    };
  }

  return {
    description: translateRecommendationWithFallback(
      translate,
      'mode.steadyStep.description',
      'Zestaw 3-punktowy da jeszcze konkursowy rytm, ale pozostanie bezpieczniejszy niż trudniejsze warianty.'
    ),
    label: translateRecommendationWithFallback(translate, 'mode.steadyStep.label', 'Pewny krok'),
    mode: 'original_2024',
    title: translateRecommendationWithFallback(
      translate,
      'mode.steadyStep.title',
      'Polecamy zestaw 3-punktowy'
    ),
  };
};
