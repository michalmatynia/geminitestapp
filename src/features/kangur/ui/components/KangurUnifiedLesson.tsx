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

import type { KangurGameId } from '@/shared/contracts/kangur-games';
import type { KangurGameInstanceId } from '@/shared/contracts/kangur-game-instances';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import LessonActivityShell from '@/features/kangur/ui/components/lesson-runtime/LessonActivityShell';
import KangurLessonActivityInstanceRuntime from '@/features/kangur/ui/components/KangurLessonActivityInstanceRuntime';
import KangurLaunchableGameInstanceRuntime from '@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime';
import LessonHub, { type HubSection } from '@/features/kangur/ui/components/lesson-framework/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  buildLessonHubSectionsWithProgress,
  buildLessonSectionLabels,
  createLessonHubSelectHandler,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-framework/lesson-utils';
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

type LessonActivityAccent = ComponentProps<typeof LessonActivityShell>['accent'];
type LessonActivityShellVariant = ComponentProps<typeof LessonActivityShell>['shellVariant'];

type KangurUnifiedLessonContextValue = {
  returnToHub: () => void;
};

const KangurUnifiedLessonContext = createContext<KangurUnifiedLessonContextValue | null>(null);
const FALLBACK_RETURN_TO_HUB = (): void => undefined;

