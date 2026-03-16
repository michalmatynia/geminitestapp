import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
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
  progress: KangurProgressState
): KangurTrainingSetupRecommendation => {
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const gamesPlayed = progress.gamesPlayed ?? 0;

  if (gamesPlayed <= 0) {
    return {
      description: 'Łagodny start z dwiema kategoriami pomoże złapać rytm bez przeciążenia na pierwszej sesji.',
      label: 'Start',
      selection: {
        categories: ['addition', 'subtraction'],
        count: 5,
        difficulty: 'easy',
      },
      title: 'Polecany trening na start',
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
      return {
        description: `Najsłabszy temat to ${lesson.title.toLowerCase()} (${entry.masteryPercent}%). Jedna skupiona sesja szybciej odbuduje ten obszar.`,
        label: 'Nadrabiamy lekcję',
        selection: {
          categories: [category],
          count: entry.masteryPercent < 60 ? 10 : 5,
          difficulty: resolveRecommendedDifficulty(Math.min(averageAccuracy, entry.lastScorePercent)),
        },
        title: `Polecany trening: ${lesson.title}`,
      };
    }
  }

  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  const topActivityCategory = resolveTrainingCategoryFromActivity(topActivity?.key);
  if (topActivity && topActivityCategory) {
    return {
      description: `${topActivity.label} daje teraz średnio ${topActivity.averageXpPerSession} XP na grę. To najmocniejszy kandydat na kolejną sesję.`,
      label: 'Mocna passa',
      selection: {
        categories: [topActivityCategory],
        count: topActivity.averageAccuracy >= 85 ? 15 : 10,
        difficulty: resolveRecommendedDifficulty(topActivity.averageAccuracy),
      },
      title: `Polecany trening: ${topActivity.label}`,
    };
  }

  const topTrack = getProgressBadgeTrackSummaries(progress, { maxTracks: 1 })[0] ?? null;
  return {
    description: topTrack?.nextBadge
      ? `Tor ${topTrack.label} jest najbliżej kolejnej odznaki. Mieszany trening najlepiej podtrzyma postęp w kilku kategoriach naraz.`
      : 'Mieszany trening utrzyma rytm i pomoże złapać kolejne punkty XP w kilku kategoriach naraz.',
    label: topTrack ? 'Tor odznak' : 'Tempo',
    selection: {
      categories: ['addition', 'subtraction', 'multiplication', 'division'],
      count: 10,
      difficulty: resolveRecommendedDifficulty(averageAccuracy),
    },
    title: 'Polecany trening mieszany',
  };
};

export const getRecommendedKangurMode = (
  progress: KangurProgressState
): KangurModeSetupRecommendation => {
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const gamesPlayed = progress.gamesPlayed ?? 0;
  const currentWinStreak = progress.currentWinStreak ?? 0;
  const perfectGames = progress.perfectGames ?? 0;

  if (gamesPlayed <= 2 || averageAccuracy < 60) {
    return {
      description: 'Łatwiejszy zestaw treningowy pozwoli wejść w formule Kangura bez zbyt ostrego progu trudności.',
      label: 'Łagodny start',
      mode: 'training_3pt',
      title: 'Polecamy zacząć od treningu 3-punktowego',
    };
  }

  if (gamesPlayed >= 12 && averageAccuracy >= 90 && currentWinStreak >= 3 && perfectGames >= 2) {
    return {
      description: 'Masz mocne tempo i wysoką skuteczność. Pełny test konkursowy powinien dać najlepszy progres.',
      label: 'Gotowość konkursowa',
      mode: 'full_test_2024',
      title: 'Polecamy pełny test konkursowy',
    };
  }

  if (averageAccuracy >= 86) {
    return {
      description: 'Twoja skuteczność jest już wysoka. Zestaw za 5 punktów da lepsze wyzwanie i mocniejszą nagrodę.',
      label: 'Wyzwanie',
      mode: 'original_5pt_2024',
      title: 'Polecamy zestaw 5-punktowy',
    };
  }

  if (averageAccuracy >= 72) {
    return {
      description: 'Średni poziom trudności najlepiej podbije wynik bez zbyt ostrego skoku.',
      label: 'Mocny krok',
      mode: 'original_4pt_2024',
      title: 'Polecamy zestaw 4-punktowy',
    };
  }

  return {
    description: 'Zestaw 3-punktowy da jeszcze konkursowy rytm, ale pozostanie bezpieczniejszy niż trudniejsze warianty.',
    label: 'Pewny krok',
    mode: 'original_2024',
    title: 'Polecamy zestaw 3-punktowy',
  };
};
