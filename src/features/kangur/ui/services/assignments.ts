import { buildLessonMasteryInsights } from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import type { KangurAssignmentPlan } from '@/features/kangur/shared/contracts/kangur-quests';

type KangurAssignmentTranslationValues = Record<string, string | number>;

type KangurAssignmentLocalizer = {
  translate: (key: string, values?: KangurAssignmentTranslationValues) => string;
  resolveLessonTitle?: (componentId: string, fallbackTitle: string) => string;
};

const resolveAssignmentLessonTitle = (
  lesson: { componentId: string; title: string },
  localizer: KangurAssignmentLocalizer | undefined
): string => localizer?.resolveLessonTitle?.(lesson.componentId, lesson.title) ?? lesson.title;

export const buildKangurAssignments = (
  progress: KangurProgressState,
  limit = 3,
  localizer?: KangurAssignmentLocalizer
): KangurAssignmentPlan[] => {
  const safeLimit = Math.max(1, Math.floor(limit));
  const insights = buildLessonMasteryInsights(progress, 2);
  const assignments: KangurAssignmentPlan[] = [];
  const translate = localizer?.translate;

  if (insights.trackedLessons === 0) {
    assignments.push({
      id: 'lesson-start',
      title: translate
        ? translate('starter.title')
        : 'Pierwsza lekcja startowa',
      description: translate
        ? translate('starter.description')
        : 'Uruchom pierwszą lekcję, aby zacząć zbierać dane o mocnych stronach ucznia.',
      target: translate ? translate('starter.target') : '1 lekcja',
      priority: 'medium',
      progressLabel: translate
        ? translate('starter.progressLabel')
        : 'Postęp: 0/1 lekcja',
      questLabel: translate ? translate('starter.questLabel') : 'Misja startowa',
      rewardXp: 40,
      questMetric: {
        kind: 'lessons_completed',
        targetDelta: 1,
      },
      action: {
        label: translate ? translate('actions.openLesson') : 'Otwórz lekcję',
        page: 'Lessons',
      },
    });
  }

  insights.weakest.forEach((lesson, index) => {
    const targetMastery = index === 0 ? 75 : 80;
    const critical = lesson.masteryPercent < 60;
    const lessonTitle = resolveAssignmentLessonTitle(lesson, localizer);
    assignments.push({
      id: `lesson-retry-${lesson.componentId}`,
      title: translate
        ? translate('retry.title', {
            emoji: lesson.emoji,
            title: lessonTitle,
          })
        : `${lesson.emoji} Powtórka: ${lesson.title}`,
      description:
        translate
          ? critical
            ? translate('retry.descriptionCritical', {
                masteryPercent: lesson.masteryPercent,
              })
            : translate('retry.descriptionDefault', {
                masteryPercent: lesson.masteryPercent,
              })
          : critical
            ? `To jeden z najsłabszych obszarów (${lesson.masteryPercent}%). Potrzebna jest szybka powtórka i kolejna próba.`
            : `Lekcja ma jeszcze rezerwę (${lesson.masteryPercent}%). Jedna powtórka powinna ustabilizować wynik.`,
      target: translate
        ? translate(index === 0 ? 'retry.targetPrimary' : 'retry.targetSecondary')
        : index === 0
          ? '1 powtórka + wynik min. 75%'
          : '1 powtórka + wynik min. 80%',
      priority: critical ? 'high' : 'medium',
      progressLabel: translate
        ? translate('retry.progressLabel', {
            masteryPercent: lesson.masteryPercent,
            targetPercent: targetMastery,
          })
        : `Postęp: ${lesson.masteryPercent}% / ${targetMastery}%`,
      questLabel: translate
        ? translate(critical ? 'retry.questLabelCritical' : 'retry.questLabelDefault')
        : critical
          ? 'Misja ratunkowa'
          : 'Misja powtórkowa',
      rewardXp: critical ? 55 : 45,
      questMetric: {
        kind: 'lesson_mastery',
        lessonComponentId: lesson.componentId,
        targetPercent: targetMastery,
      },
      action: {
        label: translate ? translate('actions.openLesson') : 'Otwórz lekcję',
        page: 'Lessons',
        query: {
          focus: lesson.componentId,
        },
      },
    });
  });

  assignments.push({
    id: 'mixed-practice',
    title: translate ? translate('mixed.title') : 'Trening mieszany',
    description:
      translate
        ? insights.lessonsNeedingPractice > 0
          ? translate('mixed.descriptionNeedsPractice')
          : translate('mixed.descriptionDefault')
        : insights.lessonsNeedingPractice > 0
          ? 'Po powtórkach uruchom trening mieszany, aby sprawdzić, czy umiejętności przenoszą się do praktyki.'
          : 'Podtrzymaj rytm nauki krótszym treningiem mieszanym obejmującym kilka typów zadań.',
    target: translate
      ? translate('mixed.target', {
          questionCount: progress.gamesPlayed < 5 ? 8 : 12,
        })
      : progress.gamesPlayed < 5
        ? '8 pytań'
        : '12 pytań',
    priority: insights.lessonsNeedingPractice > 0 ? 'medium' : 'low',
    progressLabel:
      translate
        ? progress.gamesPlayed > 0
          ? translate('mixed.progressLabel', {
              gamesPlayed: progress.gamesPlayed,
            })
          : translate('mixed.progressLabelEmpty')
        : progress.gamesPlayed > 0
          ? `Rytm dnia: ${progress.gamesPlayed} gier`
          : 'Rytm dnia: zacznij od pierwszej gry',
    questLabel: translate
      ? translate(
          insights.lessonsNeedingPractice > 0
            ? 'mixed.questLabelNeedsPractice'
            : 'mixed.questLabelDefault'
        )
      : insights.lessonsNeedingPractice > 0
        ? 'Misja dnia'
        : 'Quest rytmu',
    rewardXp: insights.lessonsNeedingPractice > 0 ? 36 : 28,
    questMetric: {
      kind: 'games_played',
      targetDelta: 1,
    },
    action: {
      label: translate ? translate('actions.startTraining') : 'Uruchom trening',
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    },
  });

  const strongestLesson = insights.strongest[0] ?? null;
  if (strongestLesson && strongestLesson.masteryPercent >= 85) {
    const strongestLessonTitle = resolveAssignmentLessonTitle(strongestLesson, localizer);
    assignments.push({
      id: `lesson-retain-${strongestLesson.componentId}`,
      title: translate
        ? translate('retain.title', {
            emoji: strongestLesson.emoji,
          })
        : `${strongestLesson.emoji} Utrwal mocną stronę`,
      description: translate
        ? translate('retain.description', {
            title: strongestLessonTitle,
            masteryPercent: strongestLesson.masteryPercent,
          })
        : `${strongestLesson.title} jest stabilna (${strongestLesson.masteryPercent}%). Krótkie utrwalenie pomoże utrzymać poziom.`,
      target: translate ? translate('retain.target') : '1 szybka powtórka',
      priority: 'low',
      progressLabel: translate
        ? translate('retain.progressLabel', {
            masteryPercent: strongestLesson.masteryPercent,
          })
        : `Opanowanie: ${strongestLesson.masteryPercent}%`,
      questLabel: translate ? translate('retain.questLabel') : 'Quest utrwalenia',
      rewardXp: 22,
      questMetric: {
        kind: 'lessons_completed',
        targetDelta: 1,
      },
      action: {
        label: translate ? translate('actions.repeatLesson') : 'Powtórz lekcję',
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
