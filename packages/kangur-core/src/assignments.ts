import type { KangurProgressState } from '@kangur/contracts/kangur';

import { buildLessonMasteryInsights } from './profile';
import {
  localizeKangurCoreText,
  normalizeKangurCoreLocale,
  type KangurCoreLocale,
} from './profile-i18n';
import { resolvePreferredKangurPracticeOperation } from './practice';

export type KangurAssignmentPriority = 'high' | 'medium' | 'low';

export type KangurAssignmentAction = {
  label: string;
  page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
  query?: Record<string, string>;
};

export type KangurAssignmentPlan = {
  id: string;
  title: string;
  description: string;
  target: string;
  priority: KangurAssignmentPriority;
  action: KangurAssignmentAction;
};

const getAssignmentActionLabel = (
  key: 'openLesson' | 'practiceNow',
  locale: KangurCoreLocale,
): string =>
  key === 'openLesson'
    ? localizeKangurCoreText(
        {
          de: 'Lektion öffnen',
          en: 'Open lesson',
          pl: 'Otwórz lekcję',
        },
        locale,
      )
    : localizeKangurCoreText(
        {
          de: 'Jetzt trainieren',
          en: 'Practice now',
          pl: 'Trenuj teraz',
        },
        locale,
      );

export const buildKangurAssignments = (
  progress: KangurProgressState,
  limit = 3,
  locale?: string | null | undefined,
): KangurAssignmentPlan[] => {
  const safeLocale = normalizeKangurCoreLocale(locale);
  const safeLimit = Math.max(1, Math.floor(limit));
  const insights = buildLessonMasteryInsights(progress, 2, safeLocale);
  const assignments: KangurAssignmentPlan[] = [];
  const weakestPracticeOperation = resolvePreferredKangurPracticeOperation(
    insights.weakest[0]?.componentId,
  );

  if (insights.trackedLessons === 0) {
    assignments.push({
      id: 'lesson-start',
      title: localizeKangurCoreText(
        {
          de: 'Erste Einstiegslektion',
          en: 'First starter lesson',
          pl: 'Pierwsza lekcja startowa',
        },
        safeLocale,
      ),
      description: localizeKangurCoreText(
        {
          de: 'Starte die erste Lektion, um Daten über die starken Seiten des Lernenden zu sammeln.',
          en: 'Start the first lesson to begin collecting data about the learner strengths.',
          pl: 'Uruchom pierwszą lekcję, aby zacząć zbierać dane o mocnych stronach ucznia.',
        },
        safeLocale,
      ),
      target: localizeKangurCoreText(
        {
          de: '1 Lektion',
          en: '1 lesson',
          pl: '1 lekcja',
        },
        safeLocale,
      ),
      priority: 'medium',
      action: {
        label: getAssignmentActionLabel('openLesson', safeLocale),
        page: 'Lessons',
      },
    });
  }

  insights.weakest.forEach((lesson, index) => {
    assignments.push({
      id: `lesson-retry-${lesson.componentId}`,
      title: localizeKangurCoreText(
        {
          de: `${lesson.emoji} Wiederholung: ${lesson.title}`,
          en: `${lesson.emoji} Review: ${lesson.title}`,
          pl: `${lesson.emoji} Powtórka: ${lesson.title}`,
        },
        safeLocale,
      ),
      description:
        lesson.masteryPercent < 60
          ? localizeKangurCoreText(
              {
                de: `Das ist einer der schwaechsten Bereiche (${lesson.masteryPercent} %). Eine schnelle Wiederholung und ein weiterer Versuch sind noetig.`,
                en: `This is one of the weakest areas (${lesson.masteryPercent}%). A quick review and another attempt are needed.`,
                pl: `To jeden z najsłabszych obszarów (${lesson.masteryPercent}%). Potrzebna jest szybka powtórka i kolejna próba.`,
              },
              safeLocale,
            )
          : localizeKangurCoreText(
              {
                de: `Die Lektion hat noch Reserve (${lesson.masteryPercent} %). Eine Wiederholung sollte das Ergebnis stabilisieren.`,
                en: `The lesson still has room (${lesson.masteryPercent}%). One review should stabilize the result.`,
                pl: `Lekcja ma jeszcze rezerwę (${lesson.masteryPercent}%). Jedna powtórka powinna ustabilizować wynik.`,
              },
              safeLocale,
            ),
      target:
        index === 0
          ? localizeKangurCoreText(
              {
                de: '1 Wiederholung + mind. 75 % Ergebnis',
                en: '1 review + min. 75% score',
                pl: '1 powtórka + wynik min. 75%',
              },
              safeLocale,
            )
          : localizeKangurCoreText(
              {
                de: '1 Wiederholung + mind. 80 % Ergebnis',
                en: '1 review + min. 80% score',
                pl: '1 powtórka + wynik min. 80%',
              },
              safeLocale,
            ),
      priority: lesson.masteryPercent < 60 ? 'high' : 'medium',
      action: {
        label: getAssignmentActionLabel('openLesson', safeLocale),
        page: 'Lessons',
        query: {
          focus: lesson.componentId,
        },
      },
    });
  });

  assignments.push({
    id: 'mixed-practice',
    title: weakestPracticeOperation
      ? localizeKangurCoreText(
          {
            de: 'Gezieltes Training',
            en: 'Targeted practice',
            pl: 'Trening celowany',
          },
          safeLocale,
        )
      : localizeKangurCoreText(
          {
            de: 'Gemischtes Training',
            en: 'Mixed practice',
            pl: 'Trening mieszany',
          },
          safeLocale,
        ),
    description:
      insights.lessonsNeedingPractice > 0
        ? weakestPracticeOperation
          ? localizeKangurCoreText(
              {
                de: 'Starte nach den Wiederholungen ein gezieltes Training, um den schwaechsten Bereich sofort in der Praxis zu pruefen.',
                en: 'After the reviews, start targeted practice to verify the weakest area in action right away.',
                pl: 'Po powtórkach uruchom trening celowany, aby od razu sprawdzić najsłabszy obszar w praktyce.',
              },
              safeLocale,
            )
          : localizeKangurCoreText(
              {
                de: 'Starte nach den Wiederholungen ein gemischtes Training, um zu pruefen, ob die Fertigkeiten in die Praxis uebergehen.',
                en: 'After the reviews, start mixed practice to check whether the skills transfer into practice.',
                pl: 'Po powtórkach uruchom trening mieszany, aby sprawdzić, czy umiejętności przenoszą się do praktyki.',
              },
              safeLocale,
            )
        : localizeKangurCoreText(
            {
              de: 'Halte den Lernrhythmus mit einem kuerzeren Training aufrecht, das weitere praktische Fragen umfasst.',
              en: 'Keep the learning rhythm with a shorter practice session covering more practical questions.',
              pl: 'Podtrzymaj rytm nauki krótszym treningiem obejmującym kolejne pytania praktyczne.',
            },
            safeLocale,
          ),
    target: localizeKangurCoreText(
      progress.gamesPlayed < 5
        ? {
            de: '8 Fragen',
            en: '8 questions',
            pl: '8 pytań',
          }
        : {
            de: '12 Fragen',
            en: '12 questions',
            pl: '12 pytań',
          },
      safeLocale,
    ),
    priority: insights.lessonsNeedingPractice > 0 ? 'medium' : 'low',
    action: {
      label: getAssignmentActionLabel('practiceNow', safeLocale),
      page: 'Game',
      query: {
        operation: weakestPracticeOperation ?? 'mixed',
        quickStart: 'training',
      },
    },
  });

  const strongestLesson = insights.strongest[0] ?? null;
  if (strongestLesson && strongestLesson.masteryPercent >= 85) {
    assignments.push({
      id: `lesson-retain-${strongestLesson.componentId}`,
      title: localizeKangurCoreText(
        {
          de: `${strongestLesson.emoji} Starke Seite festigen`,
          en: `${strongestLesson.emoji} Reinforce strength`,
          pl: `${strongestLesson.emoji} Utrwal mocną stronę`,
        },
        safeLocale,
      ),
      description: localizeKangurCoreText(
        {
          de: `${strongestLesson.title} ist stabil (${strongestLesson.masteryPercent} %). Eine kurze Wiederholung hilft, das Niveau zu halten.`,
          en: `${strongestLesson.title} is stable (${strongestLesson.masteryPercent}%). A short review will help keep the level.`,
          pl: `${strongestLesson.title} jest stabilna (${strongestLesson.masteryPercent}%). Krótkie utrwalenie pomoże utrzymać poziom.`,
        },
        safeLocale,
      ),
      target: localizeKangurCoreText(
        {
          de: '1 schnelle Wiederholung',
          en: '1 quick review',
          pl: '1 szybka powtórka',
        },
        safeLocale,
      ),
      priority: 'low',
      action: {
        label: getAssignmentActionLabel('openLesson', safeLocale),
        page: 'Lessons',
        query: {
          focus: strongestLesson.componentId,
        },
      },
    });
  }

  const uniqueAssignments = new Map<string, KangurAssignmentPlan>();
  assignments.forEach((assignment) => {
    if (!uniqueAssignments.has(assignment.id)) {
      uniqueAssignments.set(assignment.id, assignment);
    }
  });

  return Array.from(uniqueAssignments.values()).slice(0, safeLimit);
};
