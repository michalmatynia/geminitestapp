import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import {
  type KangurRecommendationLocalizer,
  resolveLocalizedRecommendationActivityLabel,
  translateRecommendationWithFallback,
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
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

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

type KangurGameSetupRecommendationFallbackCopy = {
  training: {
    starter: {
      description: string;
      label: string;
      title: string;
    };
    weakestLesson: {
      description: (title: string, masteryPercent: number) => string;
      label: string;
      title: (title: string) => string;
    };
    topActivity: {
      description: (activity: string, averageXpPerSession: number) => string;
      label: string;
      title: (activity: string) => string;
    };
    mixed: {
      descriptionDefault: string;
      descriptionWithTrack: (track: string) => string;
      labelDefault: string;
      labelTrack: string;
      title: string;
    };
  };
  mode: {
    gentle: {
      description: string;
      label: string;
      title: string;
    };
    competitionReady: {
      description: string;
      label: string;
      title: string;
    };
    challenge: {
      description: string;
      label: string;
      title: string;
    };
    strongStep: {
      description: string;
      label: string;
      title: string;
    };
    steadyStep: {
      description: string;
      label: string;
      title: string;
    };
  };
};

const getGameSetupRecommendationFallbackCopy = (
  locale: string | null | undefined
): KangurGameSetupRecommendationFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'uk') {
    return {
      training: {
        starter: {
          description:
            'М\'який старт з двома категоріями допоможе зловити ритм без перевантаження на першій сесії.',
          label: 'Старт',
          title: 'Рекомендоване стартове тренування',
        },
        weakestLesson: {
          description: (title, masteryPercent) =>
            `Найслабша тема - ${title} (${masteryPercent}%). Одна зосереджена сесія швидше відновить цю зону.`,
          label: 'Надолужуємо урок',
          title: (title) => `Рекомендоване тренування: ${title}`,
        },
        topActivity: {
          description: (activity, averageXpPerSession) =>
            `${activity} зараз дає в середньому ${averageXpPerSession} XP за гру. Це найсильніший кандидат на наступну сесію.`,
          label: 'Сильна серія',
          title: (activity) => `Рекомендоване тренування: ${activity}`,
        },
        mixed: {
          descriptionDefault:
            'Змішане тренування тримає ритм і допомагає збирати більше XP у кількох категоріях одночасно.',
          descriptionWithTrack: (track) =>
            `Шлях ${track} найближче до наступного значка. Змішане тренування найкраще підтримує прогрес у кількох категоріях одночасно.`,
          labelDefault: 'Темп',
          labelTrack: 'Шлях значків',
          title: 'Рекомендоване змішане тренування',
        },
      },
      mode: {
        gentle: {
          description:
            'Легший тренувальний набір є найбезпечнішим входом у режим Кенгуру без різкого стрибка складності.',
          label: 'М\'який старт',
          title: 'Рекомендуємо почати з 3-бального тренувального набору',
        },
        competitionReady: {
          description:
            'У тебе сильний темп і висока точність. Повний конкурсний тест має дати найкращий прогрес.',
          label: 'Готовність до конкурсу',
          title: 'Рекомендуємо повний конкурсний тест',
        },
        challenge: {
          description:
            'Твоя точність уже висока. Набір за 5 балів дасть краще випробування й сильнішу нагороду.',
          label: 'Виклик',
          title: 'Рекомендуємо набір за 5 балів',
        },
        strongStep: {
          description:
            'Середній рівень складності має покращити результат без надто різкого стрибка.',
          label: 'Сильний крок',
          title: 'Рекомендуємо набір за 4 бали',
        },
        steadyStep: {
          description:
            'Набір за 3 бали все ще дає конкурсний ритм, але лишається безпечнішим за складніші варіанти.',
          label: 'Надійний крок',
          title: 'Рекомендуємо набір за 3 бали',
        },
      },
    };
  }

  if (normalizedLocale === 'de') {
    return {
      training: {
        starter: {
          description:
            'Ein sanfter Start mit zwei Kategorien hilft beim Rhythmus, ohne in der ersten Sitzung zu uberfordern.',
          label: 'Startkurs',
          title: 'Empfohlenes Starttraining',
        },
        weakestLesson: {
          description: (title, masteryPercent) =>
            `Das schwachste Thema ist ${title} (${masteryPercent}%). Eine konzentrierte Sitzung baut diesen Bereich schneller wieder auf.`,
          label: 'Lektion nachholen',
          title: (title) => `Empfohlenes Training: ${title}`,
        },
        topActivity: {
          description: (activity, averageXpPerSession) =>
            `${activity} bringt derzeit durchschnittlich ${averageXpPerSession} XP pro Spiel. Das ist der starkste Kandidat fur die nachste Sitzung.`,
          label: 'Starke Serie',
          title: (activity) => `Empfohlenes Training: ${activity}`,
        },
        mixed: {
          descriptionDefault:
            'Gemischtes Training halt den Rhythmus und hilft, in mehreren Kategorien gleichzeitig weitere XP zu sammeln.',
          descriptionWithTrack: (track) =>
            `Der ${track}-Pfad ist dem nachsten Abzeichen am nachsten. Gemischtes Training halt den Fortschritt in mehreren Kategorien gleichzeitig in Bewegung.`,
          labelDefault: 'Tempo',
          labelTrack: 'Abzeichenpfad',
          title: 'Empfohlenes gemischtes Training',
        },
      },
      mode: {
        gentle: {
          description:
            'Ein leichteres Trainingsset ist der sicherste Einstieg in den Kanguru-Modus ohne zu starken Schwierigkeitssprung.',
          label: 'Sanfter Start',
          title: 'Wir empfehlen den Einstieg mit dem 3-Punkte-Trainingsset',
        },
        competitionReady: {
          description:
            'Du hast ein starkes Tempo und hohe Genauigkeit. Der volle Wettbewerbstest sollte den besten Fortschritt bringen.',
          label: 'Wettbewerbsbereit',
          title: 'Wir empfehlen den vollen Wettbewerbstest',
        },
        challenge: {
          description:
            'Deine Genauigkeit ist bereits hoch. Das 5-Punkte-Set bietet eine bessere Herausforderung und eine starkere Belohnung.',
          label: 'Herausforderung',
          title: 'Wir empfehlen das 5-Punkte-Set',
        },
        strongStep: {
          description:
            'Ein mittelschweres Set sollte das Ergebnis verbessern, ohne zu abrupt anzusteigen.',
          label: 'Starker Schritt',
          title: 'Wir empfehlen das 4-Punkte-Set',
        },
        steadyStep: {
          description:
            'Das 3-Punkte-Set gibt immer noch Wettbewerbsrhythmus, bleibt aber sicherer als die schwierigeren Varianten.',
          label: 'Sicherer Schritt',
          title: 'Wir empfehlen das 3-Punkte-Set',
        },
      },
    };
  }

  if (normalizedLocale === 'en') {
    return {
      training: {
        starter: {
          description:
            'A gentle start with two categories helps build rhythm without overload in the first session.',
          label: 'Start',
          title: 'Recommended starter practice',
        },
        weakestLesson: {
          description: (title, masteryPercent) =>
            `The weakest topic is ${title} (${masteryPercent}%). One focused session will rebuild this area faster.`,
          label: 'Recover a lesson',
          title: (title) => `Recommended practice: ${title}`,
        },
        topActivity: {
          description: (activity, averageXpPerSession) =>
            `${activity} is currently worth about ${averageXpPerSession} XP per game. It is the strongest candidate for the next session.`,
          label: 'Strong streak',
          title: (activity) => `Recommended practice: ${activity}`,
        },
        mixed: {
          descriptionDefault:
            'Mixed practice keeps the rhythm going and helps collect more XP across several categories at once.',
          descriptionWithTrack: (track) =>
            `The ${track} track is closest to the next badge. Mixed practice keeps progress moving across several categories at once.`,
          labelDefault: 'Pace',
          labelTrack: 'Badge track',
          title: 'Recommended mixed practice',
        },
      },
      mode: {
        gentle: {
          description:
            'An easier training set is the safest way into Kangaroo mode without a sharp jump in difficulty.',
          label: 'Gentle start',
          title: 'We recommend starting with the 3-point training set',
        },
        competitionReady: {
          description:
            'You have strong pace and high accuracy. The full competition test should deliver the best progress.',
          label: 'Competition ready',
          title: 'We recommend the full competition test',
        },
        challenge: {
          description:
            'Your accuracy is already high. The 5-point set offers a better challenge and a stronger reward.',
          label: 'Challenge',
          title: 'We recommend the 5-point set',
        },
        strongStep: {
          description:
            'A medium-difficulty set should improve the score without too abrupt a jump.',
          label: 'Strong step',
          title: 'We recommend the 4-point set',
        },
        steadyStep: {
          description:
            'The 3-point set still gives a competition rhythm, but stays safer than the harder variants.',
          label: 'Steady step',
          title: 'We recommend the 3-point set',
        },
      },
    };
  }

  return {
    training: {
      starter: {
        description:
          'Łagodny start z dwiema kategoriami pomoże złapać rytm bez przeciążenia na pierwszej sesji.',
        label: 'Start',
        title: 'Polecany trening na start',
      },
      weakestLesson: {
        description: (title, masteryPercent) =>
          `Najsłabszy temat to ${title} (${masteryPercent}%). Jedna skupiona sesja szybciej odbuduje ten obszar.`,
        label: 'Nadrabiamy lekcję',
        title: (title) => `Polecany trening: ${title}`,
      },
      topActivity: {
        description: (activity, averageXpPerSession) =>
          `${activity} daje teraz średnio ${averageXpPerSession} XP na grę. To najmocniejszy kandydat na kolejną sesję.`,
        label: 'Mocna passa',
        title: (activity) => `Polecany trening: ${activity}`,
      },
      mixed: {
        descriptionDefault:
          'Mieszany trening utrzyma rytm i pomoże złapać kolejne punkty XP w kilku kategoriach naraz.',
        descriptionWithTrack: (track) =>
          `Tor ${track} jest najbliżej kolejnej odznaki. Mieszany trening najlepiej podtrzyma postęp w kilku kategoriach naraz.`,
        labelDefault: 'Tempo',
        labelTrack: 'Tor odznak',
        title: 'Polecany trening mieszany',
      },
    },
    mode: {
      gentle: {
        description:
          'Łatwiejszy zestaw treningowy pozwoli wejść w formule Kangura bez zbyt ostrego progu trudności.',
        label: 'Łagodny start',
        title: 'Polecamy zacząć od treningu 3-punktowego',
      },
      competitionReady: {
        description:
          'Masz mocne tempo i wysoką skuteczność. Pełny test konkursowy powinien dać najlepszy progres.',
        label: 'Gotowość konkursowa',
        title: 'Polecamy pełny test konkursowy',
      },
      challenge: {
        description:
          'Twoja skuteczność jest już wysoka. Zestaw za 5 punktów da lepsze wyzwanie i mocniejszą nagrodę.',
        label: 'Wyzwanie',
        title: 'Polecamy zestaw 5-punktowy',
      },
      strongStep: {
        description:
          'Średni poziom trudności najlepiej podbije wynik bez zbyt ostrego skoku.',
        label: 'Mocny krok',
        title: 'Polecamy zestaw 4-punktowy',
      },
      steadyStep: {
        description:
          'Zestaw 3-punktowy da jeszcze konkursowy rytm, ale pozostanie bezpieczniejszy niż trudniejsze warianty.',
        label: 'Pewny krok',
        title: 'Polecamy zestaw 3-punktowy',
      },
    },
  };
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
  const fallbackCopy = getGameSetupRecommendationFallbackCopy(localizer?.locale);
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const gamesPlayed = progress.gamesPlayed ?? 0;

  if (gamesPlayed <= 0) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'training.starter.description',
        fallbackCopy.training.starter.description
      ),
      label: translateRecommendationWithFallback(
        translate,
        'training.starter.label',
        fallbackCopy.training.starter.label
      ),
      selection: {
        categories: ['addition', 'subtraction'],
        count: 5,
        difficulty: 'easy',
      },
      title: translateRecommendationWithFallback(
        translate,
        'training.starter.title',
        fallbackCopy.training.starter.title
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
          fallbackCopy.training.weakestLesson.description(
            lessonTitle.toLowerCase(),
            entry.masteryPercent
          ),
          {
            masteryPercent: entry.masteryPercent,
            title: lessonTitle.toLowerCase(),
          }
        ),
        label: translateRecommendationWithFallback(
          translate,
          'training.weakestLesson.label',
          fallbackCopy.training.weakestLesson.label
        ),
        selection: {
          categories: [category],
          count: entry.masteryPercent < 60 ? 10 : 5,
          difficulty: resolveRecommendedDifficulty(Math.min(averageAccuracy, entry.lastScorePercent)),
        },
        title: translateRecommendationWithFallback(
          translate,
          'training.weakestLesson.title',
          fallbackCopy.training.weakestLesson.title(lessonTitle),
          {
            title: lessonTitle,
          }
        ),
      };
    }
  }

  const progressLocalizer = { translate: localizer?.progressTranslate };
  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
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
        fallbackCopy.training.topActivity.description(
          activityLabel,
          topActivity.averageXpPerSession
        ),
        {
          activity: activityLabel,
          averageXpPerSession: topActivity.averageXpPerSession,
        }
      ),
      label: translateRecommendationWithFallback(
        translate,
        'training.topActivity.label',
        fallbackCopy.training.topActivity.label
      ),
      selection: {
        categories: [topActivityCategory],
        count: topActivity.averageAccuracy >= 85 ? 15 : 10,
        difficulty: resolveRecommendedDifficulty(topActivity.averageAccuracy),
      },
      title: translateRecommendationWithFallback(
        translate,
        'training.topActivity.title',
        fallbackCopy.training.topActivity.title(activityLabel),
        {
          activity: activityLabel,
        }
      ),
    };
  }

  const topTrack = getProgressBadgeTrackSummaries(
    progress,
    { maxTracks: 1 },
    progressLocalizer
  )[0] ?? null;
  return {
    description: topTrack?.nextBadge
      ? translateRecommendationWithFallback(
          translate,
          'training.mixed.descriptionWithTrack',
          fallbackCopy.training.mixed.descriptionWithTrack(topTrack.label),
          {
            track: topTrack.label,
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'training.mixed.descriptionDefault',
          fallbackCopy.training.mixed.descriptionDefault
        ),
    label: topTrack
      ? translateRecommendationWithFallback(
          translate,
          'training.mixed.labelTrack',
          fallbackCopy.training.mixed.labelTrack
        )
      : translateRecommendationWithFallback(
          translate,
          'training.mixed.labelDefault',
          fallbackCopy.training.mixed.labelDefault
        ),
    selection: {
      categories: ['addition', 'subtraction', 'multiplication', 'division'],
      count: 10,
      difficulty: resolveRecommendedDifficulty(averageAccuracy),
    },
    title: translateRecommendationWithFallback(
      translate,
      'training.mixed.title',
      fallbackCopy.training.mixed.title
    ),
  };
};

