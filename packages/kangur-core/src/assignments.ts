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
        'Uruchom pierwszą lekcję, aby zacząć zbierać dane o mocnych stronach ucznia.',
      target: '1 lekcja',
      priority: 'medium',
      action: {
        label: 'Otwórz lekcję',
        page: 'Lessons',
      },
    });
  }

  insights.weakest.forEach((lesson, index) => {
    assignments.push({
      id: `lesson-retry-${lesson.componentId}`,
      title: `${lesson.emoji} Powtórka: ${lesson.title}`,
      description:
        lesson.masteryPercent < 60
          ? `To jeden z najsłabszych obszarów (${lesson.masteryPercent}%). Potrzebna jest szybka powtórka i kolejna próba.`
          : `Lekcja ma jeszcze rezerwę (${lesson.masteryPercent}%). Jedna powtórka powinna ustabilizować wynik.`,
      target:
        index === 0
          ? '1 powtórka + wynik min. 75%'
          : '1 powtórka + wynik min. 80%',
      priority: lesson.masteryPercent < 60 ? 'high' : 'medium',
      action: {
        label: 'Otwórz lekcję',
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
          ? 'Po powtórkach uruchom trening celowany, aby od razu sprawdzić najsłabszy obszar w praktyce.'
          : 'Po powtórkach uruchom trening mieszany, aby sprawdzić, czy umiejętności przenoszą się do praktyki.'
        : 'Podtrzymaj rytm nauki krótszym treningiem obejmującym kolejne pytania praktyczne.',
    target: progress.gamesPlayed < 5 ? '8 pytań' : '12 pytań',
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
      title: `${strongestLesson.emoji} Utrwal mocną stronę`,
      description: `${strongestLesson.title} jest stabilna (${strongestLesson.masteryPercent}%). Krótkie utrwalenie pomoże utrzymać poziom.`,
      target: '1 szybka powtórka',
      priority: 'low',
      action: {
        label: 'Powtórz lekcję',
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
