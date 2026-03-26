'use client';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { KANGUR_STEP_PILL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  buildLessonHubSectionsWithProgress,
} from '@/features/kangur/ui/components/lesson-utils';
import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/features/kangur/shared/utils';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

import { ClockTrainingSlide } from './ClockLesson.visuals';
import {
  buildClockCombinedSlides,
  buildClockHoursSlides,
  buildClockHubSections,
  buildClockMinutesSlides,
  CLOCK_COMBINED_SLIDES_COPY_PL,
  CLOCK_HOURS_SLIDES_COPY_PL,
  CLOCK_LESSON_COPY_PL,
  CLOCK_MINUTES_SLIDES_COPY_PL,
  TRAINING_PANEL_TASKS,
  type ClockHubId,
  type ClockHubSection,
  type LessonSlide,
  type SectionId,
  type TrainingCardId,
} from './ClockLesson.data';
import type { ClockLessonTranslate, WidenLessonCopy } from './ClockLesson.i18n';
import { translateClockLesson } from './ClockLesson.i18n';
import type { ClockTrainingSectionId } from './clock-training/types';

export { HUB_SECTIONS, LESSON_SECTIONS, SLIDES } from './ClockLesson.data';

const CLOCK_TRAINING_STAGE_RUNTIME_BY_SECTION: Record<
  ClockTrainingSectionId,
  ReturnType<typeof getKangurLessonStageGameRuntimeSpec>
> = {
  hours: getKangurLessonStageGameRuntimeSpec('clock_training_hours_lesson_stage'),
  minutes: getKangurLessonStageGameRuntimeSpec('clock_training_minutes_lesson_stage'),
  combined: getKangurLessonStageGameRuntimeSpec('clock_training_combined_lesson_stage'),
};

const localizeClockCopy = <T,>(
  source: T,
  prefix: string,
  translate: ClockLessonTranslate
): WidenLessonCopy<T> => {
  if (typeof source === 'string') {
    if (/\{\w+\}/.test(source)) {
      return source as WidenLessonCopy<T>;
    }
    return translateClockLesson(translate, prefix, source) as WidenLessonCopy<T>;
  }

  if (source === null || typeof source !== 'object') {
    return source as WidenLessonCopy<T>;
  }

  if (Array.isArray(source)) {
    const localizedItems: unknown[] = source.map((item, index): unknown =>
      localizeClockCopy(item as unknown, `${prefix}.${index}`, translate)
    );
    return localizedItems as WidenLessonCopy<T>;
  }

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      localizeClockCopy(value, prefix ? `${prefix}.${key}` : key, translate),
    ])
  ) as WidenLessonCopy<T>;
};

