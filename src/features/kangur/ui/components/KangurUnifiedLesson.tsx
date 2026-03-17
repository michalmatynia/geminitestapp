'use client';

import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  buildLessonHubSectionsWithProgress,
  createLessonHubSelectHandler,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-utils';
import {
  useKangurLessonSubsectionProgress,
  useLessonTimeTracking,
} from '@/features/kangur/ui/learner-activity/hooks';

type LessonActivityAccent = ComponentProps<typeof LessonActivityStage>['accent'];

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
  render: (helpers: {
    sectionId: SectionId;
    onFinish: () => void;
    onBack: () => void;
  }) => ReactNode;
};

type KangurUnifiedLessonProps<SectionId extends string> = {
  lessonId: string;
  lessonEmoji: string;
  lessonTitle: string;
  sections: KangurUnifiedLessonSection<SectionId>[];
  slides: Record<SectionId, LessonSlide[]>;
  gradientClass: string;
  progressDotClassName: string;
  dotActiveClass: string;
  dotDoneClass: string;
  completionSectionId?: SectionId;
  autoRecordComplete?: boolean;
  scorePercent?: number;
  skipMarkFor?: readonly SectionId[];
  games?: Array<KangurUnifiedLessonGameConfig<SectionId>>;
  onComplete?: () => void;
};

export default function KangurUnifiedLesson<SectionId extends string>({
  lessonId,
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
  scorePercent,
  skipMarkFor,
  games,
  onComplete,
}: KangurUnifiedLessonProps<SectionId>): JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const { sectionProgress, markSectionOpened, markSectionViewedCount } =
    useKangurLessonSubsectionProgress<SectionId>({
      lessonId,
      sections,
    });

  const { recordPanelTime, recordComplete } = useLessonTimeTracking({
    lessonId,
    scorePercent,
  });

  const sectionList = useMemo(
    () => buildLessonHubSectionsWithProgress(sections, sectionProgress),
    [sections, sectionProgress]
  );

  const gameMap = useMemo(() => {
    if (!games?.length) return new Map<SectionId, KangurUnifiedLessonGameConfig<SectionId>>();
    return new Map(games.map((game) => [game.sectionId, game]));
  }, [games]);

  if (activeSection) {
    const currentSection = activeSection;
    const sectionHeader = resolveLessonSectionHeader(sections, currentSection);
    const gameConfig = gameMap.get(currentSection);

    if (gameConfig) {
      const stage = gameConfig.stage;
      const handleBack = () => setActiveSection(null);
      const handleFinish = () => setActiveSection(null);

      return (
        <LessonActivityStage
          accent={stage.accent}
          backButtonLabel={stage.backButtonLabel}
          description={stage.description}
          footerNavigation={stage.footerNavigation}
          headerTestId={stage.headerTestId}
          icon={stage.icon ?? '🎮'}
          maxWidthClassName={stage.maxWidthClassName}
          navigationPills={stage.navigationPills}
          onBack={handleBack}
          sectionHeader={sectionHeader}
          shellClassName={stage.shellClassName}
          shellTestId={stage.shellTestId}
          title={stage.title}
        >
          {gameConfig.render({
            sectionId: currentSection,
            onFinish: handleFinish,
            onBack: handleBack,
          })}
        </LessonActivityStage>
      );
    }

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

    return (
      <LessonSlideSection
        slides={slidesForSection}
        sectionHeader={sectionHeader}
        onBack={() => setActiveSection(null)}
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

  const handleSelect = createLessonHubSelectHandler<SectionId>({
    markSectionOpened,
    onSelectSection: (sectionId) => setActiveSection(sectionId),
    skipMarkFor,
  });

  return (
    <LessonHub
      lessonEmoji={lessonEmoji}
      lessonTitle={lessonTitle}
      gradientClass={gradientClass}
      progressDotClassName={progressDotClassName}
      sections={sectionList}
      onSelect={handleSelect}
    />
  );
}
