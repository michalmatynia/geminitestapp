'use client';

import { useMemo } from 'react';

import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import OperationSelector from '@/features/kangur/ui/components/OperationSelector';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurButton,
  KangurInfoCard,
  KangurIconBadge,
  KangurOptionCardButton,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import type { KangurDailyQuestState } from '@/features/kangur/ui/services/daily-quests';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import type { KangurLessonComponentId, KangurRouteAction } from '@/shared/contracts/kangur';

const QUICK_PRACTICE_OPTIONS = [
  {
    accent: 'emerald',
    description: 'Sprawdz daty, dni tygodnia i miesiace w krotkich zadaniach.',
    emoji: '📅',
    label: 'Ćwiczenia z Kalendarzem',
    onSelectScreen: 'calendar_quiz',
  },
  {
    accent: 'violet',
    description: 'Rozpoznawaj figury i cwicz ich rysowanie w szybkich wyzwaniach.',
    emoji: '🔷',
    label: 'Ćwiczenia z Figurami',
    onSelectScreen: 'geometry_quiz',
  },
] as const;

type KangurRecommendedSelectorScreen = Extract<
  KangurGameScreen,
  'calendar_quiz' | 'geometry_quiz' | 'training'
>;

type KangurOperationSelectorRecommendationTarget =
  | {
      kind: 'operation';
      difficulty: KangurDifficulty;
      operation: KangurOperation;
    }
  | {
      kind: 'screen';
      screen: KangurRecommendedSelectorScreen;
    };

type KangurOperationSelectorRecommendation = {
  accent: KangurAccent;
  actionLabel: string;
  description: string;
  label: string;
  recommendedOperation: KangurOperation | null;
  recommendedScreen: Exclude<KangurRecommendedSelectorScreen, 'training'> | null;
  target: KangurOperationSelectorRecommendationTarget;
  title: string;
};

const resolveRecommendationDifficulty = (accuracy: number): KangurDifficulty => {
  if (accuracy >= 85) {
    return 'hard';
  }
  if (accuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const resolveLessonRecommendationTarget = (
  componentId: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!componentId) {
    return null;
  }

  const difficulty = resolveRecommendationDifficulty(averageAccuracy);

  switch (componentId) {
    case 'clock':
      return { kind: 'operation', difficulty, operation: 'clock' };
    case 'calendar':
      return { kind: 'screen', screen: 'calendar_quiz' };
    case 'adding':
      return { kind: 'operation', difficulty, operation: 'addition' };
    case 'subtracting':
      return { kind: 'operation', difficulty, operation: 'subtraction' };
    case 'multiplication':
      return { kind: 'operation', difficulty, operation: 'multiplication' };
    case 'division':
      return { kind: 'operation', difficulty, operation: 'division' };
    case 'geometry_basics':
    case 'geometry_shapes':
    case 'geometry_symmetry':
    case 'geometry_perimeter':
      return { kind: 'screen', screen: 'geometry_quiz' };
    default:
      return { kind: 'screen', screen: 'training' };
  }
};

const resolveActivityRecommendationTarget = (
  activityKey: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!activityKey) {
    return null;
  }

  const [, primary = ''] = activityKey.split(':');
  if (!primary) {
    return null;
  }

  if (primary === 'calendar') {
    return { kind: 'screen', screen: 'calendar_quiz' };
  }
  if (primary === 'geometry' || primary.startsWith('geometry_')) {
    return { kind: 'screen', screen: 'geometry_quiz' };
  }

  return resolveLessonRecommendationTarget(primary, averageAccuracy);
};

