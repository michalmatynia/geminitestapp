import type { TranslationValues } from 'use-intl';

import { buildLessonMasteryInsights } from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import type { KangurAssignmentPlan } from '@/features/kangur/shared/contracts/kangur-quests';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurAssignmentTranslationValues = TranslationValues;

type KangurAssignmentLocalizer = {
  locale?: string | null;
  translate?: (key: string, values?: KangurAssignmentTranslationValues) => string;
  resolveLessonTitle?: (componentId: string, fallbackTitle: string) => string;
};

type KangurAssignmentFallbackCopy = {
  starter: {
    actionOpenLesson: string;
    description: string;
    progressLabel: string;
    questLabel: string;
    target: string;
    title: string;
  };
  retry: {
    actionOpenLesson: string;
    descriptionCritical: (masteryPercent: number) => string;
    descriptionDefault: (masteryPercent: number) => string;
    progressLabel: (masteryPercent: number, targetPercent: number) => string;
    questLabelCritical: string;
    questLabelDefault: string;
    targetPrimary: string;
    targetSecondary: string;
    title: (emoji: string, title: string) => string;
  };
  mixed: {
    actionStartTraining: string;
    descriptionDefault: string;
    descriptionNeedsPractice: string;
    progressLabel: (gamesPlayed: number) => string;
    progressLabelEmpty: string;
    questLabelDefault: string;
    questLabelNeedsPractice: string;
    target: (questionCount: number) => string;
    title: string;
  };
  retain: {
    actionRepeatLesson: string;
    description: (title: string, masteryPercent: number) => string;
    progressLabel: (masteryPercent: number) => string;
    questLabel: string;
    target: string;
    title: (emoji: string) => string;
  };
};