export const getRecommendedKangurMode = (
  progress: KangurProgressState,
  localizer?: KangurRecommendationLocalizer
): KangurModeSetupRecommendation => {
  const translate = localizer?.translate;
  const fallbackCopy = getGameSetupRecommendationFallbackCopy(localizer?.locale);
  const averageAccuracy = getProgressAverageAccuracy(progress);
  const gamesPlayed = progress.gamesPlayed ?? 0;
  const currentWinStreak = progress.currentWinStreak ?? 0;
  const perfectGames = progress.perfectGames ?? 0;

  if (gamesPlayed <= 2 || averageAccuracy < 60) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.gentle.description',
        fallbackCopy.mode.gentle.description
      ),
      label: translateRecommendationWithFallback(
        translate,
        'mode.gentle.label',
        fallbackCopy.mode.gentle.label
      ),
      mode: 'training_3pt',
      title: translateRecommendationWithFallback(
        translate,
        'mode.gentle.title',
        fallbackCopy.mode.gentle.title
      ),
    };
  }

  if (gamesPlayed >= 12 && averageAccuracy >= 90 && currentWinStreak >= 3 && perfectGames >= 2) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.competitionReady.description',
        fallbackCopy.mode.competitionReady.description
      ),
      label: translateRecommendationWithFallback(
        translate,
        'mode.competitionReady.label',
        fallbackCopy.mode.competitionReady.label
      ),
      mode: 'full_test_2024',
      title: translateRecommendationWithFallback(
        translate,
        'mode.competitionReady.title',
        fallbackCopy.mode.competitionReady.title
      ),
    };
  }

  if (averageAccuracy >= 86) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.challenge.description',
        fallbackCopy.mode.challenge.description
      ),
      label: translateRecommendationWithFallback(
        translate,
        'mode.challenge.label',
        fallbackCopy.mode.challenge.label
      ),
      mode: 'original_5pt_2024',
      title: translateRecommendationWithFallback(
        translate,
        'mode.challenge.title',
        fallbackCopy.mode.challenge.title
      ),
    };
  }

  if (averageAccuracy >= 72) {
    return {
      description: translateRecommendationWithFallback(
        translate,
        'mode.strongStep.description',
        fallbackCopy.mode.strongStep.description
      ),
      label: translateRecommendationWithFallback(
        translate,
        'mode.strongStep.label',
        fallbackCopy.mode.strongStep.label
      ),
      mode: 'original_4pt_2024',
      title: translateRecommendationWithFallback(
        translate,
        'mode.strongStep.title',
        fallbackCopy.mode.strongStep.title
      ),
    };
  }

  return {
    description: translateRecommendationWithFallback(
      translate,
      'mode.steadyStep.description',
      fallbackCopy.mode.steadyStep.description
    ),
    label: translateRecommendationWithFallback(
      translate,
      'mode.steadyStep.label',
      fallbackCopy.mode.steadyStep.label
    ),
    mode: 'original_2024',
    title: translateRecommendationWithFallback(
      translate,
      'mode.steadyStep.title',
      fallbackCopy.mode.steadyStep.title
    ),
  };
};