export const useKangurUnifiedLessonBack = (): (() => void) => {
  const context = useContext(KangurUnifiedLessonContext);
  return context?.returnToHub ?? FALLBACK_RETURN_TO_HUB;
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

type KangurUnifiedLessonGameShellConfig = {
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

type KangurUnifiedLessonGameConfigBase<SectionId extends string> = {
  sectionId: SectionId;
  onShellEnter?: (helpers: {
    sectionId: SectionId;
    onFinish: () => void;
    onBack: () => void;
  }) => void;
  onShellFinish?: (helpers: {
    sectionId: SectionId;
    onFinish: () => void;
    onBack: () => void;
  }) => void;
  onShellBack?: (helpers: {
    sectionId: SectionId;
    onFinish: () => void;
    onBack: () => void;
  }) => void;
  shell: KangurUnifiedLessonGameShellConfig;
};

export type KangurUnifiedLessonGameConfig<SectionId extends string> =
  | (KangurUnifiedLessonGameConfigBase<SectionId> & {
      engineOverrides?: KangurGameRuntimeRendererProps;
      launchableInstance: {
        gameId: KangurGameId;
        instanceId: KangurGameInstanceId;
      };
      lessonActivityInstance?: never;
    })
  | (KangurUnifiedLessonGameConfigBase<SectionId> & {
      engineOverrides?: KangurGameRuntimeRendererProps;
      launchableInstance?: never;
      lessonActivityInstance: {
        gameId: KangurGameId;
        instanceId: KangurGameInstanceId;
      };
    });

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

type KangurUnifiedLessonProps<SectionId extends string> =
  | KangurUnifiedLessonSubsectionProps<SectionId>
  | KangurUnifiedLessonPanelProps<SectionId>;

const normalizeSections = <SectionId extends string>(
  sections: ReadonlyArray<KangurUnifiedLessonSection<SectionId>>
): Array<KangurUnifiedLessonSection<SectionId> & { description: string }> =>
  sections.map((section) => ({
    ...section,
    description: section.description ?? DEFAULT_DESCRIPTION,
  }));

const renderKangurUnifiedLessonGameShell = <SectionId extends string>({
  currentSection,
  gameConfig,
  handleReturnToHub,
  resolvedSections,
}: {
  currentSection: SectionId;
  gameConfig: KangurUnifiedLessonGameConfig<SectionId>;
  handleReturnToHub: () => void;
  resolvedSections: ReadonlyArray<KangurUnifiedLessonSection<SectionId> & { description: string }>;
}): JSX.Element => {
  const sectionHeader = resolveLessonSectionHeader(resolvedSections, currentSection);
  const shell = gameConfig.shell;
  const rawGameHelpers = {
    sectionId: currentSection,
    onFinish: handleReturnToHub,
    onBack: handleReturnToHub,
  };
  const runtimeFinishHandler = gameConfig.onShellFinish
    ? () => gameConfig.onShellFinish?.(rawGameHelpers)
    : handleReturnToHub;
  const gameHelpers = {
    ...rawGameHelpers,
    onFinish: runtimeFinishHandler,
  };
  const shellBackHandler = gameConfig.onShellBack
    ? () => gameConfig.onShellBack?.(rawGameHelpers)
    : handleReturnToHub;

  return (
    <LessonActivityShell
      accent={shell.accent}
      backButtonLabel={shell.backButtonLabel}
      description={shell.description}
      footerNavigation={shell.footerNavigation}
      headerTestId={shell.headerTestId}
      icon={shell.icon ?? '🎮'}
      maxWidthClassName={shell.maxWidthClassName}
      navigationPills={shell.navigationPills}
      onBack={shellBackHandler}
      sectionHeader={sectionHeader}
      shellClassName={shell.shellClassName}
      shellTestId={shell.shellTestId}
      shellVariant={shell.shellVariant}
      title={shell.title}
    >
      {shell.bodyPrelude ? shell.bodyPrelude : null}
      {gameConfig.launchableInstance ? (
        <KangurLaunchableGameInstanceRuntime
          engineOverrides={gameConfig.engineOverrides}
          gameId={gameConfig.launchableInstance.gameId}
          instanceId={gameConfig.launchableInstance.instanceId}
          onFinish={gameHelpers.onFinish}
          preferLessonActivityRuntime
        />
      ) : (
        <KangurLessonActivityInstanceRuntime
          engineOverrides={gameConfig.engineOverrides}
          gameId={gameConfig.lessonActivityInstance.gameId}
          instanceId={gameConfig.lessonActivityInstance.instanceId}
          onFinish={gameHelpers.onFinish}
        />
      )}
    </LessonActivityShell>
  );
};

const renderKangurUnifiedLessonSlideSection = <SectionId extends string>({
  activeSection,
  autoRecordComplete,
  completionSectionId,
  dotActiveClass,
  dotDoneClass,
  gradientClass,
  handleReturnToHub,
  markSectionViewedCount,
  onComplete,
  recordComplete,
  recordPanelTime,
  resolvedSections,
  slides,
}: {
  activeSection: SectionId;
  autoRecordComplete: boolean;
  completionSectionId?: SectionId;
  dotActiveClass: string;
  dotDoneClass: string;
  gradientClass: string;
  handleReturnToHub: () => void;
  markSectionViewedCount: (sectionId: SectionId, viewedCount: number) => void;
  onComplete?: () => void;
  recordComplete: () => Promise<void>;
  recordPanelTime: (
    sectionId: SectionId,
    panelIndex: number,
    seconds: number,
    panelTitle?: string | null
  ) => void;
  resolvedSections: ReadonlyArray<KangurUnifiedLessonSection<SectionId> & { description: string }>;
  slides: Partial<Record<SectionId, LessonSlide[]>>;
}): JSX.Element => {
  const sectionHeader = resolveLessonSectionHeader(resolvedSections, activeSection);
  const slidesForSection = slides[activeSection] ?? [];
  const shouldComplete = completionSectionId === activeSection;
  const handleComplete = shouldComplete
    ? () => {
        if (autoRecordComplete) {
          void recordComplete();
        }
        onComplete?.();
      }
    : undefined;

  return (
    <LessonSlideSection
      slides={slidesForSection}
      sectionHeader={sectionHeader}
      onBack={handleReturnToHub}
      onComplete={handleComplete}
      onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
      onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
        recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
      }
      dotActiveClass={dotActiveClass}
      dotDoneClass={dotDoneClass}
      gradientClass={gradientClass}
    />
  );
};

const renderKangurUnifiedLessonHub = <SectionId extends string>({
  gradientClass,
  handleSelect,
  lessonEmoji,
  lessonTitle,
  progressDotClassName,
  sectionList,
}: {
  gradientClass: string;
  handleSelect: (sectionId: SectionId) => void;
  lessonEmoji: string;
  lessonTitle: string;
  progressDotClassName: string;
  sectionList: HubSection[];
}): JSX.Element => (
  <LessonHub
    lessonEmoji={lessonEmoji}
    lessonTitle={lessonTitle}
    gradientClass={gradientClass}
    progressDotClassName={progressDotClassName}
    sections={sectionList}
    onSelect={(sectionId) => handleSelect(sectionId as SectionId)}
  />
);

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
  const lastEnteredGameSectionRef = useRef<SectionId | null>(null);
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

  const activeGameConfig = activeSection ? gameMap.get(activeSection) ?? null : null;

  useEffect(() => {
    if (!activeSection || !activeGameConfig) {
      lastEnteredGameSectionRef.current = null;
      return;
    }

    if (lastEnteredGameSectionRef.current === activeSection) {
      return;
    }

    lastEnteredGameSectionRef.current = activeSection;
    activeGameConfig.onShellEnter?.({
      sectionId: activeSection,
      onFinish: handleReturnToHub,
      onBack: handleReturnToHub,
    });
  }, [activeGameConfig, activeSection, handleReturnToHub]);

  let content: JSX.Element;

  if (activeSection) {
    const currentSection = activeSection;
    const gameConfig = gameMap.get(currentSection);

    if (gameConfig) {
      content = renderKangurUnifiedLessonGameShell({
        currentSection,
        gameConfig,
        handleReturnToHub,
        resolvedSections,
      });
    } else {
      content = renderKangurUnifiedLessonSlideSection({
        activeSection: currentSection,
        autoRecordComplete,
        completionSectionId,
        dotActiveClass,
        dotDoneClass,
        gradientClass,
        handleReturnToHub,
        markSectionViewedCount,
        onComplete,
        recordComplete,
        recordPanelTime,
        resolvedSections,
        slides,
      });
    }
  } else {
    const handleSelect = createLessonHubSelectHandler<SectionId>({
      markSectionOpened,
      onSelectSection: (sectionId) => setActiveSection(sectionId),
      skipMarkFor,
    });

    content = renderKangurUnifiedLessonHub({
      gradientClass,
      handleSelect,
      lessonEmoji,
      lessonTitle,
      progressDotClassName,
      sectionList,
    });
  }

  return (
    <KangurUnifiedLessonContext.Provider value={contextValue}>
      <div ref={contentScrollRef} className='w-full min-w-0 max-w-full overflow-x-clip'>
        {content}
      </div>
    </KangurUnifiedLessonContext.Provider>
  );
}

