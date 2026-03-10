import { buildLessonMasteryInsights } from '@/features/kangur/ui/services/profile';
import type {
  KangurAssignmentPriority,
  KangurProgressState,
  KangurRouteAction,
} from '@/shared/contracts/kangur';

export type KangurAssignmentQuestMetric =
  | {
      kind: 'games_played';
      targetDelta: number;
    }
  | {
      kind: 'lessons_completed';
      targetDelta: number;
    }
  | {
      kind: 'lesson_mastery';
      lessonComponentId: string;
      targetPercent: number;
    };

export type KangurAssignmentPlan = {
  id: string;
  title: string;
  description: string;
  target: string;
  priority: KangurAssignmentPriority;
  action: KangurRouteAction;
  questLabel?: string;
  rewardXp?: number;
  progressLabel?: string;
  questMetric?: KangurAssignmentQuestMetric;
};

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
      description: 'Uruchom pierwsza lekcje, aby zaczac zbierac dane o mocnych stronach ucznia.',
      target: '1 lekcja',
      priority: 'medium',
      progressLabel: 'Postep: 0/1 lekcja',
      questLabel: 'Misja startowa',
      rewardXp: 40,
      questMetric: {
        kind: 'lessons_completed',
        targetDelta: 1,
      },
      action: {
        label: 'Otworz lekcje',
        page: 'Lessons',
      },
    });
  }

  insights.weakest.forEach((lesson, index) => {
    const targetMastery = index === 0 ? 75 : 80;
    const critical = lesson.masteryPercent < 60;
    assignments.push({
      id: `lesson-retry-${lesson.componentId}`,
      title: `${lesson.emoji} Powtorka: ${lesson.title}`,
      description:
        critical
          ? `To jeden z najslabszych obszarow (${lesson.masteryPercent}%). Potrzebna jest szybka powtorka i kolejna proba.`
          : `Lekcja ma jeszcze rezerwe (${lesson.masteryPercent}%). Jedna powtorka powinna ustabilizowac wynik.`,
      target: index === 0 ? '1 powtorka + wynik min. 75%' : '1 powtorka + wynik min. 80%',
      priority: critical ? 'high' : 'medium',
      progressLabel: `Postep: ${lesson.masteryPercent}% / ${targetMastery}%`,
      questLabel: critical ? 'Misja ratunkowa' : 'Misja powtorkowa',
      rewardXp: critical ? 55 : 45,
      questMetric: {
        kind: 'lesson_mastery',
        lessonComponentId: lesson.componentId,
        targetPercent: targetMastery,
      },
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
    title: 'Trening mieszany',
    description:
      insights.lessonsNeedingPractice > 0
        ? 'Po powtorkach uruchom trening mieszany, aby sprawdzic czy umiejetnosci przenosza sie do praktyki.'
        : 'Podtrzymaj rytm nauki krotszym treningiem mieszanym obejmujacym kilka typow zadan.',
    target: progress.gamesPlayed < 5 ? '8 pytan' : '12 pytan',
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
      title: `${strongestLesson.emoji} Utrwal mocna strone`,
      description: `${strongestLesson.title} jest stabilna (${strongestLesson.masteryPercent}%). Krotkie utrwalenie pomoze utrzymac poziom.`,
      target: '1 szybka powtorka',
      priority: 'low',
      progressLabel: `Opanowanie: ${strongestLesson.masteryPercent}%`,
      questLabel: 'Quest utrwalenia',
      rewardXp: 22,
      questMetric: {
        kind: 'lessons_completed',
        targetDelta: 1,
      },
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
