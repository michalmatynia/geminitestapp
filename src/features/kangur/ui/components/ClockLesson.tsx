'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import { KangurConfirmModal } from '@/features/kangur/ui/components/KangurConfirmModal';
import { KangurButton, KangurPanelRow } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  buildLessonHubSectionsWithProgress,
} from '@/features/kangur/ui/components/lesson-utils';
import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/features/kangur/shared/utils';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

import { ClockTrainingSlide } from './ClockLesson.visuals';
import ClockTrainingGame from './ClockTrainingGame';
import {
  COMBINED_SLIDES,
  HUB_SECTIONS,
  HOURS_SLIDES,
  MINUTES_SLIDES,
  SLIDES,
  TRAINING_PANEL_TASKS,
  TRAINING_SECTIONS,
  type ClockChallengeMedal,
  type ClockHubId,
  type ClockHubSection,
  type ClockPracticeTask,
  type ClockTrainingPanelId,
  type LessonSlide,
  type SectionId,
  type TrainingCardId,
} from './ClockLesson.data';
import type { ClockChallengeResult, ClockTrainingSectionId } from './clock-training-utils';

export { HUB_SECTIONS, LESSON_SECTIONS, SLIDES } from './ClockLesson.data';

export default function ClockLesson(): React.JSX.Element {
  const [sectionProgressSnapshot, setSectionProgressSnapshot] = useState<
    Partial<Record<SectionId, { viewedCount: number; totalCount: number }>>
  >({});
  const runtimeSlides = useRef<Record<SectionId, LessonSlide[]> | null>(null);

  if (runtimeSlides.current === null) {
    runtimeSlides.current = {
      hours: [
        ...HOURS_SLIDES,
        {
          title: 'Ćwiczenie: Godziny',
          tts: 'Teraz przechodzisz do praktyki pełnych godzin. Ustawiaj krótką wskazówkę tak jak w pierwszym panelu ćwiczenia godzin.',
          content: (
            <ClockTrainingSlide
              section='hours'
              practiceTasks={TRAINING_PANEL_TASKS.hours.learn}
            />
          ),
        },
      ],
      minutes: [
        ...MINUTES_SLIDES,
        {
          title: 'Ćwiczenie: Minuty',
          tts: 'Teraz przechodzisz do praktyki minut. Ustawiaj długą wskazówkę tak jak w pierwszym panelu ćwiczenia minut.',
          content: (
            <ClockTrainingSlide
              section='minutes'
              practiceTasks={TRAINING_PANEL_TASKS.minutes.learn}
            />
          ),
        },
      ],
      combined: [
        ...COMBINED_SLIDES,
        {
          title: 'Ćwiczenie: Pełny czas',
          tts: 'Teraz przechodzisz do praktyki pełnego czasu. Ustawiaj obie wskazówki tak jak w pierwszym panelu ćwiczenia pełnego czasu.',
          content: (
            <ClockTrainingSlide
              section='combined'
              practiceTasks={TRAINING_PANEL_TASKS.combined.learn}
            />
          ),
        },
      ],
    };
  }

  const lessonCompletionAwardedRef = useRef(false);
  const isHoursComplete =
    (sectionProgressSnapshot.hours?.totalCount ?? 0) > 0 &&
    (sectionProgressSnapshot.hours?.viewedCount ?? 0) >=
      (sectionProgressSnapshot.hours?.totalCount ?? 0);
  const isMinutesComplete =
    (sectionProgressSnapshot.minutes?.totalCount ?? 0) > 0 &&
    (sectionProgressSnapshot.minutes?.viewedCount ?? 0) >=
      (sectionProgressSnapshot.minutes?.totalCount ?? 0);
  const isCombinedComplete =
    (sectionProgressSnapshot.combined?.totalCount ?? 0) > 0 &&
    (sectionProgressSnapshot.combined?.viewedCount ?? 0) >=
      (sectionProgressSnapshot.combined?.totalCount ?? 0);
  const isCombinedUnlocked = isHoursComplete && isMinutesComplete;
  const isClockLessonComplete = isHoursComplete && isMinutesComplete && isCombinedComplete;

  useEffect(() => {
    if (!isClockLessonComplete || lessonCompletionAwardedRef.current) {
      return;
    }

    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'clock', 100);
    addXp(reward.xp, reward.progressUpdates);
    lessonCompletionAwardedRef.current = true;
  }, [isClockLessonComplete]);

  const [activeTrainingPanelBySection, setActiveTrainingPanelBySection] = useState<
    Record<ClockTrainingSectionId, ClockTrainingPanelId>
  >({
    hours: 'pick_one',
    minutes: 'pick_one',
    combined: 'pick_one',
  });
  const [completedTrainingPanelsBySection, setCompletedTrainingPanelsBySection] = useState<
    Record<ClockTrainingSectionId, Partial<Record<ClockTrainingPanelId, boolean>>>
  >({
    hours: {},
    minutes: {},
    combined: {},
  });
  const [challengeMedalBySection, setChallengeMedalBySection] = useState<
    Partial<Record<ClockTrainingSectionId, ClockChallengeMedal>>
  >({});
  const [pendingTrainingExitAction, setPendingTrainingExitAction] = useState<
    | {
        kind: 'hub';
      }
    | {
        kind: 'panel';
        panel: ClockTrainingPanelId;
      }
    | null
  >(null);

  const buildHubSections = useCallback(
    (
      sections: ReadonlyArray<ClockHubSection>,
      sectionProgress: Partial<Record<ClockHubId, unknown>>
    ) => {
      const baseSections = buildLessonHubSectionsWithProgress(
        sections,
        sectionProgress as Partial<Record<ClockHubId, LessonHubSectionProgress>>
      ).map((section) => {
        if (!section.isGame && section.id === 'combined' && !isCombinedUnlocked) {
          return {
            ...section,
            description: 'Odblokuj po ukończeniu Godzin i Minut.',
            locked: true,
            lockedLabel: 'Zablokowane',
          };
        }

        return section;
      });

      return baseSections.map((section) => {
        if (!section.isGame) {
          return section;
        }

        const trainingSectionId =
          section.id === 'game_hours'
            ? 'hours'
            : section.id === 'game_minutes'
              ? 'minutes'
              : section.id === 'game_combined'
                ? 'combined'
                : null;

        if (!trainingSectionId) {
          return section;
        }

        const completedPanels = completedTrainingPanelsBySection[trainingSectionId] ?? {};
        const viewedCount = completedPanels.pick_one ? 1 : 0;

        return {
          ...section,
          progress: {
            totalCount: 1,
            viewedCount,
          },
        };
      });
    },
    [completedTrainingPanelsBySection, isCombinedUnlocked]
  );

  const buildTrainingConfig = (
    trainingSectionId: ClockTrainingSectionId,
    hubId: TrainingCardId
  ) => {
    const currentTrainingSection =
      TRAINING_SECTIONS.find((section) => section.id === hubId) ?? TRAINING_SECTIONS[0];
    if (!currentTrainingSection) {
      return null;
    }

    const currentTrainingPanel = activeTrainingPanelBySection[trainingSectionId] ?? 'pick_one';
    const completedTrainingPanels = completedTrainingPanelsBySection[trainingSectionId] ?? {};
    const isChallengePanelCompleted = completedTrainingPanels.challenge === true;
    const currentChallengeMedal = challengeMedalBySection[trainingSectionId] ?? null;

    const challengeCompletedClassName =
      currentChallengeMedal === 'gold'
        ? 'bg-yellow-400'
        : currentChallengeMedal === 'silver'
          ? 'bg-slate-300'
          : currentChallengeMedal === 'bronze'
            ? 'bg-orange-400'
            : 'bg-amber-200';

    const setTrainingPanel = (panel: ClockTrainingPanelId): void => {
      setActiveTrainingPanelBySection((currentPanels) =>
        currentPanels[trainingSectionId] === panel
          ? currentPanels
          : {
              ...currentPanels,
              [trainingSectionId]: panel,
            }
      );
    };

    const markTrainingPanelCompleted = (panel: ClockTrainingPanelId): void => {
      if (completedTrainingPanels[panel]) {
        return;
      }

      const nextCompletedPanels = {
        ...completedTrainingPanels,
        [panel]: true,
      };

      setCompletedTrainingPanelsBySection((currentPanels) => ({
        ...currentPanels,
        [trainingSectionId]: nextCompletedPanels,
      }));
    };

    const executeTrainingExitAction = (
      action:
        | {
            kind: 'hub';
          }
        | {
            kind: 'panel';
            panel: ClockTrainingPanelId;
          },
      onBack?: () => void
    ): void => {
      if (action.kind === 'hub') {
        onBack?.();
        return;
      }

      setTrainingPanel(action.panel);
    };

    const requestTrainingExitAction = (
      action:
        | {
            kind: 'hub';
          }
        | {
            kind: 'panel';
            panel: ClockTrainingPanelId;
          },
      onBack?: () => void
    ): void => {
      if (currentTrainingPanel !== 'challenge') {
        executeTrainingExitAction(action, onBack);
        return;
      }

      setPendingTrainingExitAction(action);
    };

    // Single-panel games use the middle practice set.
    const trainingPanels: Array<
      IdLabelOptionDto<ClockTrainingPanelId> & {
        activeClassName: string;
        completedClassName: string;
      }
    > = [
      {
        activeClassName: 'bg-indigo-500',
        completedClassName: 'bg-indigo-300',
        id: 'pick_one',
        label: 'zadanie',
      },
    ];
    const currentTrainingPanelIndex = trainingPanels.findIndex(
      (panel) => panel.id === currentTrainingPanel
    );

    const trainingPills = (
      <div className='flex gap-2'>
        {trainingPanels.map((panel) => {
          const isActive = currentTrainingPanel === panel.id;
          const isCompleted =
            panel.id === 'challenge'
              ? isChallengePanelCompleted
              : completedTrainingPanels[panel.id] === true;
          const medalClassName =
            panel.id === 'challenge' && isChallengePanelCompleted
              ? challengeCompletedClassName
              : null;

          return (
            <button
              key={panel.id}
              type='button'
              onClick={() => {
                if (panel.id === currentTrainingPanel) {
                  return;
                }

                requestTrainingExitAction({ kind: 'panel', panel: panel.id });
              }}
              aria-label={`Przejdź do panelu ${panel.label}`}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                KANGUR_STEP_PILL_CLASSNAME,
                'h-[14px] min-w-[14px] cursor-pointer',
                isActive
                  ? ['w-8 scale-[1.04]', medalClassName ?? panel.activeClassName]
                  : isCompleted
                    ? ['w-6', medalClassName ?? panel.completedClassName]
                    : KANGUR_PENDING_STEP_PILL_CLASSNAME
              )}
              data-testid={`clock-lesson-training-panel-${panel.id}`}
            />
          );
        })}
      </div>
    );

    const trainingFooterNavigation =
      trainingPanels.length > 1 ? (
        <KangurPanelRow className='w-full sm:items-center sm:justify-between'>
          {currentTrainingPanelIndex > 0 ? (
            <KangurButton
              onClick={() =>
                requestTrainingExitAction({
                  kind: 'panel',
                  panel: trainingPanels[currentTrainingPanelIndex - 1]!.id,
                })
              }
              aria-label='Poprzedni panel'
              className='w-full justify-center px-5 shadow-sm [border-color:var(--kangur-soft-card-border)] sm:min-w-[72px] sm:w-auto'
              data-testid='clock-lesson-training-prev-button'
              size='sm'
              type='button'
              title='Poprzedni panel'
              variant='surface'
            >
              <ChevronLeft aria-hidden='true' className='h-4 w-4 flex-shrink-0' />
            </KangurButton>
          ) : (
            <div className='hidden sm:block sm:min-w-[72px]' />
          )}

          {currentTrainingPanelIndex >= 0 &&
          currentTrainingPanelIndex < trainingPanels.length - 1 ? (
            <KangurButton
              onClick={() =>
                requestTrainingExitAction({
                  kind: 'panel',
                  panel: trainingPanels[currentTrainingPanelIndex + 1]!.id,
                })
              }
              aria-label='Następny panel'
              className='w-full justify-center px-5 shadow-sm [border-color:var(--kangur-soft-card-border)] sm:min-w-[72px] sm:w-auto'
              data-testid='clock-lesson-training-next-button'
              size='sm'
              type='button'
              title='Następny panel'
              variant='surface'
            >
              <ChevronRight aria-hidden='true' className='h-4 w-4 flex-shrink-0' />
            </KangurButton>
          ) : (
            <div className='hidden sm:block sm:min-w-[72px]' />
          )}
        </KangurPanelRow>
      ) : null;
    const nextTrainingPanel =
      currentTrainingPanelIndex >= 0 && currentTrainingPanelIndex < trainingPanels.length - 1
        ? trainingPanels[currentTrainingPanelIndex + 1]!.id
        : null;

    const handlePracticeCompleted = (onBack: () => void): void => {
      if (currentTrainingPanel === 'challenge') {
        return;
      }

      markTrainingPanelCompleted(currentTrainingPanel);

      if (nextTrainingPanel) {
        setTrainingPanel(nextTrainingPanel);
        return;
      }

      onBack();
    };

    const resolvePracticeTasks = (
      panel: ClockTrainingPanelId
    ): ClockPracticeTask[] | undefined =>
      panel === 'challenge' ? undefined : TRAINING_PANEL_TASKS[trainingSectionId][panel];

    const trainingBody = (onBack: () => void) => (
      <ClockTrainingGame
        key={`${trainingSectionId}-${currentTrainingPanel}`}
        completionPrimaryActionLabel={
          currentTrainingPanel === 'challenge'
            ? 'Zakończ lekcję ✅'
            : nextTrainingPanel === 'challenge'
              ? 'Otwórz wyzwanie'
              : nextTrainingPanel
                ? 'Następne zadanie'
                : 'Wróć do tematów'
        }
        enableAdaptiveRetry={false}
        hideModeSwitch
        initialMode={currentTrainingPanel === 'challenge' ? 'challenge' : 'practice'}
        onCompletionPrimaryAction={() => {
          if (currentTrainingPanel !== 'challenge' && nextTrainingPanel) {
            setTrainingPanel(nextTrainingPanel);
            return;
          }

          onBack();
        }}
        onFinish={onBack}
        onPracticeCompleted={() => handlePracticeCompleted(onBack)}
        onChallengeSuccess={(result: ClockChallengeResult) => {
          markTrainingPanelCompleted('challenge');
          setChallengeMedalBySection((currentMedals) => ({
            ...currentMedals,
            [trainingSectionId]: result.medal ?? 'bronze',
          }));
        }}
        practiceTasks={resolvePracticeTasks(currentTrainingPanel)}
        section={trainingSectionId}
        showTaskTitle={trainingPanels.length === 1 || currentTrainingPanel === 'learn'}
        showTimeDisplay={false}
      />
    );

    return {
      sectionId: hubId,
      stage: {
        accent: 'indigo',
        description: currentTrainingSection.description,
        footerNavigation: trainingFooterNavigation,
        headerTestId: 'clock-lesson-training-header',
        icon: '🕐',
        maxWidthClassName: 'max-w-lg',
        navigationPills: trainingPills,
        shellTestId: 'clock-lesson-training-shell',
        title: currentTrainingSection.title,
      },
      onStageBack: ({ onBack }: { onBack: () => void }) =>
        requestTrainingExitAction({ kind: 'hub' }, onBack),
      render: ({ onBack }: { onBack: () => void }) => (
        <>
          {trainingBody(onBack)}
          <KangurConfirmModal
            cancelText='Zostań'
            confirmText='Opuść wyzwanie'
            isOpen={pendingTrainingExitAction !== null}
            message='Jeśli opuścisz Tryb Wyzwanie teraz, to wyzwanie zostanie niezaliczone.'
            onClose={() => setPendingTrainingExitAction(null)}
            onConfirm={() => {
              if (!pendingTrainingExitAction) {
                return;
              }

              const action = pendingTrainingExitAction;
              setPendingTrainingExitAction(null);
              executeTrainingExitAction(action, onBack);
            }}
            title='Ouścić wyzwanie?'
          />
        </>
      ),
    };
  };

  const games = [
    buildTrainingConfig('hours', 'game_hours'),
    buildTrainingConfig('minutes', 'game_minutes'),
    buildTrainingConfig('combined', 'game_combined'),
  ].filter(Boolean) as Array<{
    sectionId: TrainingCardId;
    stage: {
      accent: 'indigo';
      description: string;
      footerNavigation: React.ReactNode;
      headerTestId: string;
      icon: string;
      maxWidthClassName: string;
      navigationPills: React.ReactNode;
      shellTestId: string;
      title: string;
    };
    onStageBack: (helpers: { onBack: () => void }) => void;
    render: (helpers: { onBack: () => void }) => React.ReactNode;
  }>;

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='clock'
      lessonEmoji='🕐'
      lessonTitle='Nauka zegara'
      sections={HUB_SECTIONS}
      slides={runtimeSlides.current ?? SLIDES}
      gradientClass='kangur-gradient-accent-indigo-reverse'
      progressDotClassName='bg-indigo-200'
      dotActiveClass='bg-indigo-500'
      dotDoneClass='bg-indigo-200'
      skipMarkFor={['game_hours', 'game_minutes', 'game_combined']}
      buildHubSections={buildHubSections}
      onSectionProgress={(progress) =>
        setSectionProgressSnapshot(
          progress as Partial<Record<SectionId, { viewedCount: number; totalCount: number }>>
        )
      }
      games={games}
    />
  );
}