const getAssignmentFallbackCopy = (
  locale: string | null | undefined
): KangurAssignmentFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'uk') {
    return {
      starter: {
        actionOpenLesson: 'Відкрити урок',
        description:
          'Запусти перший урок, щоб почати збирати дані про сильні сторони учня.',
        progressLabel: 'Прогрес: 0/1 урок',
        questLabel: 'Стартова місія',
        target: '1 урок',
        title: 'Перший стартовий урок',
      },
      retry: {
        actionOpenLesson: 'Відкрити урок',
        descriptionCritical: (masteryPercent) =>
          `Це одна з найслабших зон (${masteryPercent}%). Потрібне швидке повторення й ще одна спроба.`,
        descriptionDefault: (masteryPercent) =>
          `Урок ще має запас (${masteryPercent}%). Одне повторення повинно стабілізувати результат.`,
        progressLabel: (masteryPercent, targetPercent) =>
          `Прогрес: ${masteryPercent}% / ${targetPercent}%`,
        questLabelCritical: 'Рятувальна місія',
        questLabelDefault: 'Місія повторення',
        targetPrimary: '1 повторення + результат мін. 75%',
        targetSecondary: '1 повторення + результат мін. 80%',
        title: (emoji, title) => `${emoji} Повторення: ${title}`,
      },
      mixed: {
        actionStartTraining: 'Почати тренування',
        descriptionDefault:
          'Підтримай ритм навчання коротшим змішаним тренуванням з кількома типами завдань.',
        descriptionNeedsPractice:
          'Після повторень запусти змішане тренування, щоб перевірити, чи навички переносяться в практику.',
        progressLabel: (gamesPlayed) => `Ритм дня: ${gamesPlayed} ігор`,
        progressLabelEmpty: 'Ритм дня: почни з першої гри',
        questLabelDefault: 'Квест ритму',
        questLabelNeedsPractice: 'Місія дня',
        target: (questionCount) => `${questionCount} питань`,
        title: 'Змішане тренування',
      },
      retain: {
        actionRepeatLesson: 'Повтори урок',
        description: (title, masteryPercent) =>
          `${title} уже стабільний (${masteryPercent}%). Коротке закріплення допоможе втримати рівень.`,
        progressLabel: (masteryPercent) => `Опановування: ${masteryPercent}%`,
        questLabel: 'Квест закріплення',
        target: '1 швидке повторення',
        title: (emoji) => `${emoji} Закріпи сильну сторону`,
      },
    };
  }

  if (normalizedLocale === 'de') {
    return {
      starter: {
        actionOpenLesson: 'Lektion offnen',
        description:
          'Starte die erste Lektion, um Daten uber die Starken des Lernenden zu sammeln.',
        progressLabel: 'Fortschritt: 0/1 Lektion',
        questLabel: 'Startmission',
        target: '1 Lektion',
        title: 'Erste Startlektion',
      },
      retry: {
        actionOpenLesson: 'Lektion offnen',
        descriptionCritical: (masteryPercent) =>
          `Das ist einer der schwachsten Bereiche (${masteryPercent}%). Eine schnelle Wiederholung und ein weiterer Versuch sind notig.`,
        descriptionDefault: (masteryPercent) =>
          `Die Lektion hat noch Luft nach oben (${masteryPercent}%). Eine Wiederholung sollte das Ergebnis stabilisieren.`,
        progressLabel: (masteryPercent, targetPercent) =>
          `Fortschritt: ${masteryPercent}% / ${targetPercent}%`,
        questLabelCritical: 'Rettungsmission',
        questLabelDefault: 'Wiederholungsmission',
        targetPrimary: '1 Wiederholung + min. 75% Ergebnis',
        targetSecondary: '1 Wiederholung + min. 80% Ergebnis',
        title: (emoji, title) => `${emoji} Wiederholung: ${title}`,
      },
      mixed: {
        actionStartTraining: 'Training starten',
        descriptionDefault:
          'Halte den Lernrhythmus mit einem kurzeren gemischten Training uber mehrere Aufgabentypen aufrecht.',
        descriptionNeedsPractice:
          'Starte nach den Wiederholungen ein gemischtes Training, um zu prufen, ob sich die Fahigkeiten in die Praxis ubertragen.',
        progressLabel: (gamesPlayed) => `Rhythmus des Tages: ${gamesPlayed} Spiele`,
        progressLabelEmpty: 'Rhythmus des Tages: starte mit dem ersten Spiel',
        questLabelDefault: 'Rhythmus-Quest',
        questLabelNeedsPractice: 'Mission des Tages',
        target: (questionCount) => `${questionCount} Fragen`,
        title: 'Gemischtes Training',
      },
      retain: {
        actionRepeatLesson: 'Lektion wiederholen',
        description: (title, masteryPercent) =>
          `${title} ist stabil (${masteryPercent}%). Eine kurze Festigung hilft, das Niveau zu halten.`,
        progressLabel: (masteryPercent) => `Beherrschung: ${masteryPercent}%`,
        questLabel: 'Erhaltungs-Quest',
        target: '1 kurze Wiederholung',
        title: (emoji) => `${emoji} Starke festigen`,
      },
    };
  }

  if (normalizedLocale === 'en') {
    return {
      starter: {
        actionOpenLesson: 'Open lesson',
        description:
          'Launch the first lesson to start collecting data about the learner\'s strengths.',
        progressLabel: 'Progress: 0/1 lesson',
        questLabel: 'Starter mission',
        target: '1 lesson',
        title: 'First starter lesson',
      },
      retry: {
        actionOpenLesson: 'Open lesson',
        descriptionCritical: (masteryPercent) =>
          `This is one of the weakest areas (${masteryPercent}%). It needs a quick review and another attempt.`,
        descriptionDefault: (masteryPercent) =>
          `This lesson still has room to grow (${masteryPercent}%). One review should stabilize the result.`,
        progressLabel: (masteryPercent, targetPercent) =>
          `Progress: ${masteryPercent}% / ${targetPercent}%`,
        questLabelCritical: 'Recovery mission',
        questLabelDefault: 'Review mission',
        targetPrimary: '1 review + min. 75% score',
        targetSecondary: '1 review + min. 80% score',
        title: (emoji, title) => `${emoji} Review: ${title}`,
      },
      mixed: {
        actionStartTraining: 'Start training',
        descriptionDefault:
          'Keep the learning rhythm with a shorter mixed training session covering several task types.',
        descriptionNeedsPractice:
          'After the reviews, start mixed training to check whether the skills transfer into practice.',
        progressLabel: (gamesPlayed) => `Daily rhythm: ${gamesPlayed} games`,
        progressLabelEmpty: 'Daily rhythm: start with the first game',
        questLabelDefault: 'Rhythm quest',
        questLabelNeedsPractice: 'Mission of the day',
        target: (questionCount) => `${questionCount} questions`,
        title: 'Mixed training',
      },
      retain: {
        actionRepeatLesson: 'Repeat lesson',
        description: (title, masteryPercent) =>
          `${title} is stable (${masteryPercent}%). A short review will help keep that level.`,
        progressLabel: (masteryPercent) => `Mastery: ${masteryPercent}%`,
        questLabel: 'Retention quest',
        target: '1 quick review',
        title: (emoji) => `${emoji} Reinforce a strength`,
      },
    };
  }

  return {
    starter: {
      actionOpenLesson: 'Otwórz lekcję',
      description:
        'Uruchom pierwszą lekcję, aby zacząć zbierać dane o mocnych stronach ucznia.',
      progressLabel: 'Postęp: 0/1 lekcja',
      questLabel: 'Misja startowa',
      target: '1 lekcja',
      title: 'Pierwsza lekcja startowa',
    },
    retry: {
      actionOpenLesson: 'Otwórz lekcję',
      descriptionCritical: (masteryPercent) =>
        `To jeden z najsłabszych obszarów (${masteryPercent}%). Potrzebna jest szybka powtórka i kolejna próba.`,
      descriptionDefault: (masteryPercent) =>
        `Lekcja ma jeszcze rezerwę (${masteryPercent}%). Jedna powtórka powinna ustabilizować wynik.`,
      progressLabel: (masteryPercent, targetPercent) =>
        `Postęp: ${masteryPercent}% / ${targetPercent}%`,
      questLabelCritical: 'Misja ratunkowa',
      questLabelDefault: 'Misja powtórkowa',
      targetPrimary: '1 powtórka + wynik min. 75%',
      targetSecondary: '1 powtórka + wynik min. 80%',
      title: (emoji, title) => `${emoji} Powtórka: ${title}`,
    },
    mixed: {
      actionStartTraining: 'Uruchom trening',
      descriptionDefault:
        'Podtrzymaj rytm nauki krótszym treningiem mieszanym obejmującym kilka typów zadań.',
      descriptionNeedsPractice:
        'Po powtórkach uruchom trening mieszany, aby sprawdzić, czy umiejętności przenoszą się do praktyki.',
      progressLabel: (gamesPlayed) => `Rytm dnia: ${gamesPlayed} gier`,
      progressLabelEmpty: 'Rytm dnia: zacznij od pierwszej gry',
      questLabelDefault: 'Quest rytmu',
      questLabelNeedsPractice: 'Misja dnia',
      target: (questionCount) => `${questionCount} pytań`,
      title: 'Trening mieszany',
    },
    retain: {
      actionRepeatLesson: 'Powtórz lekcję',
      description: (title, masteryPercent) =>
        `${title} jest stabilna (${masteryPercent}%). Krótkie utrwalenie pomoże utrzymać poziom.`,
      progressLabel: (masteryPercent) => `Opanowanie: ${masteryPercent}%`,
      questLabel: 'Quest utrwalenia',
      target: '1 szybka powtórka',
      title: (emoji) => `${emoji} Utrwal mocną stronę`,
    },
  };
};