export default function ClockLesson(): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurStaticLessons.clock');
  const isCoarsePointer = useKangurCoarsePointer();
  const [sectionProgressSnapshot, setSectionProgressSnapshot] = useState<
    Partial<Record<SectionId, { viewedCount: number; totalCount: number }>>
  >({});
  const copy = useMemo(
    () => localizeClockCopy(CLOCK_LESSON_COPY_PL, '', translations),
    [translations]
  );
  const localizedHoursCopy = useMemo(
    () => localizeClockCopy(CLOCK_HOURS_SLIDES_COPY_PL, 'slides.hours', translations),
    [translations]
  );
  const localizedMinutesCopy = useMemo(
    () => localizeClockCopy(CLOCK_MINUTES_SLIDES_COPY_PL, 'slides.minutes', translations),
    [translations]
  );
  const localizedCombinedCopy = useMemo(
    () => localizeClockCopy(CLOCK_COMBINED_SLIDES_COPY_PL, 'slides.combined', translations),
    [translations]
  );
  const hoursSlides = useMemo(() => buildClockHoursSlides(localizedHoursCopy), [localizedHoursCopy]);
  const minutesSlides = useMemo(
    () => buildClockMinutesSlides(localizedMinutesCopy),
    [localizedMinutesCopy]
  );
  const combinedSlides = useMemo(
    () => buildClockCombinedSlides(localizedCombinedCopy),
    [localizedCombinedCopy]
  );
  const localizedHubSections = useMemo(() => buildClockHubSections(copy), [copy]);
  const localizedTrainingSections = useMemo(
    () =>
      localizedHubSections.filter(
        (section): section is ClockHubSection & { isGame: true } => section.isGame === true
      ),
    [localizedHubSections]
  );
  const runtimeSlides = useMemo<Record<SectionId, LessonSlide[]>>(
    () => ({
      hours: [
        ...hoursSlides,
        {
          title: copy.trainingSlides.hours.title,
          tts: copy.trainingSlides.hours.tts,
          content: (
            <ClockTrainingSlide section='hours' practiceTasks={TRAINING_PANEL_TASKS.hours.learn} />
          ),
        },
      ],
      minutes: [
        ...minutesSlides,
        {
          title: copy.trainingSlides.minutes.title,
          tts: copy.trainingSlides.minutes.tts,
          content: (
            <ClockTrainingSlide
              section='minutes'
              practiceTasks={TRAINING_PANEL_TASKS.minutes.learn}
            />
          ),
        },
      ],
      combined: [
        ...combinedSlides,
        {
          title: copy.trainingSlides.combined.title,
          tts: copy.trainingSlides.combined.tts,
          content: (
            <ClockTrainingSlide
              section='combined'
              practiceTasks={TRAINING_PANEL_TASKS.combined.learn}
            />
          ),
        },
      ],
    }),
    [combinedSlides, copy, hoursSlides, minutesSlides]
  );

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
    const progress = loadProgress({ ownerKey });
    const reward = createLessonCompletionReward(progress, 'clock', 100);
    addXp(reward.xp, reward.progressUpdates, { ownerKey });
    lessonCompletionAwardedRef.current = true;
  }, [isClockLessonComplete, ownerKey]);

  const [completedTrainingSections, setCompletedTrainingSections] = useState<
    Partial<Record<ClockTrainingSectionId, boolean>>
  >({});

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
            description: copy.hubSections.combinedLockedDescription,
            locked: true,
            lockedLabel: copy.hubSections.lockedLabel,
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

        const viewedCount = completedTrainingSections[trainingSectionId] ? 1 : 0;

        return {
          ...section,
          progress: {
            totalCount: 1,
            viewedCount,
          },
        };
      });
    },
    [completedTrainingSections, copy, isCombinedUnlocked]
  );

  const buildTrainingConfig = (
    trainingSectionId: ClockTrainingSectionId,
    hubId: TrainingCardId
  ) => {
    const currentTrainingSection =
      localizedTrainingSections.find((section) => section.id === hubId) ??
      localizedTrainingSections[0];
    if (!currentTrainingSection) {
      return null;
    }
    const trainingPills = (
      <div className='flex gap-2'>
        <button
          type='button'
          aria-label={translateClockLesson(
            translations,
            'training.goToPanel',
            CLOCK_LESSON_COPY_PL.training.goToPanel,
            { label: copy.training.panelLabel }
          )}
          aria-current='step'
          className={cn(
            KANGUR_STEP_PILL_CLASSNAME,
            isCoarsePointer
              ? 'h-11 min-w-11 w-12 scale-[1.02] touch-manipulation select-none'
              : 'h-[14px] min-w-[14px] w-8 scale-[1.04]',
            'bg-indigo-500'
          )}
          data-testid='clock-lesson-training-panel-pick_one'
          disabled
        />
      </div>
    );

    return {
      sectionId: hubId,
      stage: {
        accent: 'indigo',
        description: currentTrainingSection.description,
        headerTestId: 'clock-lesson-training-header',
        icon: '🕐',
        maxWidthClassName: 'max-w-lg',
        navigationPills: trainingPills,
        shellTestId: 'clock-lesson-training-shell',
        title: currentTrainingSection.title,
      },
      onStageFinish: ({ onFinish }: { onFinish: () => void }) => {
        setCompletedTrainingSections((currentSections) =>
          currentSections[trainingSectionId]
            ? currentSections
            : {
                ...currentSections,
                [trainingSectionId]: true,
              }
        );
        onFinish();
      },
      runtime: CLOCK_TRAINING_STAGE_RUNTIME_BY_SECTION[trainingSectionId],
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
      headerTestId: string;
      icon: string;
      maxWidthClassName: string;
      navigationPills: React.ReactNode;
      shellTestId: string;
      title: string;
    };
    onStageFinish: (helpers: { onFinish: () => void }) => void;
    runtime: ReturnType<typeof getKangurLessonStageGameRuntimeSpec>;
  }>;

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='clock'
      lessonEmoji='🕐'
      lessonTitle={copy.lessonTitle}
      sections={localizedHubSections}
      slides={runtimeSlides}
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
