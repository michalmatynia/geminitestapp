'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import type { KangurLessonStageGameRuntimeSpec } from '@/shared/contracts/kangur-games';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import KangurLessonStageGameRuntime from '@/features/kangur/ui/components/KangurLessonStageGameRuntime';
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
import {
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  useKangurLessonSubsectionProgress,
  useLessonTimeTracking,
} from '@/features/kangur/ui/learner-activity/hooks';
import { getMotionSafeScrollBehavior } from '@/shared/utils/motion-accessibility';

const DEFAULT_DESCRIPTION = '';

type LessonActivityAccent = ComponentProps<typeof LessonActivityStage>['accent'];
type LessonActivityShellVariant = ComponentProps<typeof LessonActivityStage>['shellVariant'];

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

type KangurUnifiedLessonGameStageConfig = {
  accent: LessonActivityAccent;
  title: string;
  icon?: string;
  bodyPrelude?: ReactNode;
  description?: ReactNode;
  backButtonLabel?: string;
  headerTestId?: string;
  shellTestId?: string;
  maxWidthClassName?: string;
  shellClassName?: string;
  shellVariant?: LessonActivityShellVariant;
  navigationPills?: ReactNode;
  footerNavigation?: ReactNode;
};

export type KangurUnifiedLessonGameConfig<SectionId extends string> = {
  sectionId: SectionId;
  onStageBack?: (helpers: {
    sectionId: SectionId;
    onFinish: () => void;
    onBack: () => void;
  }) => void;
} & (
  | {
      stage: KangurUnifiedLessonGameStageConfig;
      render: (helpers: {
        sectionId: SectionId;
        onFinish: () => void;
        onBack: () => void;
      }) => ReactNode;
      runtime?: never;
    }
  | {
      stage: KangurUnifiedLessonGameStageConfig;
      runtime: KangurLessonStageGameRuntimeSpec;
      render?: never;
    }
);

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

const hasLessonStageRuntime = <SectionId extends string>(
  config: KangurUnifiedLessonGameConfig<SectionId>
): config is Extract<KangurUnifiedLessonGameConfig<SectionId>, { runtime: KangurLessonStageGameRuntimeSpec }> =>
  'runtime' in config && typeof config.runtime !== 'undefined';

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
  const isMobileViewport = useKangurMobileBreakpoint();
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const hasMountedScrollEffectRef = useRef(false);
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

  useEffect(() => {
    if (!isMobileViewport || typeof window === 'undefined') {
      return;
    }

    if (!hasMountedScrollEffectRef.current) {
      hasMountedScrollEffectRef.current = true;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const contentElement = contentScrollRef.current;
      if (!contentElement) {
        return;
      }

      const styles = window.getComputedStyle(document.documentElement);
      let topBarHeight = Number.parseFloat(styles.getPropertyValue(KANGUR_TOP_BAR_HEIGHT_VAR_NAME));
      if (!topBarHeight) {
        const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
        if (topBar instanceof HTMLElement) {
          topBarHeight = topBar.getBoundingClientRect().height;
        }
      }

      const rect = contentElement.getBoundingClientRect();
      const nextTop = Math.max(
        0,
        window.scrollY + rect.top - (topBarHeight || KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX) - 12
      );

      window.scrollTo({
        top: nextTop,
        left: 0,
        behavior: getMotionSafeScrollBehavior('smooth'),
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeSection, isMobileViewport]);

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
          shellVariant={stage.shellVariant}
          title={stage.title}
        >
          {stage.bodyPrelude ? stage.bodyPrelude : null}
          {hasLessonStageRuntime(gameConfig) ? (
            <KangurLessonStageGameRuntime
              runtime={gameConfig.runtime}
              onFinish={gameHelpers.onFinish}
            />
          ) : (
            gameConfig.render(gameHelpers)
          )}
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
      <div ref={contentScrollRef} className='w-full min-w-0 max-w-full overflow-x-clip'>
        {content}
      </div>
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
