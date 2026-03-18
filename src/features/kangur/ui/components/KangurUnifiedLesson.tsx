'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub, { type HubSection } from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  buildLessonHubSectionsWithProgress,
  buildLessonSectionLabels,
  createLessonHubSelectHandler,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-utils';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  useKangurLessonSubsectionProgress,
  useLessonTimeTracking,
} from '@/features/kangur/ui/learner-activity/hooks';

const DEFAULT_DESCRIPTION = '';

type LessonActivityAccent = ComponentProps<typeof LessonActivityStage>['accent'];

type KangurUnifiedLessonContextValue = {
  returnToHub: () => void;
};

const KangurUnifiedLessonContext = createContext<KangurUnifiedLessonContextValue | null>(null);

export const useKangurUnifiedLessonBack = (): (() => void) => {
  const context = useContext(KangurUnifiedLessonContext);
  return context?.returnToHub ?? (() => undefined);
};

type LessonProgressAdapter<SectionId extends string> = {
  sectionProgress: Partial<Record<SectionId, unknown>>;
  markSectionOpened: (sectionId: SectionId) => void;
  markSectionViewedCount: (sectionId: SectionId, viewedCount: number) => void;
  recordPanelTime: (
    sectionId: SectionId,
    panelIndex: number,
    seconds: number,
    panelTitle?: string | null
  ) => void;
};

export type KangurUnifiedLessonSection<SectionId extends string> = {
  id: SectionId;
  emoji: string;
  title: string;
  description?: string;
  isGame?: boolean;
  slideCount?: number;
};

export type KangurUnifiedLessonGameConfig<SectionId extends string> = {
  sectionId: SectionId;
  stage: {
    accent: LessonActivityAccent;
    title: string;
    icon?: string;
    description?: ReactNode;
    backButtonLabel?: string;
    headerTestId?: string;
    shellTestId?: string;
    maxWidthClassName?: string;
    shellClassName?: string;
    navigationPills?: ReactNode;
    footerNavigation?: ReactNode;
  };
  onStageBack?: (helpers: {
    sectionId: SectionId;
    onFinish: () => void;
    onBack: () => void;
  }) => void;
  render: (helpers: {
    sectionId: SectionId;
    onFinish: () => void;
    onBack: () => void;
  }) => ReactNode;
};

type KangurUnifiedLessonBaseProps<SectionId extends string> = {
  lessonId: string;
  lessonEmoji: string;
  lessonTitle: string;
  sections: ReadonlyArray<KangurUnifiedLessonSection<SectionId>>;
  slides: Partial<Record<SectionId, LessonSlide[]>>;
  gradientClass: string;
  progressDotClassName: string;
  dotActiveClass: string;
  dotDoneClass: string;
  completionSectionId?: SectionId;
  autoRecordComplete?: boolean;
  skipMarkFor?: readonly SectionId[];
  games?: Array<KangurUnifiedLessonGameConfig<SectionId>>;
  buildHubSections?: (
    sections: ReadonlyArray<KangurUnifiedLessonSection<SectionId> & { description: string }>,
    sectionProgress: Partial<Record<SectionId, unknown>>
  ) => HubSection[];
  onSectionProgress?: (sectionProgress: Partial<Record<SectionId, unknown>>) => void;
  onComplete?: () => void;
  recordComplete: () => Promise<void>;
  progressAdapter: LessonProgressAdapter<SectionId>;
};

type KangurUnifiedLessonSubsectionProps<SectionId extends string> = Omit<
  KangurUnifiedLessonBaseProps<SectionId>,
  'recordComplete' | 'progressAdapter'
> & {
  progressMode?: 'subsection';
  scorePercent?: number;
};

type KangurUnifiedLessonPanelProps<SectionId extends string> = Omit<
  KangurUnifiedLessonBaseProps<SectionId>,
  'recordComplete' | 'progressAdapter'
> & {
  progressMode: 'panel';
  lessonKey?: string;
  scorePercent?: number;
  sectionLabels?: Partial<Record<SectionId, string>>;
};

const normalizeSections = <SectionId extends string>(
  sections: ReadonlyArray<KangurUnifiedLessonSection<SectionId>>
): Array<KangurUnifiedLessonSection<SectionId> & { description: string }> =>
  sections.map((section) => ({
    ...section,
    description: section.description ?? DEFAULT_DESCRIPTION,
  }));