const resolveAssignmentLessonTitle = (
  lesson: { componentId: string; title: string },
  localizer: KangurAssignmentLocalizer | undefined
): string => localizer?.resolveLessonTitle?.(lesson.componentId, lesson.title) ?? lesson.title;

const translateAssignmentSuggestionWithFallback = (
  translate: KangurAssignmentLocalizer['translate'],
  key: string,
  fallback: string,
  values?: KangurAssignmentTranslationValues
): string => {
  const translated = translate?.(key, values);
  if (!translated || translated === key || translated.endsWith(`.${key}`)) {
    return fallback;
  }

  return translated;
};

type KangurAssignmentInsights = ReturnType<typeof buildLessonMasteryInsights>;

type KangurAssignmentBuildContext = {
  fallbackCopy: KangurAssignmentFallbackCopy;
  insights: KangurAssignmentInsights;
  localizer?: KangurAssignmentLocalizer;
  progress: KangurProgressState;
  translate?: KangurAssignmentLocalizer['translate'];
};

const buildStarterAssignment = ({
  fallbackCopy,
  translate,
}: KangurAssignmentBuildContext): KangurAssignmentPlan => ({
  id: 'lesson-start',
  title: translateAssignmentSuggestionWithFallback(
    translate,
    'starter.title',
    fallbackCopy.starter.title
  ),
  description: translateAssignmentSuggestionWithFallback(
    translate,
    'starter.description',
    fallbackCopy.starter.description
  ),
  target: translateAssignmentSuggestionWithFallback(
    translate,
    'starter.target',
    fallbackCopy.starter.target
  ),
  priority: 'medium',
  progressLabel: translateAssignmentSuggestionWithFallback(
    translate,
    'starter.progressLabel',
    fallbackCopy.starter.progressLabel
  ),
  questLabel: translateAssignmentSuggestionWithFallback(
    translate,
    'starter.questLabel',
    fallbackCopy.starter.questLabel
  ),
  rewardXp: 40,
  questMetric: {
    kind: 'lessons_completed',
    targetDelta: 1,
  },
  action: {
    label: translateAssignmentSuggestionWithFallback(
      translate,
      'actions.openLesson',
      fallbackCopy.starter.actionOpenLesson
    ),
    page: 'Lessons',
  },
});

