import { buildLessonMasteryInsights } from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import type { KangurAssignmentPlan } from '@/features/kangur/shared/contracts/kangur-quests';

export const buildKangurAssignments = (
  progress: KangurProgressState,
  limit = 3
): KangurAssignmentPlan[] => {
  const safeLimit = Math.max(1, Math.floor(limit));
  const insights = buildLessonMasteryInsights(progress, 2);
  const assignments: KangurAssignmentPlan[] = [];

  if (insights.trackedLessons === 0) {
    assignments.push({
      id: 'lesson-start',
      title: 'Pierwsza lekcja startowa',
      description: 'Uruchom pierwszą lekcję, aby zacząć zbierać dane o mocnych stronach ucznia.',
      target: '1 lekcja',
      priority: 'medium',
      progressLabel: 'Postęp: 0/1 lekcja',
      questLabel: 'Misja startowa',
      rewardXp: 40,
      questMetric: {
        kind: 'lessons_completed',
        targetDelta: 1,
      },
      action: {
        label: 'Otwórz lekcję',
        page: 'Lessons',
      },
    });
  }

  insights.weakest.forEach((lesson, index) => {
    const targetMastery = index === 0 ? 75 : 80;
    const critical = lesson.masteryPercent < 60;
    assignments.push({
      id: `lesson-retry-${lesson.componentId}`,
      title: `${lesson.emoji} Powtórka: ${lesson.title}`,
      description:
        critical
          ? `To jeden z najsłabszych obszarów (${lesson.masteryPercent}%). Potrzebna jest szybka powtórka i kolejna próba.`
          : `Lekcja ma jeszcze rezerwę (${lesson.masteryPercent}%). Jedna powtórka powinna ustabilizować wynik.`,
      target: index === 0 ? '1 powtórka + wynik min. 75%' : '1 powtórka + wynik min. 80%',
      priority: critical ? 'high' : 'medium',
      progressLabel: `Postęp: ${lesson.masteryPercent}% / ${targetMastery}%`,
      questLabel: critical ? 'Misja ratunkowa' : 'Misja powtórkowa',
      rewardXp: critical ? 55 : 45,
      questMetric: {
        kind: 'lesson_mastery',
        lessonComponentId: lesson.componentId,
        targetPercent: targetMastery,
      },
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
    title: 'Trening mieszany',
    description:
      insights.lessonsNeedingPractice > 0
        ? 'Po powtórkach uruchom trening mieszany, aby sprawdzić, czy umiejętności przenoszą się do praktyki.'
        : 'Podtrzymaj rytm nauki krótszym treningiem mieszanym obejmującym kilka typów zadań.',
    target: progress.gamesPlayed < 5 ? '8 pytań' : '12 pytań',
    priority: insights.lessonsNeedingPractice > 0 ? 'medium' : 'low',
    progressLabel:
      progress.gamesPlayed > 0
        ? `Rytm dnia: ${progress.gamesPlayed} gier`
        : 'Rytm dnia: zacznij od pierwszej gry',
    questLabel: insights.lessonsNeedingPractice > 0 ? 'Misja dnia' : 'Quest rytmu',
    rewardXp: insights.lessonsNeedingPractice > 0 ? 36 : 28,
    questMetric: {
      kind: 'games_played',
      targetDelta: 1,
    },
    action: {
      label: 'Uruchom trening',
      page: 'Game',
      query: {
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
      progressLabel: `Opanowanie: ${strongestLesson.masteryPercent}%`,
      questLabel: 'Quest utrwalenia',
      rewardXp: 22,
      questMetric: {
        kind: 'lessons_completed',
        targetDelta: 1,
      },
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