const resolveActionRecommendationTarget = (
  action: KangurRouteAction | undefined,
  progress: KangurProgressState
): KangurOperationSelectorRecommendationTarget | null => {
  if (!action) {
    return null;
  }

  const averageAccuracy = getProgressAverageAccuracy(progress);
  if (action.page === 'Game') {
    const quickStart = action.query?.['quickStart'];
    if (quickStart === 'training') {
      return { kind: 'screen', screen: 'training' };
    }
    if (quickStart === 'operation') {
      const requestedOperation = action.query?.['operation'] ?? null;
      const difficulty = action.query?.['difficulty'];
      if (
        requestedOperation &&
        [
          'addition',
          'subtraction',
          'multiplication',
          'division',
          'decimals',
          'powers',
          'roots',
          'clock',
          'mixed',
        ].includes(requestedOperation)
      ) {
        return {
          kind: 'operation',
          difficulty:
            difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
              ? difficulty
              : resolveRecommendationDifficulty(averageAccuracy),
          operation: requestedOperation as KangurOperation,
        };
      }
    }
  }

  if (action.page === 'Lessons') {
    return resolveLessonRecommendationTarget(action.query?.['focus'], averageAccuracy);
  }

  return null;
};

const getRecommendationActionLabel = (
  target: KangurOperationSelectorRecommendationTarget
): string => {
  const operationLabels: Partial<Record<KangurOperation, string>> = {
    addition: 'Zagraj w dodawanie',
    subtraction: 'Zagraj w odejmowanie',
    multiplication: 'Zagraj w mnozenie',
    division: 'Zagraj w dzielenie',
    clock: 'Zagraj na zegarze',
    mixed: 'Uruchom trening mieszany',
    decimals: 'Zagraj we ulamki',
    powers: 'Zagraj w potegi',
    roots: 'Zagraj w pierwiastki',
  };

  if (target.kind === 'screen') {
    if (target.screen === 'calendar_quiz') {
      return 'Cwicz kalendarz';
    }
    if (target.screen === 'geometry_quiz') {
      return 'Cwicz figury';
    }
    return 'Uruchom trening';
  }

  return operationLabels[target.operation] ?? 'Zagraj teraz';
};

const finalizeRecommendation = (
  draft: Omit<KangurOperationSelectorRecommendation, 'actionLabel' | 'recommendedOperation' | 'recommendedScreen'>
): KangurOperationSelectorRecommendation => ({
  ...draft,
  actionLabel: getRecommendationActionLabel(draft.target),
  recommendedOperation: draft.target.kind === 'operation' ? draft.target.operation : null,
  recommendedScreen:
    draft.target.kind === 'screen' && draft.target.screen !== 'training' ? draft.target.screen : null,
});

const getQuestRecommendation = (
  quest: KangurDailyQuestState | null,
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  if (!quest?.assignment) {
    return null;
  }

  const target = resolveActionRecommendationTarget(quest.assignment.action, progress);
  if (!target) {
    return null;
  }

  return finalizeRecommendation({
    accent: quest.progress.status === 'completed' ? 'emerald' : 'indigo',
    description:
      quest.assignment.progressLabel ??
      quest.progress.summary ??
      quest.assignment.description,
    label: quest.assignment.questLabel ?? 'Misja dnia',
    target,
    title: quest.assignment.title,
  });
};

const getWeakestLessonRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const weakestLesson = Object.entries(progress.lessonMastery)
    .filter(([, entry]) => entry.attempts > 0 && entry.masteryPercent < 80)
    .sort((left, right) => left[1].masteryPercent - right[1].masteryPercent)[0];

  if (!weakestLesson) {
    return null;
  }

  const [componentId, entry] = weakestLesson;
  const lesson = KANGUR_LESSON_LIBRARY[componentId as KangurLessonComponentId];
  const target = resolveLessonRecommendationTarget(
    componentId,
    getProgressAverageAccuracy(progress)
  );
  if (!lesson || !target) {
    return null;
  }

  return finalizeRecommendation({
    accent: entry.masteryPercent < 60 ? 'rose' : 'amber',
    description: `Opanowanie ${entry.masteryPercent}%. Jedna dobra runda pomoze szybciej domknac ten temat przed kolejna lekcja.`,
    label: 'Nadrabiamy lekcje',
    target,
    title: `Najpierw popraw: ${lesson.title}`,
  });
};

const getTrackRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const track =
    getProgressBadgeTrackSummaries(progress, { maxTracks: 6 }).find(
      (entry) =>
        Boolean(entry.nextBadge) && (entry.unlockedCount > 0 || entry.progressPercent >= 40)
    ) ?? null;
  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;

  if (!track?.nextBadge) {
    return null;
  }

  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? { kind: 'screen', screen: 'training' as const };

  return finalizeRecommendation({
    accent: 'violet',
    description: topActivity
      ? `Tor ${track.label} jest najblizej nagrody. Najmocniej pcha go teraz ${topActivity.label.toLowerCase()}.`
      : `Tor ${track.label} jest najblizej kolejnej odznaki.`,
    label: 'Tor odznak',
    target,
    title: `Rozpedz tor: ${track.label}`,
  });
};

const getGuidedRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const guidedMomentum = getRecommendedSessionMomentum(progress);
  if (guidedMomentum.completedSessions <= 0 || !guidedMomentum.nextBadgeName) {
    return null;
  }

  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? { kind: 'screen', screen: 'training' as const };

  return finalizeRecommendation({
    accent: 'sky',
    description: topActivity
      ? `Masz juz ${guidedMomentum.summary} w polecanym rytmie. Jeszcze jedna mocna runda ${topActivity.label.toLowerCase()} pomoze domknac odznake ${guidedMomentum.nextBadgeName}.`
      : `Masz juz ${guidedMomentum.summary} w polecanym rytmie. Jeszcze jedna mocna runda pomoze domknac odznake ${guidedMomentum.nextBadgeName}.`,
    label: 'Polecony kierunek',
    target,
    title: `Dopnij: ${guidedMomentum.nextBadgeName}`,
  });
};

const getFallbackRecommendation = (
  progress: KangurProgressState
): KangurOperationSelectorRecommendation | null => {
  const topActivity = getProgressTopActivities(progress, 1)[0] ?? null;
  if (!topActivity) {
    return null;
  }

  const target =
    resolveActivityRecommendationTarget(topActivity.key, topActivity.averageAccuracy) ??
    ({ kind: 'screen', screen: 'training' } as const);

  return finalizeRecommendation({
    accent: 'indigo',
    description: `${topActivity.label} daje teraz srednio ${topActivity.averageXpPerSession} XP na gre. To najlepszy ruch na kolejna runde.`,
    label: 'Mocna passa',
    target,
    title: `Zagraj dalej w: ${topActivity.label}`,
  });
};