const resolveRetryTargetPercent = (masteryPercent: number): number =>
  masteryPercent < 60 ? 75 : 80;

const resolveRetryMode = (
  fallbackCopy: KangurAssignmentFallbackCopy,
  critical: boolean
): {
  descriptionKey: 'retry.descriptionCritical' | 'retry.descriptionDefault';
  description: (masteryPercent: number) => string;
  priority: 'high' | 'medium';
  questLabel: string;
  questLabelKey: 'retry.questLabelCritical' | 'retry.questLabelDefault';
  rewardXp: number;
  target: string;
  targetKey: 'retry.targetPrimary' | 'retry.targetSecondary';
} =>
  critical
    ? {
        descriptionKey: 'retry.descriptionCritical',
        description: fallbackCopy.retry.descriptionCritical,
        priority: 'high',
        questLabel: fallbackCopy.retry.questLabelCritical,
        questLabelKey: 'retry.questLabelCritical',
        rewardXp: 55,
        target: fallbackCopy.retry.targetPrimary,
        targetKey: 'retry.targetPrimary',
      }
    : {
        descriptionKey: 'retry.descriptionDefault',
        description: fallbackCopy.retry.descriptionDefault,
        priority: 'medium',
        questLabel: fallbackCopy.retry.questLabelDefault,
        questLabelKey: 'retry.questLabelDefault',
        rewardXp: 45,
        target: fallbackCopy.retry.targetSecondary,
        targetKey: 'retry.targetSecondary',
      };

