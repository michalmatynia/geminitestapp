'use client';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { KANGUR_STEP_PILL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  buildLessonHubSectionsWithProgress,
} from '@/features/kangur/ui/components/lesson-utils';
import type { HubSection } from '@/features/kangur/ui/components/LessonHub';
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

const resolveClockTrainingSectionFromVisibility = (
  clockSettings: KangurLessonGameSectionSettings['clock']
): ClockTrainingSectionId => {
  if (isClockMinuteOnlyTrainingSection(clockSettings)) {
    return 'minutes';
  }
  if (isClockHourOnlyTrainingSection(clockSettings)) {
    return 'hours';
  }
  return 'combined';
};

const isClockMinuteOnlyTrainingSection = (
  clockSettings: KangurLessonGameSectionSettings['clock']
): boolean => clockSettings?.showHourHand === false && clockSettings?.showMinuteHand !== false;

const isClockHourOnlyTrainingSection = (
  clockSettings: KangurLessonGameSectionSettings['clock']
): boolean => clockSettings?.showMinuteHand === false && clockSettings?.showHourHand !== false;

const resolveClockTrainingSectionFromSettings = (
  settings?: KangurLessonGameSectionSettings
): ClockTrainingSectionId => {
  const clockSettings = settings?.clock;
  if (clockSettings?.clockSection) {
    return clockSettings.clockSection;
  }
  return resolveClockTrainingSectionFromVisibility(clockSettings);
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
  const overrides: KangurGameRuntimeRendererProps = {};

  assignClockLessonEngineOverride(overrides, 'clockInitialMode', clockSettings?.initialMode);
  assignClockLessonEngineOverride(overrides, 'showClockHourHand', clockSettings?.showHourHand);
  assignClockLessonEngineOverride(
    overrides,
    'showClockMinuteHand',
    clockSettings?.showMinuteHand
  );
  assignClockLessonEngineOverride(
    overrides,
    'showClockModeSwitch',
    clockSettings?.showModeSwitch
  );
  assignClockLessonEngineOverride(
    overrides,
    'showClockTaskTitle',
    clockSettings?.showTaskTitle
  );
  assignClockLessonEngineOverride(
    overrides,
    'showClockTimeDisplay',
    clockSettings?.showTimeDisplay
  );

  return overrides;
};

const assignClockLessonEngineOverride = <
  Key extends keyof KangurGameRuntimeRendererProps,