const getOperationSelectorRecommendation = (
  progress: KangurProgressState,
  quest: KangurDailyQuestState | null
): KangurOperationSelectorRecommendation | null =>
  getQuestRecommendation(quest, progress) ??
  getWeakestLessonRecommendation(progress) ??
  getGuidedRecommendation(progress) ??
  getTrackRecommendation(progress) ??
  getFallbackRecommendation(progress);

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const {
    activePracticeAssignment,
    basePath,
    handleHome,
    handleSelectOperation,
    practiceAssignmentsByOperation,
    progress,
    screen,
    setScreen,
  } = useKangurGameRuntime();
  const dailyQuest = useMemo(() => getCurrentKangurDailyQuest(progress), [progress]);
  const recommendation = useMemo(
    () => getOperationSelectorRecommendation(progress, dailyQuest),
    [dailyQuest, progress]
  );

  if (screen !== 'operation') {
    return null;
  }

  const handleRecommendationSelect = (): void => {
    if (!recommendation) {
      return;
    }

    if (recommendation.target.kind === 'screen') {
      setScreen(recommendation.target.screen);
      return;
    }

    handleSelectOperation(recommendation.target.operation, recommendation.target.difficulty, {
      recommendation: {
        description: recommendation.description,
        label: recommendation.label,
        source: 'operation_selector',
        title: recommendation.title,
      },
    });
  };

  return (
    <div className='w-full flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        className='max-w-md'
        description='Wybierz rodzaj gry i przejdz od razu do matematycznej zabawy.'
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-operation-top-section'
        title='Grajmy!'
        visualTitle={
          <KangurGrajmyWordmark
            className='mx-auto'
            data-testid='kangur-grajmy-heading-art'
            idPrefix='kangur-game-operation-heading'
          />
        }
      />
      {activePracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={activePracticeAssignment}
            basePath={basePath}
            mode='queue'
          />
        </div>
      ) : null}
      {recommendation ? (
        <KangurInfoCard
          accent={recommendation.accent}
          className='w-full max-w-3xl rounded-[28px]'
          data-testid='kangur-operation-recommendation-card'
          padding='md'
          tone='accent'
        >
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <KangurStatusChip
                accent={recommendation.accent}
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-operation-recommendation-label'
                size='sm'
              >
                {recommendation.label}
              </KangurStatusChip>
              <p
                className='mt-3 text-lg font-extrabold [color:var(--kangur-page-text)]'
                data-testid='kangur-operation-recommendation-title'
              >
                {recommendation.title}
              </p>
              <p
                className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'
                data-testid='kangur-operation-recommendation-description'
              >
                {recommendation.description}
              </p>
            </div>
            <KangurButton
              className='shrink-0'
              data-testid='kangur-operation-recommendation-action'
              size='sm'
              type='button'
              variant='surface'
              onClick={handleRecommendationSelect}
            >
              {recommendation.actionLabel}
            </KangurButton>
          </div>
        </KangurInfoCard>
      ) : null}
      <OperationSelector
        onSelect={handleSelectOperation}
        priorityAssignmentsByOperation={practiceAssignmentsByOperation}
        recommendedLabel={recommendation?.label}
        recommendedOperation={recommendation?.recommendedOperation}
      />
      <section
        aria-labelledby='kangur-game-quick-practice-heading'
        className='w-full max-w-3xl space-y-4'
      >
        <KangurSectionHeading
          accent='violet'
          align='left'
          description='Dwa szybkie tryby cwiczen w tej samej karcie i rytmie co mini-gry z Lekcji.'
          headingAs='h3'
          headingSize='sm'
          title='Szybkie ćwiczenia'
          titleId='kangur-game-quick-practice-heading'
        />
        <div className='flex w-full flex-col gap-3'>
          {QUICK_PRACTICE_OPTIONS.map((option) => {
            const isRecommended = recommendation?.recommendedScreen === option.onSelectScreen;

            return (
              <KangurOptionCardButton
                key={option.onSelectScreen}
                accent={option.accent}
                className='flex w-full items-center gap-4 rounded-[28px] p-4 text-left'
                data-doc-id='home_quick_practice_action'
                data-testid={`kangur-quick-practice-card-${option.onSelectScreen}`}
                emphasis='accent'
                onClick={() => setScreen(option.onSelectScreen)}
              >
                <KangurIconBadge accent={option.accent} className='shrink-0' size='xl'>
                  {option.emoji}
                </KangurIconBadge>
                <div className='min-w-0'>
                  <p className='text-base font-extrabold leading-tight [color:var(--kangur-page-text)]'>
                    {option.label}
                  </p>
                  <p className='mt-0.5 text-sm [color:var(--kangur-page-muted-text)]'>
                    {option.description}
                  </p>
                </div>
                <div className='ml-auto flex shrink-0 flex-col items-end gap-2 self-start'>
                  <KangurStatusChip
                    accent={option.accent}
                    className='uppercase tracking-[0.14em]'
                    size='sm'
                  >
                    Gra
                  </KangurStatusChip>
                  {isRecommended ? (
                    <KangurStatusChip
                      accent={option.accent}
                      className='text-[11px] font-semibold'
                      data-testid={`kangur-quick-practice-recommendation-${option.onSelectScreen}`}
                      size='sm'
                    >
                      {recommendation.label}
                    </KangurStatusChip>
                  ) : null}
                </div>
              </KangurOptionCardButton>
            );
          })}
        </div>
      </section>
    </div>
  );
}