function KangurUnifiedLessonBase<SectionId extends string>({
  lessonId: _lessonId,
  lessonEmoji,
  lessonTitle,
  sections,
  slides,
  gradientClass,
  progressDotClassName,
  dotActiveClass,
  dotDoneClass,
  completionSectionId,
  autoRecordComplete = false,
  skipMarkFor,
  games,
  buildHubSections,
  onSectionProgress,
  onComplete,
  recordComplete,
  progressAdapter,
}: KangurUnifiedLessonBaseProps<SectionId>): JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const handleReturnToHub = useCallback(() => setActiveSection(null), []);
  const contextValue = useMemo(
    () => ({
      returnToHub: handleReturnToHub,
    }),
    [handleReturnToHub]
  );
  const resolvedSections = useMemo(() => normalizeSections(sections), [sections]);
  const { sectionProgress, markSectionOpened, markSectionViewedCount, recordPanelTime } =
    progressAdapter;

  useEffect(() => {
    onSectionProgress?.(sectionProgress);
  }, [onSectionProgress, sectionProgress]);

  const sectionList = useMemo(
    () =>
      buildHubSections
        ? buildHubSections(resolvedSections, sectionProgress)
        : (buildLessonHubSectionsWithProgress(
            resolvedSections,
            sectionProgress
          ) as HubSection[]),
    [buildHubSections, resolvedSections, sectionProgress]
  );

  const gameMap = useMemo(() => {
    if (!games?.length) return new Map<SectionId, KangurUnifiedLessonGameConfig<SectionId>>();
    return new Map(games.map((game) => [game.sectionId, game]));
  }, [games]);

  let content: JSX.Element;

  if (activeSection) {
    const currentSection = activeSection;
    const sectionHeader = resolveLessonSectionHeader(resolvedSections, currentSection);
    const gameConfig = gameMap.get(currentSection);

    if (gameConfig) {
      const stage = gameConfig.stage;
      const gameHelpers = {
        sectionId: currentSection,
        onFinish: handleReturnToHub,
        onBack: handleReturnToHub,
      };
      const stageBackHandler = gameConfig.onStageBack
        ? () => gameConfig.onStageBack?.(gameHelpers)
        : handleReturnToHub;

      content = (
        <LessonActivityStage
          accent={stage.accent}
          backButtonLabel={stage.backButtonLabel}
          description={stage.description}
          footerNavigation={stage.footerNavigation}
          headerTestId={stage.headerTestId}
          icon={stage.icon ?? '🎮'}
          maxWidthClassName={stage.maxWidthClassName}
          navigationPills={stage.navigationPills}
          onBack={stageBackHandler}
          sectionHeader={sectionHeader}
          shellClassName={stage.shellClassName}
          shellTestId={stage.shellTestId}
          title={stage.title}
        >
          {gameConfig.render(gameHelpers)}
        </LessonActivityStage>
      );
    } else {
      const slidesForSection = slides[currentSection] ?? [];
      const shouldComplete = completionSectionId === currentSection;
      const handleComplete = shouldComplete
        ? () => {
            if (autoRecordComplete) {
              void recordComplete();
            }
            onComplete?.();
          }
        : undefined;

      content = (
        <LessonSlideSection
          slides={slidesForSection}
          sectionHeader={sectionHeader}
          onBack={handleReturnToHub}
          onComplete={handleComplete}
          onProgressChange={(viewedCount) => markSectionViewedCount(currentSection, viewedCount)}
          onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
            recordPanelTime(currentSection, panelIndex, seconds, panelTitle)
          }
          dotActiveClass={dotActiveClass}
          dotDoneClass={dotDoneClass}
          gradientClass={gradientClass}
        />
      );
    }
  } else {
    const handleSelect = createLessonHubSelectHandler<SectionId>({
      markSectionOpened,
      onSelectSection: (sectionId) => setActiveSection(sectionId),
      skipMarkFor,
    });

    content = (
      <LessonHub
        lessonEmoji={lessonEmoji}
        lessonTitle={lessonTitle}
        gradientClass={gradientClass}
        progressDotClassName={progressDotClassName}
        sections={sectionList}
        onSelect={(sectionId) => handleSelect(sectionId as SectionId)}
      />
    );
  }

  return (
    <KangurUnifiedLessonContext.Provider value={contextValue}>
      {content}
    </KangurUnifiedLessonContext.Provider>
  );
}

function KangurUnifiedLessonSubsection<SectionId extends string>({
  lessonId,
  sections,
  scorePercent,
  ...rest
}: KangurUnifiedLessonSubsectionProps<SectionId>): JSX.Element {
  const { sectionProgress, markSectionOpened, markSectionViewedCount } =
    useKangurLessonSubsectionProgress<SectionId>({
      lessonId,
      sections,
    });

  const { recordPanelTime, recordComplete } = useLessonTimeTracking({
    lessonId,
    scorePercent,
  });

  return (
    <KangurUnifiedLessonBase
      {...rest}
      lessonId={lessonId}
      sections={sections}
      recordComplete={recordComplete}
      progressAdapter={{
        sectionProgress,
        markSectionOpened,
        markSectionViewedCount,
        recordPanelTime,
      }}
    />
  );
}

function KangurUnifiedLessonPanel<SectionId extends string>({
  lessonId,
  lessonKey,
  sectionLabels,
  sections,
  slides,
  scorePercent,
  ...rest
}: KangurUnifiedLessonPanelProps<SectionId>): JSX.Element {
  const resolvedLessonKey = lessonKey ?? lessonId;
  const resolvedSectionLabels = sectionLabels ?? buildLessonSectionLabels(sections);

  const { sectionProgress, markSectionOpened, markSectionViewedCount, recordPanelTime } =
    useKangurLessonPanelProgress<SectionId>({
      lessonKey: resolvedLessonKey,
      slideSections: slides,
      sectionLabels: resolvedSectionLabels,
    });

  const { recordComplete } = useLessonTimeTracking({
    lessonId: resolvedLessonKey,
    scorePercent,
  });

  return (
    <KangurUnifiedLessonBase
      {...rest}
      lessonId={lessonId}
      sections={sections}
      slides={slides}
      recordComplete={recordComplete}
      progressAdapter={{
        sectionProgress,
        markSectionOpened,
        markSectionViewedCount,
        recordPanelTime,
      }}
    />
  );
}

export default function KangurUnifiedLesson<SectionId extends string>(
  props: KangurUnifiedLessonSubsectionProps<SectionId> | KangurUnifiedLessonPanelProps<SectionId>
): JSX.Element {
  if (props.progressMode === 'panel') {
    return <KangurUnifiedLessonPanel {...props} />;
  }
  return <KangurUnifiedLessonSubsection {...props} />;
}