>(
  overrides: KangurGameRuntimeRendererProps,
  key: Key,
  value: KangurGameRuntimeRendererProps[Key] | undefined
): void => {
  if (value !== undefined) {
    overrides[key] = value;
  }
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

type ClockLessonCopy = WidenLessonCopy<typeof CLOCK_LESSON_COPY_PL>;
type ClockLessonSlidesBySection = Record<SectionId, LessonSlide[]>;
type ClockLessonTrainingGame = {
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
};

type ClockLessonCompletionState = {
  isClockLessonComplete: boolean;
  isCombinedComplete: boolean;
  isCombinedUnlocked: boolean;
  isHoursComplete: boolean;
  isMinutesComplete: boolean;
};

type ClockResolvedHubSection = HubSection & { id: ClockHubId };

const resolveClockLessonBackToTopicsLabel = (translated: string): string =>
  translated === 'backToTopics' || translated.endsWith('.backToTopics')
    ? 'Wróć do tematów'
    : translated;

const buildDefaultClockTrainingConfigs = (copy: ClockLessonCopy): ClockTrainingHubConfig[] => [
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
];

const buildCustomClockTrainingConfig = (
  section: KangurLessonGameSection
): ClockTrainingHubConfig => ({
  description: section.description,
  emoji: section.emoji,
  hubId: section.id,
  instanceId: resolveClockTrainingInstanceIdFromSection(section),
  settings: section.settings,
  title: section.title,
  trainingSectionId: resolveClockTrainingSectionFromSettings(section.settings),
});

const buildClockLocalizedHubSections = (
  copy: ClockLessonCopy,
  trainingConfigs: ClockTrainingHubConfig[]
): ClockHubSection[] => [
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
];

const renderClockLessonTrainingSlide = ({
  backToTopicsLabel,
  copy,
  returnToHub,
  section,
}: {
  backToTopicsLabel: string;
  copy: ClockLessonCopy;
  returnToHub: () => void;
  section: ClockTrainingSectionId;
}): LessonSlide => ({
  title: copy.trainingSlides[section].title,
  tts: copy.trainingSlides[section].tts,
  content: (
    <ClockTrainingGame
      completionPrimaryActionLabel={backToTopicsLabel}
      enableAdaptiveRetry={false}
      hideModeSwitch
      onFinish={returnToHub}
      practiceTasks={TRAINING_PANEL_TASKS[section].learn}
      section={section}
      showTaskTitle
      showTimeDisplay
    />
  ),
});

const buildClockRuntimeSlides = ({
  backToTopicsLabel,
  combinedSlides,
  copy,
  hoursSlides,
  minutesSlides,
  returnToHub,
}: {
  backToTopicsLabel: string;
  combinedSlides: LessonSlide[];
  copy: ClockLessonCopy;
  hoursSlides: LessonSlide[];
  minutesSlides: LessonSlide[];
  returnToHub: () => void;
}): ClockLessonSlidesBySection => ({
  hours: [
    ...hoursSlides,
    renderClockLessonTrainingSlide({
      backToTopicsLabel,
      copy,
      returnToHub,
      section: 'hours',
    }),
  ],
  minutes: [
    ...minutesSlides,
    renderClockLessonTrainingSlide({
      backToTopicsLabel,
      copy,
      returnToHub,
      section: 'minutes',
    }),
  ],
  combined: [
    ...combinedSlides,
    renderClockLessonTrainingSlide({
      backToTopicsLabel,
      copy,
      returnToHub,
      section: 'combined',
    }),
  ],
});

const resolveClockLessonCompletionState = (
  sectionProgressSnapshot: Partial<Record<SectionId, { viewedCount: number; totalCount: number }>>
): ClockLessonCompletionState => {
  const isHoursComplete = isClockLessonSectionComplete(sectionProgressSnapshot.hours);
  const isMinutesComplete = isClockLessonSectionComplete(sectionProgressSnapshot.minutes);
  const isCombinedComplete = isClockLessonSectionComplete(sectionProgressSnapshot.combined);
  const isCombinedUnlocked = isHoursComplete && isMinutesComplete;

  return {
    isClockLessonComplete: isHoursComplete && isMinutesComplete && isCombinedComplete,
    isCombinedComplete,
    isCombinedUnlocked,
    isHoursComplete,
    isMinutesComplete,
  };
};

const isClockLessonSectionComplete = (
  progress: { viewedCount: number; totalCount: number } | undefined
): boolean => (progress?.totalCount ?? 0) > 0 && (progress?.viewedCount ?? 0) >= (progress?.totalCount ?? 0);

const resolveClockLessonCombinedLockSection = ({
  copy,
  isCombinedUnlocked,
  section,
}: {
  copy: ClockLessonCopy;
  isCombinedUnlocked: boolean;
  section: ClockResolvedHubSection;
}): ClockResolvedHubSection => {
  if (!section.isGame && section.id === 'combined' && !isCombinedUnlocked) {
    return {
      ...section,
      description: copy.hubSections.combinedLockedDescription,
      locked: true,
      lockedLabel: copy.hubSections.lockedLabel,
    };
  }

  return section;
};

const resolveClockLessonTrainingProgressSection = ({
  completedTrainingSections,
  section,
}: {
  completedTrainingSections: Partial<Record<string, boolean>>;
  section: ClockResolvedHubSection;
}): ClockResolvedHubSection => {
  if (!section.isGame) {
    return section;
  }

  return {
    ...section,
    progress: {
      totalCount: 1,
      viewedCount: completedTrainingSections[section.id] ? 1 : 0,
    },
  };
};

const buildClockLessonHubSectionsWithTrainingProgress = ({
  completedTrainingSections,
  copy,
  isCombinedUnlocked,
  sectionProgress,
  sections,
}: {
  completedTrainingSections: Partial<Record<string, boolean>>;
  copy: ClockLessonCopy;
  isCombinedUnlocked: boolean;
  sectionProgress: Partial<Record<ClockHubId, unknown>>;
  sections: ReadonlyArray<ClockHubSection>;
}): ClockResolvedHubSection[] =>
  buildLessonHubSectionsWithProgress<ClockHubId, ClockHubSection, LessonHubSectionProgress>(
    sections,
    sectionProgress as Partial<Record<ClockHubId, LessonHubSectionProgress>>
  )
    .map((section) =>
      resolveClockLessonCombinedLockSection({
        copy,
        isCombinedUnlocked,
        section,
      })
    )
    .map((section) =>
      resolveClockLessonTrainingProgressSection({
        completedTrainingSections,
        section,
      })
    );

const renderClockLessonTrainingPills = ({
  copy,
  isCoarsePointer,
  translations,
}: {
  copy: ClockLessonCopy;
  isCoarsePointer: boolean;
  translations: ClockLessonTranslate;
}): React.JSX.Element => (
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

const buildClockLessonTrainingGame = ({
  config,
  copy,
  isCoarsePointer,
  markSectionComplete,
  translations,
}: {
  config: ClockTrainingHubConfig;
  copy: ClockLessonCopy;
  isCoarsePointer: boolean;
  markSectionComplete: (sectionId: string) => void;
  translations: ClockLessonTranslate;
}): ClockLessonTrainingGame => ({
  sectionId: config.hubId,
  shell: {
    accent: 'indigo',
    description: config.description,
    headerTestId: 'clock-lesson-training-header',
    icon: '🕐',
    maxWidthClassName: 'max-w-lg',
    navigationPills: renderClockLessonTrainingPills({
      copy,
      isCoarsePointer,
      translations,
    }),
    shellTestId: 'clock-lesson-training-shell',
    title: config.title,
  },
  onShellFinish: ({ onFinish }: { onFinish: () => void }) => {
    markSectionComplete(config.hubId);
    onFinish();
  },
  launchableInstance: {
    gameId: 'clock_training',
    instanceId: config.instanceId,
  },
  engineOverrides: buildClockLessonEngineOverrides(config.settings),
});

const createClockLessonMarkTrainingSectionComplete =
  (
    setCompletedTrainingSections: React.Dispatch<React.SetStateAction<Partial<Record<string, boolean>>>>
  ) =>
  (sectionId: string): void => {
    setCompletedTrainingSections((currentSections) =>
      currentSections[sectionId]
        ? currentSections
        : {
            ...currentSections,
            [sectionId]: true,
          }
    );
  };

export default function ClockLesson(): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurStaticLessons.clock');
  const isCoarsePointer = useKangurCoarsePointer();
  const [sectionProgressSnapshot, setSectionProgressSnapshot] = useState<
    Partial<Record<SectionId, { viewedCount: number; totalCount: number }>>
  >({});
  const [completedTrainingSections, setCompletedTrainingSections] = useState<
    Partial<Record<string, boolean>>
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
    () => buildDefaultClockTrainingConfigs(copy),
    [copy]
  );
  const customTrainingConfigs = useMemo<ClockTrainingHubConfig[]>(
    () => persistedClockGameSections.map(buildCustomClockTrainingConfig),
    [persistedClockGameSections]
  );
  const trainingConfigs = useMemo(
    () => [...defaultTrainingConfigs, ...customTrainingConfigs],
    [customTrainingConfigs, defaultTrainingConfigs]
  );
  const localizedHubSections = useMemo(
    () => buildClockLocalizedHubSections(copy, trainingConfigs),
    [copy, trainingConfigs]
  );
  const returnToHub = useKangurUnifiedLessonBack();
  const lessonChrome = useTranslations('KangurLessonChrome');
  const backToTopicsLabel = resolveClockLessonBackToTopicsLabel(lessonChrome('backToTopics'));
  const runtimeSlides = useMemo<Record<SectionId, LessonSlide[]>>(
    () =>
      buildClockRuntimeSlides({
        backToTopicsLabel,
        combinedSlides,
        copy,
        hoursSlides,
        minutesSlides,
        returnToHub,
      }),
    [backToTopicsLabel, combinedSlides, copy, hoursSlides, minutesSlides, returnToHub]
  );

  const lessonCompletionAwardedRef = useRef(false);
  const { isClockLessonComplete, isCombinedUnlocked } = resolveClockLessonCompletionState(
    sectionProgressSnapshot
  );

  useEffect(() => {
    if (!isClockLessonComplete || lessonCompletionAwardedRef.current) {
      return;
    }
    const progress = loadProgress({ ownerKey });
    const reward = createLessonCompletionReward(progress, 'clock', 100);
    addXp(reward.xp, reward.progressUpdates, { ownerKey });
    lessonCompletionAwardedRef.current = true;
  }, [isClockLessonComplete, ownerKey]);
  const markTrainingSectionComplete = useMemo(
    () => createClockLessonMarkTrainingSectionComplete(setCompletedTrainingSections),
    []
  );

  const buildHubSections = useCallback(
    (
      sections: ReadonlyArray<ClockHubSection>,
      sectionProgress: Partial<Record<ClockHubId, unknown>>
    ) =>
      buildClockLessonHubSectionsWithTrainingProgress({
        completedTrainingSections,
        copy,
        isCombinedUnlocked,
        sectionProgress,
        sections,
      }),
    [completedTrainingSections, copy, isCombinedUnlocked]
  );

  const games = trainingConfigs.map((config) =>
    buildClockLessonTrainingGame({
      config,
      copy,
      isCoarsePointer,
      markSectionComplete: markTrainingSectionComplete,
      translations,
    })
  );
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
