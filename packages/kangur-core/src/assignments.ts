import type { KangurProgressState } from '@kangur/contracts';

import { buildLessonMasteryInsights } from './profile';
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

export const buildKangurAssignments = (
  progress: KangurProgressState,
  limit = 3,
): KangurAssignmentPlan[] => {
  const safeLimit = Math.max(1, Math.floor(limit));
  const insights = buildLessonMasteryInsights(progress, 2);
  const assignments: KangurAssignmentPlan[] = [];
  const weakestPracticeOperation = resolvePreferredKangurPracticeOperation(
    insights.weakest[0]?.componentId,
  );

  if (insights.trackedLessons === 0) {
    assignments.push({
      id: 'lesson-start',
      title: 'Pierwsza lekcja startowa',
      description:
        'Uruchom pierwsza lekcje, aby zaczac zbierac dane o mocnych stronach ucznia.',
      target: '1 lekcja',
      priority: 'medium',
      action: {
        label: 'Otworz lekcje',
        page: 'Lessons',
      },
    });
  }

  insights.weakest.forEach((lesson, index) => {
    assignments.push({
      id: `lesson-retry-${lesson.componentId}`,
      title: `${lesson.emoji} Powtorka: ${lesson.title}`,
      description:
        lesson.masteryPercent < 60
          ? `To jeden z najslabszych obszarow (${lesson.masteryPercent}%). Potrzebna jest szybka powtorka i kolejna proba.`
          : `Lekcja ma jeszcze rezerwe (${lesson.masteryPercent}%). Jedna powtorka powinna ustabilizowac wynik.`,
      target:
        index === 0
          ? '1 powtorka + wynik min. 75%'
          : '1 powtorka + wynik min. 80%',
      priority: lesson.masteryPercent < 60 ? 'high' : 'medium',
      action: {
        label: 'Otworz lekcje',
        page: 'Lessons',
        query: {
          focus: lesson.componentId,
        },
      },
    });
  });

  assignments.push({
    id: 'mixed-practice',
    title: weakestPracticeOperation ? 'Trening celowany' : 'Trening mieszany',
    description:
      insights.lessonsNeedingPractice > 0
        ? weakestPracticeOperation
          ? 'Po powtorkach uruchom trening celowany, aby od razu sprawdzic najslabszy obszar w praktyce.'
          : 'Po powtorkach uruchom trening mieszany, aby sprawdzic czy umiejetnosci przenosza sie do praktyki.'
        : 'Podtrzymaj rytm nauki krotszym treningiem obejmujacym kolejne pytania praktyczne.',
    target: progress.gamesPlayed < 5 ? '8 pytan' : '12 pytan',
    priority: insights.lessonsNeedingPractice > 0 ? 'medium' : 'low',
    action: {
      label: 'Uruchom trening',
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
      title: `${strongestLesson.emoji} Utrwal mocna strone`,
      description: `${strongestLesson.title} jest stabilna (${strongestLesson.masteryPercent}%). Krotkie utrwalenie pomoze utrzymac poziom.`,
      target: '1 szybka powtorka',
      priority: 'low',
      action: {
        label: 'Powtorz lekcje',
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