const buildRetryAssignment = ({
  fallbackCopy,
  lesson,
  localizer,
  translate,
}: KangurAssignmentBuildContext & {
  lesson: KangurAssignmentInsights['weakest'][number];
}): KangurAssignmentPlan => {
  const critical = lesson.masteryPercent < 60;
  const retryMode = resolveRetryMode(fallbackCopy, critical);
  const targetMastery = resolveRetryTargetPercent(lesson.masteryPercent);
  const lessonTitle = resolveAssignmentLessonTitle(lesson, localizer);

  return {
    id: `lesson-retry-${lesson.componentId}`,
    title: translateAssignmentSuggestionWithFallback(
      translate,
      'retry.title',
      fallbackCopy.retry.title(lesson.emoji, lessonTitle),
      {
        emoji: lesson.emoji,
        title: lessonTitle,
      }
    ),
    description: translateAssignmentSuggestionWithFallback(
      translate,
      retryMode.descriptionKey,
      retryMode.description(lesson.masteryPercent),
      {
        masteryPercent: lesson.masteryPercent,
      }
    ),
    target: translateAssignmentSuggestionWithFallback(
      translate,
      retryMode.targetKey,
      retryMode.target
    ),
    priority: retryMode.priority,
    progressLabel: translateAssignmentSuggestionWithFallback(
      translate,
      'retry.progressLabel',
      fallbackCopy.retry.progressLabel(lesson.masteryPercent, targetMastery),
      {
        masteryPercent: lesson.masteryPercent,
        targetPercent: targetMastery,
      }
    ),
    questLabel: translateAssignmentSuggestionWithFallback(
      translate,
      retryMode.questLabelKey,
      retryMode.questLabel
    ),
    rewardXp: retryMode.rewardXp,
    questMetric: {
      kind: 'lesson_mastery',
      lessonComponentId: lesson.componentId,
      targetPercent: targetMastery,
    },
    action: {
      label: translateAssignmentSuggestionWithFallback(
        translate,
        'actions.openLesson',
        fallbackCopy.retry.actionOpenLesson
      ),
      page: 'Lessons',
      query: {
        focus: lesson.componentId,
      },
    },
  };
};

const resolveMixedPracticeMode = (
  fallbackCopy: KangurAssignmentFallbackCopy,
  hasPlayedGames: boolean,
  needsPractice: boolean
): {
  description: string;
  descriptionKey: 'mixed.descriptionNeedsPractice' | 'mixed.descriptionDefault';
  priority: 'medium' | 'low';
  progressLabelKey: 'mixed.progressLabel' | 'mixed.progressLabelEmpty';
  questLabel: string;
  questLabelKey: 'mixed.questLabelNeedsPractice' | 'mixed.questLabelDefault';
  rewardXp: number;
} => ({
  description: needsPractice
    ? fallbackCopy.mixed.descriptionNeedsPractice
    : fallbackCopy.mixed.descriptionDefault,
  descriptionKey: needsPractice ? 'mixed.descriptionNeedsPractice' : 'mixed.descriptionDefault',
  priority: needsPractice ? 'medium' : 'low',
  progressLabelKey: hasPlayedGames ? 'mixed.progressLabel' : 'mixed.progressLabelEmpty',
  questLabel: needsPractice
    ? fallbackCopy.mixed.questLabelNeedsPractice
    : fallbackCopy.mixed.questLabelDefault,
  questLabelKey: needsPractice ? 'mixed.questLabelNeedsPractice' : 'mixed.questLabelDefault',
  rewardXp: needsPractice ? 36 : 28,
});

const buildMixedPracticeAssignment = ({
  fallbackCopy,
  insights,
  progress,
  translate,
}: KangurAssignmentBuildContext): KangurAssignmentPlan => {
  const needsPractice = insights.lessonsNeedingPractice > 0;
  const gamesPlayed = progress.gamesPlayed;
  const questionCount = gamesPlayed < 5 ? 8 : 12;
  const hasPlayedGames = gamesPlayed > 0;
  const mixedPracticeMode = resolveMixedPracticeMode(
    fallbackCopy,
    hasPlayedGames,
    needsPractice
  );
  const progressLabel = hasPlayedGames
    ? fallbackCopy.mixed.progressLabel(gamesPlayed)
    : fallbackCopy.mixed.progressLabelEmpty;

  return {
    id: 'mixed-practice',
    title: translateAssignmentSuggestionWithFallback(
      translate,
      'mixed.title',
      fallbackCopy.mixed.title
    ),
    description: translateAssignmentSuggestionWithFallback(
      translate,
      mixedPracticeMode.descriptionKey,
      mixedPracticeMode.description
    ),
    target: translateAssignmentSuggestionWithFallback(
      translate,
      'mixed.target',
      fallbackCopy.mixed.target(questionCount),
      {
        questionCount,
      }
    ),
    priority: mixedPracticeMode.priority,
    progressLabel: translateAssignmentSuggestionWithFallback(
      translate,
      mixedPracticeMode.progressLabelKey,
      progressLabel,
      hasPlayedGames ? { gamesPlayed } : undefined
    ),
    questLabel: translateAssignmentSuggestionWithFallback(
      translate,
      mixedPracticeMode.questLabelKey,
      mixedPracticeMode.questLabel
    ),
    rewardXp: mixedPracticeMode.rewardXp,
    questMetric: {
      kind: 'games_played',
      targetDelta: 1,
    },
    action: {
      label: translateAssignmentSuggestionWithFallback(
        translate,
        'actions.startTraining',
        fallbackCopy.mixed.actionStartTraining
      ),
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    },
  };
};

