'use client';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { KANGUR_STEP_PILL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  buildLessonHubSectionsWithProgress,
} from '@/features/kangur/ui/components/lesson-utils';
import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurLessonGameSections } from '@/features/kangur/ui/hooks/useKangurLessonGameSections';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurUnifiedLesson,
  useKangurUnifiedLessonBack,
} from '@/features/kangur/ui/lessons/lesson-components';
import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
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
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type {
  KangurLessonGameSection,
  KangurLessonGameSectionSettings,
} from '@/shared/contracts/kangur-lesson-game-sections';

type ClockTrainingHubConfig = {
  description: string;
  emoji: string;
  hubId: string;
  instanceId: string;
  settings?: KangurLessonGameSectionSettings;
  title: string;
  trainingSectionId: ClockTrainingSectionId;
};

export { HUB_SECTIONS, LESSON_SECTIONS, SLIDES } from './ClockLesson.data';

const CLOCK_TRAINING_INSTANCE_ID_BY_SECTION: Record<ClockTrainingSectionId, string> = {
  hours: getKangurBuiltInGameInstanceId('clock_training', 'clock_training:clock-hours'),
  minutes: getKangurBuiltInGameInstanceId('clock_training', 'clock_training:clock-minutes'),
  combined: getKangurBuiltInGameInstanceId('clock_training'),
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

const resolveClockTrainingSectionFromSettings = (
  settings?: KangurLessonGameSectionSettings
): ClockTrainingSectionId => {
  const clockSettings = settings?.clock;
  if (clockSettings?.clockSection) {
    return clockSettings.clockSection;
  }
  if (clockSettings?.showHourHand === false && clockSettings?.showMinuteHand !== false) {
    return 'minutes';
  }
  if (clockSettings?.showMinuteHand === false && clockSettings?.showHourHand !== false) {
    return 'hours';
  }
  return 'combined';
};

const resolveClockTrainingInstanceIdFromSection = (
  section: KangurLessonGameSection
): string => {
  if (section.instanceId) {
    return section.instanceId;
  }

  return CLOCK_TRAINING_INSTANCE_ID_BY_SECTION[
    resolveClockTrainingSectionFromSettings(section.settings)
  ];
};

const buildClockLessonEngineOverrides = (
  settings?: KangurLessonGameSectionSettings
): KangurGameRuntimeRendererProps => {
  const clockSettings = settings?.clock;

  return {
    ...(clockSettings?.initialMode
      ? { clockInitialMode: clockSettings.initialMode }
      : {}),
    ...(clockSettings?.showHourHand !== undefined
      ? { showClockHourHand: clockSettings.showHourHand }
      : {}),
    ...(clockSettings?.showMinuteHand !== undefined
      ? { showClockMinuteHand: clockSettings.showMinuteHand }
      : {}),
    ...(clockSettings?.showModeSwitch !== undefined
      ? { showClockModeSwitch: clockSettings.showModeSwitch }
      : {}),
    ...(clockSettings?.showTaskTitle !== undefined
      ? { showClockTaskTitle: clockSettings.showTaskTitle }
      : {}),
    ...(clockSettings?.showTimeDisplay !== undefined
      ? { showClockTimeDisplay: clockSettings.showTimeDisplay }
      : {}),
  };
};

const isSameSectionProgressSnapshot = (
  left: Partial<Record<SectionId, { viewedCount: number; totalCount: number }>>,
  right: Partial<Record<SectionId, { viewedCount: number; totalCount: number }>>
): boolean => {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([sectionId, progress]) => {
    const nextProgress = right[sectionId as SectionId];
    return (
      progress?.viewedCount === nextProgress?.viewedCount &&
      progress?.totalCount === nextProgress?.totalCount
    );
  });
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
  const lessonGameSectionsQuery = useKangurLessonGameSections({
    enabledOnly: true,
    lessonComponentId: 'clock',
  });
  const persistedClockGameSections = useMemo(
    () =>
      (lessonGameSectionsQuery.data ?? [])
        .filter((section) => section.gameId === 'clock_training')
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)),
    [lessonGameSectionsQuery.data]
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
  const defaultTrainingConfigs = useMemo<ClockTrainingHubConfig[]>(
    () => [
      {
        description: copy.hubSections.gameHours.description,
        emoji: '🎯',
        hubId: 'game_hours',
        instanceId: CLOCK_TRAINING_INSTANCE_ID_BY_SECTION.hours,
        title: copy.hubSections.gameHours.title,
        trainingSectionId: 'hours',
      },
      {
        description: copy.hubSections.gameMinutes.description,
        emoji: '🟢',
        hubId: 'game_minutes',
        instanceId: CLOCK_TRAINING_INSTANCE_ID_BY_SECTION.minutes,
        title: copy.hubSections.gameMinutes.title,
        trainingSectionId: 'minutes',
      },
      {
        description: copy.hubSections.gameCombined.description,
        emoji: '🕐',
        hubId: 'game_combined',
        instanceId: CLOCK_TRAINING_INSTANCE_ID_BY_SECTION.combined,
        title: copy.hubSections.gameCombined.title,
        trainingSectionId: 'combined',
      },
    ],
    [copy]
  );
  const customTrainingConfigs = useMemo<ClockTrainingHubConfig[]>(
    () =>
      persistedClockGameSections.map((section: KangurLessonGameSection) => ({
        description: section.description,
        emoji: section.emoji,
        hubId: section.id,
        instanceId: resolveClockTrainingInstanceIdFromSection(section),
        settings: section.settings,
        title: section.title,
        trainingSectionId: resolveClockTrainingSectionFromSettings(section.settings),
      })),
    [persistedClockGameSections]
  );
  const trainingConfigs = useMemo(
    () => [...defaultTrainingConfigs, ...customTrainingConfigs],
    [customTrainingConfigs, defaultTrainingConfigs]
  );
  const localizedHubSections = useMemo(
    () => [
      ...buildClockHubSections(copy).filter((section) => !section.isGame),
      ...trainingConfigs.map(
        (config): ClockHubSection => ({
          id: config.hubId,
          emoji: config.emoji,
          title: config.title,
          description: config.description,
          isGame: true,
        })
      ),
    ],
    [copy, trainingConfigs]
  );
  const returnToHub = useKangurUnifiedLessonBack();
  const lessonChrome = useTranslations('KangurLessonChrome');
  const backToTopicsLabel = (() => {
    const translated = lessonChrome('backToTopics');
    return translated === 'backToTopics' || translated.endsWith('.backToTopics')
      ? 'Wróć do tematów'
      : translated;
  })();
  const runtimeSlides = useMemo<Record<SectionId, LessonSlide[]>>(
    () => ({
      hours: [
        ...hoursSlides,
        {
          title: copy.trainingSlides.hours.title,
          tts: copy.trainingSlides.hours.tts,
          content: (
            <ClockTrainingGame
              completionPrimaryActionLabel={backToTopicsLabel}
              enableAdaptiveRetry={false}
              hideModeSwitch
              onFinish={returnToHub}
              practiceTasks={TRAINING_PANEL_TASKS.hours.learn}
              section='hours'
              showTaskTitle
              showTimeDisplay
            />
          ),
        },
      ],
      minutes: [
        ...minutesSlides,
        {
          title: copy.trainingSlides.minutes.title,
          tts: copy.trainingSlides.minutes.tts,
          content: (
            <ClockTrainingGame
              completionPrimaryActionLabel={backToTopicsLabel}
              enableAdaptiveRetry={false}
              hideModeSwitch
              onFinish={returnToHub}
              practiceTasks={TRAINING_PANEL_TASKS.minutes.learn}
              section='minutes'
              showTaskTitle
              showTimeDisplay
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
            <ClockTrainingGame
              completionPrimaryActionLabel={backToTopicsLabel}
              enableAdaptiveRetry={false}
              hideModeSwitch
              onFinish={returnToHub}
              practiceTasks={TRAINING_PANEL_TASKS.combined.learn}
              section='combined'
              showTaskTitle
              showTimeDisplay
            />
          ),
        },
      ],
    }),
    [backToTopicsLabel, combinedSlides, copy, hoursSlides, minutesSlides, returnToHub]
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
    Partial<Record<string, boolean>>
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
        const viewedCount = completedTrainingSections[section.id] ? 1 : 0;

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
    config: ClockTrainingHubConfig
  ) => {
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
      sectionId: config.hubId,
      shell: {
        accent: 'indigo',
        description: config.description,
        headerTestId: 'clock-lesson-training-header',
        icon: '🕐',
        maxWidthClassName: 'max-w-lg',
        navigationPills: trainingPills,
        shellTestId: 'clock-lesson-training-shell',
        title: config.title,
      },
      onShellFinish: ({ onFinish }: { onFinish: () => void }) => {
        setCompletedTrainingSections((currentSections) =>
          currentSections[config.hubId]
            ? currentSections
            : {
                ...currentSections,
                [config.hubId]: true,
              }
        );
        onFinish();
      },
      launchableInstance: {
        gameId: 'clock_training' as const,
        instanceId: config.instanceId,
      },
      engineOverrides: buildClockLessonEngineOverrides(config.settings),
    };
  };

  const games = trainingConfigs.map(buildTrainingConfig) as Array<{
    sectionId: TrainingCardId;
    shell: {
      accent: 'indigo';
      description: string;
      headerTestId: string;
      icon: string;
      maxWidthClassName: string;
      navigationPills: React.ReactNode;
      shellTestId: string;
      title: string;
    };
    onShellFinish: (helpers: { onFinish: () => void }) => void;
    launchableInstance: {
      gameId: 'clock_training';
      instanceId: string;
    };
    engineOverrides: KangurGameRuntimeRendererProps;
  }>;
  const handleSectionProgress = useCallback(
    (progress: Partial<Record<ClockHubId, unknown>>) => {
      const nextProgress = progress as Partial<
        Record<SectionId, { viewedCount: number; totalCount: number }>
      >;

      setSectionProgressSnapshot((currentProgress) =>
        isSameSectionProgressSnapshot(currentProgress, nextProgress)
          ? currentProgress
          : nextProgress
      );
    },
    []
  );

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
      skipMarkFor={trainingConfigs.map((config) => config.hubId)}
      buildHubSections={buildHubSections}
      onSectionProgress={handleSectionProgress}
      games={games}
    />
  );
}