const useKangurUnifiedLessonBaseProps = <SectionId extends string>(
  props: KangurUnifiedLessonProps<SectionId>
): KangurUnifiedLessonBaseProps<SectionId> => {
  const isPanelMode = props.progressMode === 'panel';
  const panelProps = isPanelMode ? props : null;
  const { lessonId, sections, slides, scorePercent } = props;
  const resolvedLessonKey = panelProps?.lessonKey ?? lessonId;
  const resolvedSectionLabels = useMemo(
    () =>
      panelProps
        ? panelProps.sectionLabels ?? buildLessonSectionLabels(sections)
        : undefined,
    [panelProps, sections]
  );
  const {
    sectionProgress: subsectionProgress,
    markSectionOpened: markSubsectionOpened,
    markSectionViewedCount: markSubsectionViewedCount,
  } =
    useKangurLessonSubsectionProgress<SectionId>({
      lessonId,
      sections,
    });
  const {
    sectionProgress: panelProgress,
    markSectionOpened: markPanelOpened,
    markSectionViewedCount: markPanelViewedCount,
    recordPanelTime: recordTrackedPanelTime,
  } =
    useKangurLessonPanelProgress<SectionId>({
      lessonKey: resolvedLessonKey,
      slideSections: slides,
      sectionLabels: resolvedSectionLabels,
    });

  const { recordComplete, recordPanelTime } = useLessonTimeTracking({
    lessonId: resolvedLessonKey,
    scorePercent,
  });

  if (isPanelMode) {
    const {
      lessonKey: _lessonKey,
      progressMode: _progressMode,
      scorePercent: _scorePercent,
      sectionLabels: _sectionLabels,
      ...baseProps
    } = props;

    return {
      ...baseProps,
      recordComplete,
      progressAdapter: {
        sectionProgress: panelProgress,
        markSectionOpened: markPanelOpened,
        markSectionViewedCount: markPanelViewedCount,
        recordPanelTime: recordTrackedPanelTime,
      },
    };
  }

  const {
    progressMode: _progressMode,
    scorePercent: _scorePercent,
    ...baseProps
  } = props;

  return {
    ...baseProps,
    recordComplete,
    progressAdapter: {
      sectionProgress: subsectionProgress,
      markSectionOpened: markSubsectionOpened,
      markSectionViewedCount: markSubsectionViewedCount,
      recordPanelTime,
    },
  };
};

export default function KangurUnifiedLesson<SectionId extends string>(
  props: KangurUnifiedLessonProps<SectionId>
): JSX.Element {
  const resolvedBaseProps = useKangurUnifiedLessonBaseProps(props);

  return <KangurUnifiedLessonBase {...resolvedBaseProps} />;
}