const buildRetentionAssignment = ({
  fallbackCopy,
  insights,
  localizer,
  translate,
}: KangurAssignmentBuildContext): KangurAssignmentPlan | null => {
  const strongestLesson = insights.strongest[0] ?? null;
  if (!strongestLesson || strongestLesson.masteryPercent < 85) {
    return null;
  }

  const strongestLessonTitle = resolveAssignmentLessonTitle(strongestLesson, localizer);
  return {
    id: `lesson-retain-${strongestLesson.componentId}`,
    title: translateAssignmentSuggestionWithFallback(
      translate,
      'retain.title',
      fallbackCopy.retain.title(strongestLesson.emoji),
      {
        emoji: strongestLesson.emoji,
      }
    ),
    description: translateAssignmentSuggestionWithFallback(
      translate,
      'retain.description',
      fallbackCopy.retain.description(strongestLessonTitle, strongestLesson.masteryPercent),
      {
        title: strongestLessonTitle,
        masteryPercent: strongestLesson.masteryPercent,
      }
    ),
    target: translateAssignmentSuggestionWithFallback(
      translate,
      'retain.target',
      fallbackCopy.retain.target
    ),
    priority: 'low',
    progressLabel: translateAssignmentSuggestionWithFallback(
      translate,
      'retain.progressLabel',
      fallbackCopy.retain.progressLabel(strongestLesson.masteryPercent),
      {
        masteryPercent: strongestLesson.masteryPercent,
      }
    ),
    questLabel: translateAssignmentSuggestionWithFallback(
      translate,
      'retain.questLabel',
      fallbackCopy.retain.questLabel
    ),
    rewardXp: 22,
    questMetric: {
      kind: 'lessons_completed',
      targetDelta: 1,
    },
    action: {
      label: translateAssignmentSuggestionWithFallback(
        translate,
        'actions.repeatLesson',
        fallbackCopy.retain.actionRepeatLesson
      ),
      page: 'Lessons',
      query: {
        focus: strongestLesson.componentId,
      },
    },
  };
};

export const buildKangurAssignments = (
  progress: KangurProgressState,
  limit = 3,
  localizer?: KangurAssignmentLocalizer
): KangurAssignmentPlan[] => {
  const safeLimit = Math.max(1, Math.floor(limit));
  const insights = buildLessonMasteryInsights(progress, 2);
  const context: KangurAssignmentBuildContext = {
    fallbackCopy: getAssignmentFallbackCopy(localizer?.locale),
    insights,
    localizer,
    progress,
    translate: localizer?.translate,
  };
  const assignments = [
    ...(insights.trackedLessons === 0 ? [buildStarterAssignment(context)] : []),
    ...insights.weakest.map((lesson) => buildRetryAssignment({ ...context, lesson })),
    buildMixedPracticeAssignment(context),
    ...(() => {
      const retentionAssignment = buildRetentionAssignment(context);
      return retentionAssignment ? [retentionAssignment] : [];
    })(),
  ];

  return Array.from(new Map(assignments.map((assignment) => [assignment.id, assignment])).values()).slice(
    0,
    safeLimit
  );
};
